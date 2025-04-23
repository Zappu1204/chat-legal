import os
import secrets
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, EmailStr, field_validator, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API version and path settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "PTIT Chat API"
    PROJECT_DESCRIPTION: str = "API for PTIT Chat application"
    PROJECT_VERSION: str = "1.0.0"
    
    # Security settings
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7    # 7 days
    
    # Database settings
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "vivuchat")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    # CORS settings
    CORS_ORIGINS: List[AnyHttpUrl] = ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "http://localhost:80", "http://localhost:443"]
    
    # Ollama settings
    OLLAMA_API_URL: str = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api")
    OLLAMA_API_TIMEOUT: int = int(os.getenv("OLLAMA_API_TIMEOUT", "60"))
    MAX_OUTPUT_TOKENS: int = int(os.getenv("MAX_OUTPUT_TOKENS", "2048"))
    
    # First admin user settings
    FIRST_ADMIN_EMAIL: EmailStr = os.getenv("FIRST_ADMIN_EMAIL", "admin@example.com")
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "adminpassword")
    FIRST_ADMIN_USERNAME: str = os.getenv("FIRST_ADMIN_USERNAME", "admin")
    
    @field_validator("CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @property
    def get_database_uri(self) -> str:
        if self.SQLALCHEMY_DATABASE_URI:
            return self.SQLALCHEMY_DATABASE_URI
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()