from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
import json
from datetime import datetime

from app.db.database import get_db
from app.api.dependencies import get_current_active_user, check_admin_role
from app.models.models import User
from app.services.ollama_service import OllamaService
from app.services.chat_service import ChatService
from app.schemas.chat import OllamaModelInfo, OllamaChatCompletionRequest, OllamaModelCopyRequest, MessageRequest, OllamaAvailableModelsResponse
from app.schemas.base import MessageResponse

router = APIRouter(
    prefix="/ollama",
    tags=["Ollama"],
    responses={404: {"description": "Not found"}},
)

# Custom JSON encoder that handles datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Định nghĩa class ChatRequest để tương thích với server Java
class ChatRequest:
    def __init__(self, model: str, messages: List[Dict[str, str]], streaming: bool = False, options: Dict[str, Any] = None):
        self.model = model
        self.messages = messages
        self.streaming = streaming
        self.options = options

@router.get("/models", response_model=List[OllamaModelInfo])
async def list_models(
    current_user: User = Depends(get_current_active_user)
):
    """
    List all available models from Ollama
    """
    return await OllamaService.list_models()

@router.get("/models/available")
async def get_available_models(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all available models from Ollama in a format compatible with the Java API.
    Will automatically pull the default model if it doesn't exist.
    
    Returns:
        JSON response with a "models" array containing:
            - name: Model name 
            - displayName: Formatted model name for display
            - size: Parameter size if available
            - modified: Last modified date
    """
    # Get models in the same format as Java API
    response = await OllamaService.get_available_models_formatted()
    
    # Convert models to dictionary and handle datetime serialization
    model_list = []
    for model in response.models:
        model_dict = model.dict()
        # Ensure datetime is converted to string
        if model_dict.get('modified') is not None:
            model_dict['modified'] = model_dict['modified'].isoformat() if isinstance(model_dict['modified'], datetime) else model_dict['modified']
        model_list.append(model_dict)
    
    # Return as raw JSON with custom handling for datetime objects
    return JSONResponse(content={"models": model_list})

@router.post("/models/pull", response_model=MessageResponse)
async def pull_model(
    model_name: str,
    current_user: User = Depends(check_admin_role)  # Only admins can pull models
):
    """
    Pull a model from Ollama (admin only)
    """
    success, message = await OllamaService.pull_model(model_name)
    return MessageResponse(
        message=message,
        success=success
    )

@router.get("/models/{model_name}", response_model=OllamaModelInfo)
async def get_model_info(
    model_name: str = Path(..., title="The name of the model to get info for"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed information about a specific model
    """
    return await OllamaService.get_model_info(model_name)

@router.delete("/models/{model_name}", response_model=MessageResponse)
async def delete_model(
    model_name: str = Path(..., title="The name of the model to delete"),
    current_user: User = Depends(check_admin_role)  # Only admins can delete models
):
    """
    Delete a model from Ollama (admin only)
    """
    result = await OllamaService.delete_model(model_name)
    return MessageResponse(message=f"Model {model_name} deleted successfully", success=result)

@router.post("/models/copy", response_model=MessageResponse)
async def copy_model(
    copy_request: OllamaModelCopyRequest,
    current_user: User = Depends(check_admin_role)  # Only admins can copy models
):
    """
    Copy a model in Ollama (admin only)
    """
    result = await OllamaService.copy_model(copy_request.source, copy_request.destination)
    return MessageResponse(
        message=f"Model copied from {copy_request.source} to {copy_request.destination} successfully", 
        success=result
    )

@router.post("/chat")
async def generate_completion(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate a standard (non-streaming) chat completion from Ollama
    
    Tương thích với endpoint /api/ollama/chat trong Java server
    """
    try:
        # Extract request parameters
        model = request_data.get("model")
        messages = request_data.get("messages", [])
        options = request_data.get("options", {})
        
        # Validate required fields
        if not model or not messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Model and messages are required fields"
            )
        
        # Call Ollama service for non-streaming completion
        full_response = ""
        async for content_chunk in OllamaService.chat_completion(
            OllamaChatCompletionRequest(
                model=model,
                messages=messages,
                stream=False,
                **options
            )
        ):
            full_response += content_chunk
        
        # Return response in the same format as Java server
        return {
            "model": model,
            "message": {
                "role": "assistant",
                "content": full_response
            },
            "done": True
        }
    except Exception as e:
        # Log error and return error response
        print(f"Error generating completion: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "model": request_data.get("model", "unknown"),
                "message": {
                    "role": "assistant",
                    "content": "I'm sorry, I encountered an error while processing your request. Please try again later."
                },
                "done": True
            }
        )

@router.post("/chat/stream")
async def stream_completion(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate a streaming chat completion from Ollama as Server-Sent Events
    
    Tương thích với endpoint /api/ollama/chat/stream trong Java server
    """
    try:
        # Extract request parameters
        model = request_data.get("model")
        messages = request_data.get("messages", [])
        streaming = request_data.get("streaming", True)  # Default to True for streaming endpoint
        options = request_data.get("options", {})
        
        # Validate required fields
        if not model or not messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Model and messages are required fields"
            )
        
        print(f"Streaming request with model: {model}, streaming: {streaming}, options: {options}")
        
        # Define the streaming response generator
        async def generate_stream():
            try:
                async for content_chunk in OllamaService.chat_completion(
                    OllamaChatCompletionRequest(
                        model=model,
                        messages=messages,
                        stream=True,
                        **options
                    )
                ):
                    # Format each chunk as a Server-Sent Event, similar to Java response
                    response_data = {
                        "model": model,
                        "message": {"content": content_chunk, "role": "assistant"},
                        "done": False
                    }
                    yield f"data: {json.dumps(response_data)}\n\n"
                
                # Send final 'done' event
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                # Send error event
                print(f"Error in streaming: {str(e)}")
                error_data = {
                    "error": str(e) if str(e) else "Unknown error",
                    "done": True
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        # Return StreamingResponse
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream"
        )
    except Exception as e:
        # Log error for initial setup errors
        print(f"Error setting up stream: {str(e)}")
        
        # Define error stream
        async def error_stream():
            error_data = {
                "error": "Failed to initialize streaming",
                "done": True
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
        # Return error as stream
        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream"
        )

@router.post("/chat/{chat_id}/completion")
async def chat_completion(
    chat_id: uuid.UUID,
    request: OllamaChatCompletionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a streaming chat completion from Ollama and add it to the chat
    """
    # Verify chat exists and belongs to user
    chat_response = ChatService.get_chat(db, chat_id, current_user.id)
    
    async def generate_stream():
        full_content = ""
        async for content_chunk in OllamaService.chat_completion(request):
            full_content += content_chunk
            yield f"data: {json.dumps({'content': content_chunk})}\n\n"
        
        # Save assistant message to database, sử dụng ChatService đã cải tiến
        # để xử lý thông minh vai trò của tin nhắn
        message_data = MessageRequest(content=full_content)
        ChatService.add_message(db, chat_id, message_data, "assistant", request.model)
        
        yield f"data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )