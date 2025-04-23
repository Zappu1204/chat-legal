from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional

from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.models.models import User, RefreshToken, Role
from app.schemas.base import RegisterRequest, LoginRequest, JWTResponse, RefreshTokenRequest, MessageResponse, LogoutRequest, RevokeTokenRequest

class AuthService:
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.password):
            return None
        return user
    
    @staticmethod
    def register_user(db: Session, user_data: RegisterRequest) -> MessageResponse:
        """Register a new user"""
        # Check if username already exists
        if db.query(User).filter(User.username == user_data.username).first():
            return MessageResponse(message="Username is already taken", success=False)
        
        # Check if email already exists
        if db.query(User).filter(User.email == user_data.email).first():
            return MessageResponse(message="Email is already in use", success=False)
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            phone_number=user_data.phone_number
        )
        
        # Add roles
        roles = []
        if user_data.roles and len(user_data.roles) > 0:
            for role_name in user_data.roles:
                if role_name == "admin":
                    role = db.query(Role).filter(Role.name == "ROLE_ADMIN").first()
                elif role_name == "mod":
                    role = db.query(Role).filter(Role.name == "ROLE_MODERATOR").first()
                else:
                    role = db.query(Role).filter(Role.name == "ROLE_USER").first()
                
                if role:
                    roles.append(role)
        else:
            # Default role is USER
            role = db.query(Role).filter(Role.name == "ROLE_USER").first()
            if role:
                roles.append(role)
        
        user.roles = roles
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return MessageResponse(message="User registered successfully!", success=True)
    
    @staticmethod
    def login(db: Session, login_data: LoginRequest) -> JWTResponse:
        """Login a user and return JWT tokens"""
        user = AuthService.authenticate_user(db, login_data.username, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Generate access token
        access_token = create_access_token(user.username)
        
        # Create refresh token
        refresh_token = create_refresh_token(user.username)
        
        # Save refresh token in the database
        token_entity = RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db.add(token_entity)
        db.commit()
        
        # Return JWT response
        roles = [role.name for role in user.roles]
        
        return JWTResponse(
            accessToken=access_token,
            refreshToken=refresh_token,
            id=user.id,
            username=user.username,
            email=user.email,
            roles=roles
        )
    
    @staticmethod
    def refresh_token(db: Session, refresh_request: RefreshTokenRequest) -> JWTResponse:
        """Refresh access token using a refresh token"""
        token_entity = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_request.refresh_token,
            RefreshToken.is_revoked == False,
            RefreshToken.is_used == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
        
        if not token_entity:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or expired refresh token",
            )
        
        # Get user
        user = token_entity.user
        
        # Generate new access token
        access_token = create_access_token(user.username)
        
        # Generate new refresh token
        new_refresh_token = create_refresh_token(user.username)
        
        # Mark old token as used
        token_entity.is_used = True
        token_entity.replaced_by = new_refresh_token
        
        # Save new refresh token
        new_token_entity = RefreshToken(
            token=new_refresh_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        
        db.add(new_token_entity)
        db.commit()
        
        # Return JWT response
        roles = [role.name for role in user.roles]
        
        return JWTResponse(
            accessToken=access_token,
            refreshToken=new_refresh_token,
            id=user.id,
            username=user.username,
            email=user.email,
            roles=roles
        )
    
    @staticmethod
    def logout(db: Session, logout_request: LogoutRequest) -> MessageResponse:
        """Logout a user by revoking all their refresh tokens"""
        if logout_request and logout_request.username:
            user = db.query(User).filter(User.username == logout_request.username).first()
            if user:
                tokens = db.query(RefreshToken).filter(
                    RefreshToken.user_id == user.id,
                    RefreshToken.is_revoked == False,
                    RefreshToken.expires_at > datetime.utcnow()
                ).all()
                
                for token in tokens:
                    token.is_revoked = True
                    token.revoked_reason = "User logged out"
                
                db.commit()
        
        return MessageResponse(message="Logout successful", success=True)
    
    @staticmethod
    def revoke_token(db: Session, revoke_request: RevokeTokenRequest) -> MessageResponse:
        """Revoke a specific refresh token"""
        token_entity = db.query(RefreshToken).filter(
            RefreshToken.token == revoke_request.token
        ).first()
        
        if not token_entity:
            return MessageResponse(message="Token not found", success=False)
        
        if token_entity.is_revoked:
            return MessageResponse(message="Token was already revoked", success=False)
        
        # Revoke the token
        token_entity.is_revoked = True
        token_entity.revoked_reason = revoke_request.reason or "Manually revoked by user"
        db.commit()
        
        return MessageResponse(message="Token successfully revoked", success=True)