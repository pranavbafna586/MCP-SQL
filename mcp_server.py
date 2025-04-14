import os
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

import agent
import db_connector

# Load environment variables
load_dotenv()

# Initialize database
db_connector.init_db()

# Initialize FastAPI app
app = FastAPI(title="MCP MySQL AI Agent")

# Define Pydantic models for request and response
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "langchain-agent"
    max_tokens: Optional[int] = None
    temperature: Optional[float] = 0

class Choice(BaseModel):
    index: int = 0
    message: Message
    finish_reason: str = "stop"

class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Choice]
    usage: Usage

class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str = "organization-owner"

# Initialize database tables
@app.on_event("startup")
async def startup_event():
    db_connector.init_db()
    print("Database initialized successfully")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Model information endpoint
@app.get("/v1/models/info")
async def get_model_info():
    import time
    
    models = [
        ModelInfo(
            id="langchain-agent",
            created=int(time.time()),
        )
    ]
    
    return {"data": models}

# Chat completions endpoint
@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    import time
    import uuid
    
    try:
        # Process the last message only for simplicity
        user_message = request.messages[-1].content
        
        # Run the agent with the user message
        agent_response = agent.run_agent(user_message)
        
        if not agent_response["success"]:
            raise HTTPException(status_code=500, detail=agent_response.get("error", "Unknown error"))
        
        # Create response
        response = ChatCompletionResponse(
            id=f"chatcmpl-{uuid.uuid4()}",
            created=int(time.time()),
            model=request.model,
            choices=[
                Choice(
                    message=Message(
                        role="assistant",
                        content=agent_response["response"]
                    )
                )
            ],
            usage=Usage(
                prompt_tokens=len(user_message.split()),
                completion_tokens=len(agent_response["response"].split()),
                total_tokens=len(user_message.split()) + len(agent_response["response"].split())
            )
        )
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Document API endpoints
class DocumentCreate(BaseModel):
    title: str
    content: str
    metadata: Optional[str] = None

@app.post("/api/documents", response_model=Dict[str, Any])
async def create_document(doc: DocumentCreate):
    """Create a new document in the database."""
    try:
        new_doc = db_connector.add_document(doc.title, doc.content, doc.metadata)
        return {
            "id": new_doc.id,
            "title": new_doc.title,
            "content": new_doc.content,
            "metadata": new_doc.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents", response_model=List[Dict[str, Any]])
async def get_documents():
    """Get all documents from the database."""
    try:
        docs = db_connector.get_all_documents()
        return [
            {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content,
                "metadata": doc.metadata
            }
            for doc in docs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/search", response_model=List[Dict[str, Any]])
async def search_documents(query: str):
    """Search for documents matching the query."""
    try:
        docs = db_connector.search_documents(query)
        return [
            {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content,
                "metadata": doc.metadata
            }
            for doc in docs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Error handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)},
    )

if __name__ == "__main__":
    # Server configuration from environment variables
    host = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("MCP_SERVER_PORT", "8000"))
    
    # Run the server
    print(f"Starting MCP server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)