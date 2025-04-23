from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional

from app.models.models import User
from app.core.security import verify_password, get_password_hash
from app.schemas.user import UserProfileResponse, UpdateProfileRequest, ChangePasswordRequest
from app.schemas.base import MessageResponse

class UserService:
    @staticmethod
    def get_user_profile(db: Session, username: str) -> UserProfileResponse:
        """Get user profile information"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Map user entity to profile response
        return UserProfileResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            avatar_url=user.avatar_url,
            roles=[role.name for role in user.roles],
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    
    @staticmethod
    def update_profile(db: Session, username: str, update_data: UpdateProfileRequest) -> UserProfileResponse:
        """Update user profile information"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields if provided
        if update_data.first_name is not None:
            user.first_name = update_data.first_name
        if update_data.last_name is not None:
            user.last_name = update_data.last_name
        if update_data.phone_number is not None:
            user.phone_number = update_data.phone_number
        if update_data.email is not None and update_data.email != user.email:
            # Check if email is already used by another user
            existing_user = db.query(User).filter(User.email == update_data.email).first()
            if existing_user and existing_user.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already in use"
                )
            user.email = update_data.email
        
        db.commit()
        db.refresh(user)
        
        # Return updated profile
        return UserProfileResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            avatar_url=user.avatar_url,
            roles=[role.name for role in user.roles],
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    
    @staticmethod
    def change_password(db: Session, username: str, password_data: ChangePasswordRequest) -> MessageResponse:
        """Change user password"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password matches confirmation
        if password_data.new_password != password_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password and confirmation do not match"
            )
        
        # Update password
        user.password = get_password_hash(password_data.new_password)
        db.commit()
        
        return MessageResponse(message="Password changed successfully", success=True)
    
    @staticmethod
    def update_avatar(db: Session, username: str, avatar_url: str) -> MessageResponse:
        """Update user avatar URL"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.avatar_url = avatar_url
        db.commit()
        
        return MessageResponse(message="Avatar updated successfully", success=True)