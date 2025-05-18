from fastapi import APIRouter, Depends, HTTPException, status
from app.services.rag_processor import RAGProcessor
from typing import Dict, List, Any, Optional
import time
from app.api.dependencies import get_current_active_user
from app.models.models import User
from app.schemas.chat import RAGQuery, RAGResponse, RAGSourceItem, RAGBuildIndexResponse
from app.services.rag_processor import (
    EMBEDDING_MODEL,
    LLM_MODEL,
    FAISS_INDEX_PATH,
)

# Khởi tạo router với prefix và tags
router = APIRouter(
    prefix="/rag",
    tags=["RAG"],
    responses={404: {"description": "Not found"}},
)

# Initialize RAG processor
rag_processor = None

def get_rag_processor() -> RAGProcessor:
    """Dependency to get the RAG processor"""
    global rag_processor
    if rag_processor is None:
        rag_processor = RAGProcessor()
        
        # Chỉ build vectorstore khi khởi tạo processor, 
        # nhưng không load hoặc build index ở đây, chờ gọi API
        if not hasattr(rag_processor, 'embeddings'):
            rag_processor.initialize_embeddings()
            
    return rag_processor

@router.post("/chat", response_model=RAGResponse)
async def rag_chat(
    request: RAGQuery, 
    processor: RAGProcessor = Depends(get_rag_processor),
    current_user: User = Depends(get_current_active_user)
):
    """
    Process a RAG query about Vietnamese traffic laws
    
    This endpoint retrieves information from a vector database of traffic laws
    and generates an answer using the RAG (Retrieval-Augmented Generation) approach with LangChain.
    """
    try:
        # Đo thời gian xử lý
        start_time = time.time()
        
        # Gọi RAG processor để lấy câu trả lời và các nguồn
        answer, sources = processor.generate_answer(request.query)
        
        # Tính thời gian xử lý
        query_time_ms = (time.time() - start_time) * 1000
        
        # Format các nguồn thành đối tượng RAGSourceItem
        formatted_sources = [
            RAGSourceItem(
                chapter_title=src["chapter_title"],
                article_title=src["article_title"],
                content=src["content"],
                distance=src.get("distance")
            )
            for src in sources
        ]
        
        # Trả về response với định dạng RAGResponse
        return RAGResponse(
            answer=answer,
            sources=formatted_sources,
            query=request.query,
            query_time_ms=query_time_ms
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error processing RAG query: {str(e)}"
        )

@router.post("/build-index", response_model=RAGBuildIndexResponse)
async def build_vectorstore_index(
    current_user: User = Depends(get_current_active_user)
):
    """
    Build or rebuild the vector database index for RAG
    
    This endpoint forces a rebuild of the vector database from the source JSON data.
    It will create embeddings for all text chunks and save them to disk for future use.
    """
    try:
        processor = get_rag_processor()
        
        # Đo thời gian xử lý
        start_time = time.time()
        
        # Force a rebuild of the vectorstore
        success = processor.force_rebuild_vectorstore()
        
        # Tính thời gian xử lý
        build_time_ms = (time.time() - start_time) * 1000
        
        # Get document count
        document_count = len(processor.documents) if hasattr(processor, 'documents') and processor.documents else 0
        
        # Check if the rebuild was successful
        if not success:
            return RAGBuildIndexResponse(
                success=False,
                message="No documents were found to build the vectorstore",
                build_time_ms=build_time_ms,
                document_count=document_count
            )
        
        # Trả về thông tin về việc xây dựng index
        return RAGBuildIndexResponse(
            success=True,
            message="Vectorstore built successfully",
            build_time_ms=build_time_ms,
            document_count=document_count
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error building vectorstore: {str(e)}"
        )

@router.get("/status", response_model=Dict[str, Any])
async def get_index_status(
    current_user: User = Depends(get_current_active_user),
    processor: RAGProcessor = Depends(get_rag_processor)
):
    """
    Get status of the RAG vectorstore
    
    This endpoint returns information about the current state of the vector database,
    including whether it's loaded, how many documents it contains, etc.
    """
    try:
        # Kiểm tra trạng thái của vectorstore
        vectorstore_loaded = processor.vectorstore is not None
        
        # Lấy số lượng documents nếu có
        document_count = 0
        if hasattr(processor, 'documents') and processor.documents:
            document_count = len(processor.documents)
        elif vectorstore_loaded and hasattr(processor.vectorstore, '_dict'):
            # Đây là cách LangChain FAISS lưu documents
            document_count = len(processor.vectorstore._dict)
        
        # Lấy thông tin về mô hình embedding
        embedding_model = EMBEDDING_MODEL  # Sử dụng biến từ rag_processor.py
        
        # Kiểm tra xem index có được lưu trên đĩa không
        import os
        index_saved = os.path.exists(FAISS_INDEX_PATH)  # Sử dụng biến từ rag_processor.py
        
        return {
            "vectorstore_loaded": vectorstore_loaded,
            "document_count": document_count,
            "embedding_model": embedding_model,
            "index_saved": index_saved,
            "status": "ready" if vectorstore_loaded else "not_loaded",
            "llm_model": LLM_MODEL  # Sử dụng biến từ rag_processor.py
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error getting index status: {str(e)}"
        )

@router.get("/health")
async def health_check(
    current_user: User = Depends(get_current_active_user)
):
    """Health check endpoint"""
    return {"status": "ok", "message": "RAG service with LangChain is running normally"}