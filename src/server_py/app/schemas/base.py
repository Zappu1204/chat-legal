import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class JsonConfig:
    """Pydantic config for JSON serialization that converts datetimes to ISO format with timezone"""
    @classmethod
    def json_encoders(cls):
        return {
            datetime: lambda dt: dt.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')
        }

# Base schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class MessageBase(BaseModel):
    content: str
    
    model_config = ConfigDict(from_attributes=True)

class ChatBase(BaseModel):
    title: str = Field(default="New Chat")
    description: Optional[str] = None
    model: str = Field(default="llama3.1:8b")
    
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    username: str
    email: EmailStr

# Schema for user creation
class UserCreate(UserBase):
    password: str
    phone_number: Optional[str] = None
    roles: Optional[List[str]] = None

# Schema for authentication
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    
class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str
    
class LoginRequest(BaseModel):
    username: str
    password: str
    
class LogoutRequest(BaseModel):
    username: Optional[str] = None
    
class RegisterRequest(UserCreate):
    pass

class RevokeTokenRequest(BaseModel):
    token: str
    reason: Optional[str] = None

# Schema for JWT response
class JWTResponse(BaseModel):
    # Change fields to camelCase to match frontend expectations
    accessToken: str
    refreshToken: str
    tokenType: str = "bearer"
    id: uuid.UUID
    username: str
    email: EmailStr
    roles: List[str]
    
    model_config = ConfigDict(
        # This allows the model to be initialized with snake_case field names
        # but respond with camelCase field names
        populate_by_name=True,
        alias_generator=lambda s: s.replace('_', '')
    )

# Schema for message response
class MessageResponse(BaseModel):
    message: str
    success: bool