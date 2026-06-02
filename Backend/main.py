import os
import logging
import uuid
import uvicorn

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from anthropic import Anthropic
from fastapi.exceptions import HTTPException
from models import (
    ChatRequest,
    ChatResponse,
    DeleteSessionResponse,
    EvidenceItem,
    SessionDetailResponse,
    SessionListResponse,
    MessageItem,
    SessionSummary,
)
from dotenv import load_dotenv
from session import (
    get_history,
    append_message,
    clear_history,
    get_session_messages,
    get_session_evidence,
    format_evidence_summary,
    list_sessions,
    session_belongs_to_user,
    session_id_available_for_user,
    MODEL,
    MAX_TOKENS,
    MAX_TOOL_CALLS,
)
from auth import get_current_user
from prompt import SYSTEM_PROMPT
from brief_quality import is_brief_complete
from tools import TOOL_DEFINITIONS, run_tool, set_tool_context, clear_tool_context

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=ANTHROPIC_API_KEY)

FORCE_SYNTHESIS_PROMPT = (
    "You have reached the maximum number of tool calls. "
    "Please synthesize the evidence you have gathered so far and write the final research brief now."
)

BRIEF_RETRY_PROMPT = (
    "Your previous response was incomplete. Write the FULL research brief now with all "
    "required sections: ## Summary, ## Key Findings, ## Contradictions & Debates, "
    "## Confidence Assessment, ## Sources. Do not describe what you will do — write the brief."
)

SYNTHESIS_MAX_TOKENS = 8192


def extract_text(response) -> str:
    return "\n".join(
        block.text for block in response.content if hasattr(block, "text")
    )


def run_agent(session_id: str, user_message: str, user_id: str) -> tuple[str, int, int, bool, int]:
    history = get_history(session_id, user_id=user_id)
    tool_call_count = 0
    total_tokens = 0
    force_synthesis = False
    synthesis_instruction_added = False
    brief_retry_attempted = False

    history.append({"role": "user", "content": user_message})
    set_tool_context(session_id, user_id)

    try:
        while True:
            if force_synthesis and not synthesis_instruction_added:
                evidence_summary = format_evidence_summary(
                    get_session_evidence(session_id, user_id)
                )
                synthesis_instruction = (
                    "Tools are disabled. Do not attempt save_evidence or any tool. "
                    "Write the complete research brief now using evidence already in this "
                    "conversation and the saved evidence below. Use the required section headers.\n\n"
                    f"Saved evidence:\n{evidence_summary}"
                )
                history.append({"role": "user", "content": synthesis_instruction})
                synthesis_instruction_added = True

            remaining_calls = MAX_TOOL_CALLS - tool_call_count
            logger.info(
                f"[{session_id}] Calling Claude (history length={len(history)}, "
                f"tools used={tool_call_count}/{MAX_TOOL_CALLS}, force_synthesis={force_synthesis})"
            )

            system = SYSTEM_PROMPT
            if not force_synthesis and remaining_calls <= 4:
                system += (
                    f"\n\n## Budget reminder\n"
                    f"You have {remaining_calls} tool call(s) left. "
                    "Do not start new searches or fetches. Save any critical evidence you "
                    "still need, then write the complete brief in your next response."
                )

            request_kwargs = {
                "model": MODEL,
                "max_tokens": SYNTHESIS_MAX_TOKENS if force_synthesis else MAX_TOKENS,
                "system": system,
                "messages": history,
            }
            if not force_synthesis:
                request_kwargs["tools"] = TOOL_DEFINITIONS

            response = client.messages.create(**request_kwargs)
            total_tokens += response.usage.input_tokens + response.usage.output_tokens

            if response.stop_reason == "max_tokens":
                partial = extract_text(response)
                logger.warning(
                    f"[{session_id}] Hit max_tokens (partial length={len(partial)})"
                )
                if partial:
                    history.append({"role": "assistant", "content": response.content})
                    history.append({
                        "role": "user",
                        "content": (
                            "Your response was cut off. Continue and complete the full "
                            "research brief with all required sections."
                        ),
                    })
                    continue

                return (
                    "The research brief was truncated due to length limits. Please try a narrower question.",
                    tool_call_count,
                    total_tokens,
                    tool_call_count >= MAX_TOOL_CALLS,
                    len(get_session_evidence(session_id, user_id)),
                )

            if response.stop_reason == "end_turn":
                final_text = extract_text(response)

                if not is_brief_complete(final_text) and not brief_retry_attempted:
                    brief_retry_attempted = True
                    logger.warning(
                        f"[{session_id}] Incomplete brief (length={len(final_text)}), retrying"
                    )
                    history.append({"role": "assistant", "content": response.content})
                    history.append({"role": "user", "content": BRIEF_RETRY_PROMPT})
                    continue

                append_message(session_id, user_message, role="user", user_id=user_id)
                append_message(session_id, final_text, role="assistant", user_id=user_id)
                evidence_count = len(get_session_evidence(session_id, user_id))
                truncated = tool_call_count >= MAX_TOOL_CALLS
                logger.info(
                    f"[{session_id}] Agent finished after {tool_call_count} tool calls, "
                    f"evidence={evidence_count}, truncated={truncated}"
                )
                return (
                    final_text,
                    tool_call_count,
                    total_tokens,
                    truncated,
                    evidence_count,
                )

            if response.stop_reason == "tool_use":
                history.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    if tool_call_count >= MAX_TOOL_CALLS:
                        logger.warning(
                            f"[{session_id}] Skipping {block.name}: MAX_TOOL_CALLS ({MAX_TOOL_CALLS}) reached"
                        )
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": (
                                "Tool call skipped: maximum tool call limit reached. "
                                "Synthesize the evidence gathered so far."
                            ),
                        })
                        continue

                    tool_call_count += 1
                    logger.info(
                        f"[{session_id}] Tool call #{tool_call_count}: "
                        f"{block.name}({list(block.input.keys())})"
                    )
                    result_text = run_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                    })

                history.append({"role": "user", "content": tool_results})

                if tool_call_count >= MAX_TOOL_CALLS and not force_synthesis:
                    logger.warning(
                        f"[{session_id}] Hit MAX_TOOL_CALLS ({MAX_TOOL_CALLS}), forcing synthesis"
                    )
                    history.append({"role": "user", "content": FORCE_SYNTHESIS_PROMPT})
                    force_synthesis = True

                continue

            logger.error(f"[{session_id}] Unexpected stop_reason: {response.stop_reason}")
            error_text = f"Agent stopped unexpectedly (reason: {response.stop_reason})"
            append_message(session_id, user_message, role="user", user_id=user_id)
            append_message(session_id, error_text, role="assistant", user_id=user_id)
            evidence_count = len(get_session_evidence(session_id, user_id))
            return (
                error_text,
                tool_call_count,
                total_tokens,
                tool_call_count >= MAX_TOOL_CALLS,
                evidence_count,
            )
    finally:
        clear_tool_context()


