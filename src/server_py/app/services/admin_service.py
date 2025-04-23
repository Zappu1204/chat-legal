from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy import func, or_
import uuid
from typing import List, Optional

from app.models.models import User, RefreshToken, Role, Chat, Message
from app.schemas.user import UserAdminResponse, UserStatusUpdateRequest
from app.schemas.base import MessageResponse

class AdminUserService:
    @staticmethod
    def find_all_users(db: Session, search: Optional[str] = None, is_active: Optional[bool] = None, 
                       skip: int = 0, limit: int = 20) -> List[UserAdminResponse]:
        """Find all users with optional search and is_active filter"""
        query = db.query(User)
        
        # Apply filters
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern)
            ))
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        # Execute query with pagination
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        
        # Map to response DTOs
        return [AdminUserService._map_to_user_admin_response(db, user) for user in users]
    
    @staticmethod
    def get_user_details(db: Session, user_id: uuid.UUID) -> UserAdminResponse:
        """Get detailed user information for admin panel"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User not found with id: {user_id}"
            )
        
        return AdminUserService._map_to_user_admin_response(db, user)
    
    @staticmethod
    def update_user_status(db: Session, user_id: uuid.UUID, update_data: UserStatusUpdateRequest) -> MessageResponse:
        """Update user active status and/or lock status"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User not found with id: {user_id}"
            )
        
        # Check if user has admin role
        has_admin_role = any(role.name == "ROLE_ADMIN" for role in user.roles)
        
        if has_admin_role and update_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate administrator account"
            )
        
        if update_data.is_active is not None:
            user.is_active = update_data.is_active
        
        if update_data.locked_until is not None:
            user.locked_until = update_data.locked_until
        
        db.commit()
        
        status_message = "User account has been activated" if update_data.is_active else "User account has been deactivated"
        
        return MessageResponse(message=status_message, success=True)
    
    @staticmethod
    def count_total_users(db: Session, search: Optional[str] = None, is_active: Optional[bool] = None) -> int:
        """Count total users with optional filters"""
        query = db.query(func.count(User.id))
        
        # Apply filters
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern)
            ))
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        return query.scalar()
    
    @staticmethod
    def _map_to_user_admin_response(db: Session, user: User) -> UserAdminResponse:
        """Map User entity to UserAdminResponse schema"""
        # Count chats and messages
        chat_count = db.query(func.count(Chat.id)).filter(Chat.user_id == user.id).scalar()
        message_count = db.query(func.count(Message.id)).join(Chat).filter(Chat.user_id == user.id).scalar()
        
        return UserAdminResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            locked_until=user.locked_until,
            roles=[role.name for role in user.roles],
            created_at=user.created_at,
            updated_at=user.updated_at,
            chat_count=chat_count,
            message_count=message_count
        )

class AdminTokenService:
    @staticmethod
    def purge_expired_tokens(db: Session) -> int:
        """Delete expired tokens from the database"""
        from datetime import datetime
        
        # Count expired tokens
        count = db.query(func.count(RefreshToken.id)).filter(
            RefreshToken.expires_at < datetime.utcnow()
        ).scalar()
        
        # Delete expired tokens
        db.query(RefreshToken).filter(
            RefreshToken.expires_at < datetime.utcnow()
        ).delete(synchronize_session=False)
        
        db.commit()
        
        return count