from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import threading
from model_service import model_service

app = FastAPI(title="Smart Tutor Backend")

# Configure CORS so frontend React app can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For prototyping. Can narrow down to specific port later.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@app.get("/api/status")
def get_status():
    if model_service.model is not None:
        return {"status": "ready", "model": "Qwen/Qwen2.5-0.5B-Instruct"}
    elif model_service.loading:
        return {"status": "loading", "model": "Qwen/Qwen2.5-0.5B-Instruct"}
    else:
        return {"status": "not_loaded", "model": "Qwen/Qwen2.5-0.5B-Instruct"}

@app.post("/api/load")
def load_model_trigger():
    if model_service.model is not None:
        return {"status": "ready"}
    if model_service.loading:
        return {"status": "loading"}
    
    # Start loading in background thread so API doesn't block/timeout
    thread = threading.Thread(target=model_service.load_model)
    thread.start()
    return {"status": "loading_started"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Convert Pydantic models to dicts for Hugging Face tokenizer template
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # If model is not loaded, loading will trigger inline (synchronously)
        # But to be user-friendly, the frontend should ideally call /api/load first.
        response = model_service.generate_response(messages_dict)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
