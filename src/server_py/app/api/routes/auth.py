from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.auth_service import AuthService
from app.schemas.base import LoginRequest, RegisterRequest, JWTResponse, RefreshTokenRequest, MessageResponse, LogoutRequest

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    responses={404: {"description": "Not found"}},
)

@router.post("/login", response_model=JWTResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with username and password
    """
    return AuthService.login(db, login_request)

@router.post("/register", response_model=MessageResponse)
def register(register_request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    return AuthService.register_user(db, register_request)

@router.post("/refresh", response_model=JWTResponse)
def refresh_token(refresh_request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token
    """
    return AuthService.refresh_token(db, refresh_request)

@router.post("/logout", response_model=MessageResponse)
def logout(logout_request: LogoutRequest, db: Session = Depends(get_db)):
    """
    Logout and invalidate refresh tokens
    """
    return AuthService.logout(db, logout_request)