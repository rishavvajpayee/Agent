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
    list_sessions,
    session_belongs_to_user,
    session_id_available_for_user,
    MODEL,
    MAX_TOKENS,
    MAX_TOOL_CALLS,
)
from auth import get_current_user
from prompt import SYSTEM_PROMPT
from tools import TOOL_DEFINITIONS, run_tool

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

def run_agent(session_id: str, user_message: str, user_id: str) -> tuple[str, int, int]:
    history = get_history(session_id, user_id=user_id)
    tool_call_count = 0
    total_tokens = 0

    append_message(session_id, user_message, role="user", user_id=user_id)
    history.append({"role": "user", "content": user_message})

    while True:
        logger.info(f"[{session_id}] Calling Claude (history length={len(history)}, tools used={tool_call_count})")

        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=history,
        )

        total_tokens += response.usage.input_tokens + response.usage.output_tokens

        if response.stop_reason == "end_turn":
            text_blocks = [block.text for block in response.content if hasattr(block, "text")]
            final_text = "\n".join(text_blocks)
            append_message(session_id, final_text, role="assistant", user_id=user_id)
            history.append({"role": "assistant", "content": response.content})
            logger.info(f"[{session_id}] Agent finished after {tool_call_count} tool calls")
            return final_text, tool_call_count, total_tokens

        if response.stop_reason == "tool_use":
            history.append({"role": "assistant", "content": response.content})

            if tool_call_count >= MAX_TOOL_CALLS:
                logger.warning(f"[{session_id}] Hit MAX_TOOL_CALLS ({MAX_TOOL_CALLS}), forcing synthesis")
                forced = "You have reached the maximum number of tool calls. Please synthesize the evidence you have gathered so far and write the final research brief now."
                append_message(session_id, forced, role="user", user_id=user_id)
                history.append({"role": "user", "content": forced})
                continue

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_call_count += 1
                logger.info(f"[{session_id}] Tool call #{tool_call_count}: {block.name}({list(block.input.keys())})")
                result_text = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_text,
                })

            history.append({"role": "user", "content": tool_results})

        else:
            logger.error(f"[{session_id}] Unexpected stop_reason: {response.stop_reason}")
            return f"Agent stopped unexpectedly (reason: {response.stop_reason})", tool_call_count, total_tokens


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
        brief, tool_calls, tokens_used = run_agent(session_id, request.topic, user_id)
    except Exception as e:
        logging.error(f"Error creating chat response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(
        brief=brief,
        session_id=session_id,
        tool_calls=tool_calls,
        tokens_used=tokens_used
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
    return SessionDetailResponse(
        session_id=session_id,
        messages=[MessageItem(**message) for message in messages],
    )


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