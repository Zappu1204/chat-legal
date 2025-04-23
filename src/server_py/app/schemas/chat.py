import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.base import ChatBase, MessageBase
from app.core.config import settings

# Chat request/response schemas
class ChatRequest(ChatBase):
    pass

class MessageRequest(MessageBase):
    pass

class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    tokens: Optional[int] = None
    model: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.replace(tzinfo=None).isoformat() + "Z"},
        populate_by_name=True,
        alias_generator=lambda s: ''.join([s.split('_')[0]] + [w.capitalize() for w in s.split('_')[1:]])
    )

    @property
    def createdAt(self) -> str:
        if self.created_at:
            return self.created_at.replace(tzinfo=None).isoformat() + "Z"
        return None

class ChatResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    model: str
    messages: List[ChatMessageResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.replace(tzinfo=None).isoformat() + "Z"},
        populate_by_name=True, 
        alias_generator=lambda s: ''.join([s.split('_')[0]] + [w.capitalize() for w in s.split('_')[1:]])
    )

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

# Ollama schemas
class OllamaModelInfo(BaseModel):
    name: str
    modified_at: Optional[datetime] = None
    size: Optional[int] = None
    digest: Optional[str] = None
    details: Optional[dict] = None

# New schema for available models response format (matching Java API)
class OllamaAvailableModelInfo(BaseModel):
    name: str
    displayName: str
    size: Optional[str] = None
    modified: Optional[datetime] = None

class OllamaAvailableModelsResponse(BaseModel):
    models: List[OllamaAvailableModelInfo]

class OllamaRequest(BaseModel):
    model: str
    messages: List[dict]
    stream: bool = True
    options: Optional[dict] = None

class OllamaChatCompletionRequest(BaseModel):
    model: str
    messages: List[dict]
    stream: bool = True
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    top_k: Optional[int] = 40
    max_tokens: Optional[int] = settings.MAX_OUTPUT_TOKENS
    
class OllamaModelCopyRequest(BaseModel):
    source: str
    destination: str

# RAG schemas
class RAGQuery(BaseModel):
    query: str
    
class RAGSourceItem(BaseModel):
    chapter_title: str
    article_title: str
    content: str
    distance: Optional[float] = None

class RAGResponse(BaseModel):
    answer: str
    sources: List[RAGSourceItem] = []
    query: str
    query_time_ms: Optional[float] = None
    
    model_config = ConfigDict(
        json_encoders={datetime: lambda dt: dt.replace(tzinfo=None).isoformat() + "Z"}
    )

class RAGBuildIndexResponse(BaseModel):
    success: bool
    message: str
    build_time_ms: float
    document_count: int