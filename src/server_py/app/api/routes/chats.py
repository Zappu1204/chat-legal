from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.models import User, Chat, Message
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest, MessageRequest, ChatResponse, ChatMessageResponse
from app.schemas.base import MessageResponse

router = APIRouter(
    prefix="/chats",
    tags=["Chats"],
    responses={404: {"description": "Not found"}},
)

@router.post("", response_model=ChatResponse)
def create_chat(
    chat_data: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new chat
    """
    return ChatService.create_chat(db, current_user.id, chat_data)

@router.get("", response_model=dict)
def list_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all chats for the current user with pagination
    Similar to Java Spring's Page structure
    """
    total_count = db.query(Chat).filter(Chat.user_id == current_user.id).count()
    chats = ChatService.list_user_chats(db, current_user.id, skip, limit)
    
    # Return a paginated result structure similar to Spring Boot
    return {
        "content": chats,
        "pageable": {
            "pageNumber": skip // limit if limit > 0 else 0,
            "pageSize": limit,
            "offset": skip
        },
        "totalElements": total_count,
        "totalPages": (total_count + limit - 1) // limit if limit > 0 else 1,
        "last": skip + limit >= total_count,
        "size": limit,
        "number": skip // limit if limit > 0 else 0,
        "sort": {
            "empty": False,
            "sorted": True,
            "unsorted": False
        },
        "numberOfElements": len(chats),
        "first": skip == 0,
        "empty": len(chats) == 0
    }

@router.get("/{chat_id}", response_model=ChatResponse)
def get_chat(
    chat_id: uuid.UUID = Path(..., title="The ID of the chat to get"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific chat by ID
    """
    return ChatService.get_chat(db, chat_id, current_user.id)

@router.put("/{chat_id}", response_model=ChatResponse)
def update_chat(
    chat_data: ChatRequest,
    chat_id: uuid.UUID = Path(..., title="The ID of the chat to update"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a chat's title, description or model
    """
    return ChatService.update_chat(db, chat_id, current_user.id, chat_data)

@router.delete("/{chat_id}", response_model=MessageResponse)
def delete_chat(
    chat_id: uuid.UUID = Path(..., title="The ID of the chat to delete"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a chat
    """
    result = ChatService.delete_chat(db, chat_id, current_user.id)
    return MessageResponse(message="Chat deleted successfully", success=result)

@router.post("/{chat_id}/messages", response_model=ChatMessageResponse)
def add_message(
    message_data: MessageRequest,
    chat_id: uuid.UUID = Path(..., title="The ID of the chat to add a message to"),
    role: str = Query("user", description="Role of the message sender (user or assistant)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Add a message to a chat
    
    This is similar to the sendMessage method in Java's ChatController.
    It processes a message and adds it to the chat with the specified role.
    """
    # Validate that the chat exists and belongs to the user
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat not found with id: {chat_id}"
        )
    
    # Validate role
    if role not in ["user", "assistant"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'user' or 'assistant'"
        )
    
    # Log the received message for debugging
    print(f"Received message content: {message_data.content}, role: {role}")
    
    # Add the message using the ChatService
    return ChatService.add_message(db, chat_id, message_data, role)

@router.get("/{chat_id}/messages", response_model=List[ChatMessageResponse])
def get_chat_messages(
    chat_id: uuid.UUID = Path(..., title="The ID of the chat to get messages for"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages in a specific chat
    
    This endpoint is similar to getChatMessages in Java's ChatController.
    It retrieves all messages from a chat that belongs to the user.
    """
    # Verify chat exists and belongs to the user
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat not found with id: {chat_id}"
        )
    
    # Get all messages from this chat
    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
    
    # Convert messages to response objects
    message_responses = [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            model=msg.model,
            tokens=msg.tokens,
            created_at=msg.created_at
        ) for msg in messages
    ]
    
    return message_responses