import os
import logging
import uuid
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from anthropic import Anthropic
from fastapi.exceptions import HTTPException
from models import ChatRequest, ChatResponse
from dotenv import load_dotenv
from session import get_history, append_message, MODEL, MAX_TOKENS

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=ANTHROPIC_API_KEY)

def run_agent(session_id, message):
    tool_call_count = 0

    append_message(session_id, message, role="user")
    history = get_history(session_id)
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=history
    )

    assistant_message = response.content[0].text
    append_message(session_id, assistant_message, role="assistant")
    tokens_used = response.usage.input_tokens + response.usage.output_tokens
    return assistant_message, tool_call_count, tokens_used

@app.get("/health")
async def health_check():
    logging.info("Health check request received")
    return JSONResponse(content={"message": "OK"}, status_code=200)

@app.post("/chat" , response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not ANTHROPIC_API_KEY:
        logging.error("Anthropic API key is not set")
        raise HTTPException(status_code=500, detail="Anthropic API key is not set")

    session_id = request.session_id or str(uuid.uuid4())
    try:
        brief, tool_calls, tokens_used=run_agent(session_id, request.topic)
    except Exception as e:
        logging.error(f"Error creating chat response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(
        brief=brief,
        session_id=session_id,
        tool_calls=tool_calls,
        tokens_used=tokens_used
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)