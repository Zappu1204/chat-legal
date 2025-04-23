from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.db.database import get_db
from app.api.dependencies import check_admin_role
from app.models.models import User
from app.services.admin_service import AdminUserService, AdminTokenService
from app.schemas.user import UserAdminResponse, UserStatusUpdateRequest
from app.schemas.base import MessageResponse

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    responses={404: {"description": "Not found"}},
)

@router.get("/users", response_model=List[UserAdminResponse])
def list_users(
    search: Optional[str] = Query(None, description="Search term for username, email, first name, or last name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max number of users to return"),
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """
    List all users with optional filters (admin only)
    """
    return AdminUserService.find_all_users(db, search, is_active, skip, limit)

@router.get("/users/{user_id}", response_model=UserAdminResponse)
def get_user_details(
    user_id: uuid.UUID = Path(..., description="The ID of the user to get details for"),
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific user (admin only)
    """
    return AdminUserService.get_user_details(db, user_id)

@router.put("/users/{user_id}/status", response_model=MessageResponse)
def update_user_status(
    update_data: UserStatusUpdateRequest,
    user_id: uuid.UUID = Path(..., description="The ID of the user to update"),
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """
    Update a user's active status and/or lock status (admin only)
    """
    # Prevent admin from deactivating themselves
    if user_id == current_user.id and update_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    return AdminUserService.update_user_status(db, user_id, update_data)

@router.post("/tokens/purge-expired", response_model=MessageResponse)
def purge_expired_tokens(
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """
    Purge all expired refresh tokens from the database (admin only)
    """
    count = AdminTokenService.purge_expired_tokens(db)
    return MessageResponse(
        message=f"Successfully purged {count} expired refresh tokens",
        success=True
    )

@router.get("/users/count")
def count_users(
    search: Optional[str] = Query(None, description="Search term for username, email, first name, or last name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """
    Count total users with optional filters (admin only)
    """
    total = AdminUserService.count_total_users(db, search, is_active)
    return {"total": total}