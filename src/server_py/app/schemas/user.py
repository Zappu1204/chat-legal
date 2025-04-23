import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.schemas.base import UserBase, MessageResponse

# User profile schemas
class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class UserProfileResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    roles: List[str]
    created_at: datetime
    updated_at: datetime
    
    # Cập nhật để sử dụng ConfigDict và chuẩn hóa tên trường thành camelCase
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.replace(tzinfo=None).isoformat() + "Z"},
        populate_by_name=True,
        alias_generator=lambda s: ''.join([s.split('_')[0]] + [w.capitalize() for w in s.split('_')[1:]])
    )
    
    # Thêm các thuộc tính để tương thích với frontend
    @property
    def createdAt(self) -> str:
        if self.created_at:
            return self.created_at.replace(tzinfo=None).isoformat() + "Z"
        return None
    
    @property
    def updatedAt(self) -> str:
        if self.updated_at:
            return self.updated_at.replace(tzinfo=None).isoformat() + "Z"
        return None

# Admin user schemas
class UserAdminResponse(UserProfileResponse):
    is_active: bool
    locked_until: Optional[datetime] = None
    chat_count: int
    message_count: int
    
    # Thêm thuộc tính isActive và lockedUntil
    @property
    def isActive(self) -> bool:
        return self.is_active
    
    @property
    def lockedUntil(self) -> Optional[str]:
        if self.locked_until:
            return self.locked_until.replace(tzinfo=None).isoformat() + "Z"
        return None

class UserStatusUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    locked_until: Optional[datetime] = None