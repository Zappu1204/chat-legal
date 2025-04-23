from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.models import User
from app.services.user_service import UserService
from app.schemas.user import UserProfileResponse, UpdateProfileRequest, ChangePasswordRequest
from app.schemas.base import MessageResponse

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me", response_model=UserProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user profile
    """
    return UserService.get_user_profile(db, current_user.username)

@router.put("/me", response_model=UserProfileResponse)
def update_user_profile(
    update_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile
    """
    return UserService.update_profile(db, current_user.username, update_data)

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change user password
    """
    return UserService.change_password(db, current_user.username, password_data)

@router.post("/update-avatar", response_model=MessageResponse)
def update_avatar(
    avatar_url: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user avatar URL
    """
    return UserService.update_avatar(db, current_user.username, avatar_url)