@app.get("/health")
async def health_check():
    logging.info("Health check request received")
    return JSONResponse(content={"message": "OK"}, status_code=200)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user: dict = Depends(get_current_user)):
    if not ANTHROPIC_API_KEY:
        logging.error("Anthropic API key is not set")
        raise HTTPException(status_code=500, detail="Anthropic API key is not set")

    user_id = user.get("sub")
    session_id = request.session_id or str(uuid.uuid4())
    if request.session_id and not session_id_available_for_user(session_id, user_id):
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        brief, tool_calls, tokens_used, truncated, evidence_count = run_agent(
            session_id, request.topic, user_id
        )
    except Exception as e:
        logging.error(f"Error creating chat response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(
        brief=brief,
        session_id=session_id,
        tool_calls=tool_calls,
        tokens_used=tokens_used,
        truncated=truncated,
        evidence_count=evidence_count,
    )


@app.get("/sessions", response_model=SessionListResponse)
async def get_sessions(user: dict = Depends(get_current_user)):
    user_id = user.get("sub")
    summaries = list_sessions(user_id)
    return SessionListResponse(
        sessions=[SessionSummary(**summary) for summary in summaries]
    )


@app.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("sub")
    if not session_belongs_to_user(session_id, user_id):
        raise HTTPException(status_code=404, detail="Session not found")

    messages = get_session_messages(session_id, user_id)
    evidence = get_session_evidence(session_id, user_id)
    return SessionDetailResponse(
        session_id=session_id,
        messages=[MessageItem(**message) for message in messages],
        evidence=[EvidenceItem(**item) for item in evidence],
    )


@app.get("/sessions/{session_id}/evidence", response_model=list[EvidenceItem])
async def get_session_evidence_endpoint(
    session_id: str, user: dict = Depends(get_current_user)
):
    user_id = user.get("sub")
    if not session_belongs_to_user(session_id, user_id):
        raise HTTPException(status_code=404, detail="Session not found")

    evidence = get_session_evidence(session_id, user_id)
    return [EvidenceItem(**item) for item in evidence]


@app.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("sub")
    deleted = clear_history(session_id, user_id=user_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Session not found")

    return DeleteSessionResponse(
        ok=True,
        session_id=session_id,
        deleted_messages=deleted,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
