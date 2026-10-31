from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import threading
from model_service import model_service
from rag_service import rag_service

app = FastAPI(title="Smart Tutor Backend")

# Configure CORS so frontend React app can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    use_rag: Optional[bool] = True
    top_k: Optional[int] = 4

@app.get("/api/status")
def get_status():
    status = "not_loaded"
    if model_service.model is not None:
        status = "ready"
    elif model_service.loading:
        status = "loading"

    return {
        "status": status,
        "model": "Qwen/Qwen2.5-0.5B-Instruct",
        "total_documents": len(rag_service.documents),
        "total_chunks": len(rag_service.chunks),
    }

@app.post("/api/load")
def load_model_trigger():
    if model_service.model is not None:
        return {"status": "ready"}
    if model_service.loading:
        return {"status": "loading"}
    
    # Start loading in background thread so API doesn't block
    thread = threading.Thread(target=model_service.load_model)
    thread.start()
    return {"status": "loading_started"}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
        filename = file.filename or "uploaded_lecture_document.pdf"
        record = rag_service.add_document(content, filename)
        
        return {
            "success": True,
            "document": record.to_dict(),
            "total_documents": len(rag_service.documents),
            "total_chunks": len(rag_service.chunks),
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.get("/api/documents")
def get_documents():
    return {
        "documents": [doc.to_dict() for doc in rag_service.documents.values()],
        "total_documents": len(rag_service.documents),
        "total_chunks": len(rag_service.chunks),
    }

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    success = rag_service.remove_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "success": True,
        "message": f"Document {doc_id} deleted.",
        "total_documents": len(rag_service.documents),
        "total_chunks": len(rag_service.chunks),
    }

@app.delete("/api/documents")
def clear_all_documents():
    rag_service.clear_all()
    return {
        "success": True,
        "message": "All documents cleared.",
        "total_documents": 0,
        "total_chunks": 0,
    }

class ExplainSlideRequest(BaseModel):
    doc_id: str
    page_num: int

@app.get("/api/documents/{doc_id}/slides")
def get_document_slides(doc_id: str):
    if doc_id not in rag_service.documents:
        raise HTTPException(status_code=404, detail="Document not found.")
    slides = rag_service.get_document_slides(doc_id)
    return {
        "doc_id": doc_id,
        "filename": rag_service.documents[doc_id].filename,
        "total_slides": len(slides),
        "slides": slides,
    }

@app.post("/api/explain-slide")
async def explain_slide(request: ExplainSlideRequest):
    if request.doc_id not in rag_service.documents:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    doc = rag_service.documents[request.doc_id]
    slide_text = rag_service.get_slide_content(request.doc_id, request.page_num)
    if not slide_text:
        raise HTTPException(status_code=404, detail=f"Slide {request.page_num} not found in {doc.filename}.")

    prompt_messages = rag_service.format_slide_explanation_prompt(doc.filename, request.page_num, slide_text)
    raw_response = model_service.generate_response(prompt_messages, max_new_tokens=300)
    explanation = rag_service.clean_response(raw_response)

    return {
        "doc_id": request.doc_id,
        "filename": doc.filename,
        "page_num": request.page_num,
        "slide_text": slide_text,
        "explanation": explanation,
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Determine the latest user query
        user_queries = [m["content"] for m in messages_dict if m["role"] == "user"]
        latest_query = user_queries[-1] if user_queries else ""

        retrieved_sources = []
        if request.use_rag and rag_service.chunks and latest_query:
            retrieved_sources = rag_service.retrieve(latest_query, top_k=request.top_k or 4)
            formatted_messages = rag_service.format_tutor_prompt(messages_dict, retrieved_sources)
        else:
            # Default helpful tutor system message
            system_msg = {
                "role": "system",
                "content": "You are a friendly, expert AI Smart Tutor. Explain concepts clearly and concisely."
            }
            formatted_messages = [system_msg] + messages_dict

        raw_response = model_service.generate_response(formatted_messages)
        response_text = rag_service.clean_response(raw_response)
        return {
            "response": response_text,
            "sources": retrieved_sources,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
