import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import Chat, Message, User
from app.schemas.chat import ChatRequest, MessageRequest, ChatResponse, ChatMessageResponse

class ChatService:
    @staticmethod
    def create_chat(db: Session, user_id: uuid.UUID, chat_data: ChatRequest) -> ChatResponse:
        """Create a new chat for a user"""
        # Create chat entity
        chat = Chat(
            title=chat_data.title,
            description=chat_data.description,
            model=chat_data.model,
            user_id=user_id
        )
        
        db.add(chat)
        db.commit()
        db.refresh(chat)
        
        # Return response
        return ChatResponse(
            id=chat.id,
            title=chat.title,
            description=chat.description,
            model=chat.model,
            messages=[],
            created_at=chat.created_at,
            updated_at=chat.updated_at
        )
    
    @staticmethod
    def add_message(db: Session, chat_id: uuid.UUID, message_data: MessageRequest, role: str, 
                    model: Optional[str] = None, tokens: Optional[int] = None) -> ChatMessageResponse:
        """Add a message to an existing chat"""
        # Find chat
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat not found with id: {chat_id}"
            )
        
        # Validate message content
        if not message_data.content or message_data.content.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message content cannot be empty"
            )
        
        # Improved logic for determining message role, similar to Java implementation
        determined_role = role
        
        # If role is explicitly set to 'user', check if we need to update chat title
        if role == "user":
            # Get user messages count to determine if this is the first message
            user_messages = db.query(Message).filter(
                Message.chat_id == chat_id, 
                Message.role == "user"
            ).count()
            
            # If this is the first user message or chat has default title, update the title
            if user_messages == 0 or chat.title == "New Chat":
                # Get title from the first part of the message
                title = message_data.content
                if len(title) > 30:
                    title = title[:27] + "..."
                
                # Update chat title
                chat.title = title
        
        # Check if message contains thinking tags (indicating an assistant message)
        elif "<think>" in message_data.content or "</think>" in message_data.content:
            determined_role = "assistant"
        else:
            # Look at the most recent message in the chat to infer role
            recent_messages = db.query(Message).filter(
                Message.chat_id == chat_id
            ).order_by(Message.created_at.desc()).limit(1).all()
            
            # If the last message was from a user, this is likely the assistant's response
            if recent_messages and recent_messages[0].role == "user":
                determined_role = "assistant"
        
        # Create message with the determined role
        message = Message(
            role=determined_role,
            content=message_data.content,
            chat_id=chat_id,
            model=model or chat.model,  # Use chat model if not specified
            tokens=tokens
        )
        
        db.add(message)
        
        # Update chat's updated_at timestamp
        chat.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(message)
        
        # Return response
        return ChatMessageResponse(
            id=message.id,
            role=message.role,
            content=message.content,
            model=message.model,
            tokens=message.tokens,
            created_at=message.created_at
        )
    
    @staticmethod
    def get_chat(db: Session, chat_id: uuid.UUID, user_id: uuid.UUID) -> ChatResponse:
        """Get a chat by ID for a specific user"""
        # Find chat with user check
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id).first()
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat not found with id: {chat_id}"
            )
        
        # Get messages
        messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
        
        # Map to response
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
        
        return ChatResponse(
            id=chat.id,
            title=chat.title,
            description=chat.description,
            model=chat.model,
            messages=message_responses,
            created_at=chat.created_at,
            updated_at=chat.updated_at
        )
    
    @staticmethod
    def list_user_chats(db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 20) -> List[ChatResponse]:
        """List all chats for a user"""
        # Get chats with pagination
        chats = db.query(Chat).filter(Chat.user_id == user_id).order_by(
            Chat.updated_at.desc()
        ).offset(skip).limit(limit).all()
        
        # Map to response
        chat_responses = []
        for chat in chats:
            chat_responses.append(ChatResponse(
                id=chat.id,
                title=chat.title,
                description=chat.description,
                model=chat.model,
                messages=[],  # Skip messages for list view
                created_at=chat.created_at,
                updated_at=chat.updated_at
            ))
        
        return chat_responses
    
    @staticmethod
    def update_chat(db: Session, chat_id: uuid.UUID, user_id: uuid.UUID, 
                    update_data: ChatRequest) -> ChatResponse:
        """Update chat title, description or model"""
        # Find chat with user check
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id).first()
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat not found with id: {chat_id}"
            )
        
        # Update fields
        if update_data.title is not None:
            chat.title = update_data.title
        if update_data.description is not None:
            chat.description = update_data.description
        if update_data.model is not None:
            chat.model = update_data.model
        
        chat.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(chat)
        
        # Get messages for response
        messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
        
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
        
        return ChatResponse(
            id=chat.id,
            title=chat.title,
            description=chat.description,
            model=chat.model,
            messages=message_responses,
            created_at=chat.created_at,
            updated_at=chat.updated_at
        )
    
    @staticmethod
    def delete_chat(db: Session, chat_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a chat and all its messages"""
        # Find chat with user check
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id).first()
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat not found with id: {chat_id}"
            )
        
        # Delete chat (cascade will handle messages)
        db.delete(chat)
        db.commit()
        
        return True