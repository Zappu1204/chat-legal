import aiohttp
import asyncio
import json
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from fastapi import HTTPException, status
import httpx

from app.core.config import settings
from app.schemas.chat import OllamaModelInfo, OllamaChatCompletionRequest, OllamaAvailableModelInfo, OllamaAvailableModelsResponse

logger = logging.getLogger(__name__)

class OllamaService:
    # Default model to use if no model is specified
    DEFAULT_MODEL = "llama3.1:8b"
    
    @staticmethod
    async def list_models() -> List[OllamaModelInfo]:
        """
        List all available models from Ollama API
        """
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_API_TIMEOUT) as client:
                response = await client.get(f"{settings.OLLAMA_API_URL}/tags")
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Error fetching models from Ollama: {response.text}"
                    )
                
                data = response.json()
                models = []
                
                for model_data in data.get("models", []):
                    model = OllamaModelInfo(
                        name=model_data.get("name"),
                        modified_at=model_data.get("modified_at"),
                        size=model_data.get("size"),
                        digest=model_data.get("digest"),
                        details=model_data.get("details")
                    )
                    models.append(model)
                
                return models
                
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Ollama API: {str(e)}"
            )
    
    @staticmethod
    async def get_available_models() -> List[OllamaModelInfo]:
        """
        Get available models and ensure default model exists.
        Will automatically pull the default model if it doesn't exist.
        """
        models = await OllamaService.list_models()
        
        # Check if our default model exists, if not pull it
        default_model_exists = any(model.name == OllamaService.DEFAULT_MODEL for model in models)
        
        if not default_model_exists:
            logger.info(f"Default model {OllamaService.DEFAULT_MODEL} not found. Pulling model...")
            try:
                await OllamaService.pull_model(OllamaService.DEFAULT_MODEL)
                # Add the default model to the list
                default_model = await OllamaService.get_model_info(OllamaService.DEFAULT_MODEL)
                models.append(default_model)
                logger.info(f"Successfully pulled model {OllamaService.DEFAULT_MODEL}")
            except Exception as e:
                logger.error(f"Failed to pull default model {OllamaService.DEFAULT_MODEL}: {str(e)}")
        
        return models
    
    @staticmethod
    async def get_available_models_formatted() -> OllamaAvailableModelsResponse:
        """
        Get available models in a format matching the Java API response.
        This method formats the response to be identical to what the Java API returns.
        """
        models = await OllamaService.get_available_models()
        
        formatted_models = []
        for model in models:
            # Format model data to match Java API response
            # Extract parameter size if available in details
            parameter_size = None
            if model.details and 'parameter_size' in model.details:
                parameter_size = model.details['parameter_size']
            
            # Format modified_at date in ISO format with timezone Z
            modified_date = None
            if model.modified_at:
                if isinstance(model.modified_at, str):
                    # If already a string, normalize timezone format
                    if '+00:00' in model.modified_at:
                        # Replace +00:00 with Z
                        modified_date = model.modified_at.replace('+00:00', 'Z')
                    elif 'Z' not in model.modified_at and '+' not in model.modified_at:
                        # Add Z only if no timezone info exists
                        modified_date = model.modified_at + 'Z'
                    else:
                        # Keep as is if it already has proper format
                        modified_date = model.modified_at
                else:
                    # Convert datetime to ISO format with Z suffix, ensuring no double timezone
                    iso_format = model.modified_at.isoformat()
                    if '+00:00' in iso_format:
                        modified_date = iso_format.replace('+00:00', 'Z')
                    else:
                        modified_date = iso_format + 'Z'
            
            formatted_model = OllamaAvailableModelInfo(
                name=model.name,
                displayName=model.name.replace(":", " "),  # Format display name like in Java
                size=parameter_size or str(model.size) if model.size else None,
                modified=modified_date
            )
            formatted_models.append(formatted_model)
        
        return OllamaAvailableModelsResponse(models=formatted_models)

    @staticmethod
    async def pull_model(model_name: str) -> Tuple[bool, str]:
        """
        Pull a model from Ollama API
        """
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_API_TIMEOUT * 6) as client:  # Longer timeout for model pulls
                logger.info(f"Pulling model {model_name} from Ollama...")
                response = await client.post(
                    f"{settings.OLLAMA_API_URL}/pull",
                    json={"name": model_name},
                    timeout=None  # Disable timeout as model pulls can take a while
                )
                
                if response.status_code != 200:
                    logger.error(f"Error pulling model from Ollama: {response.text}")
                    return False, f"Error pulling model: {response.text}"
                
                logger.info(f"Successfully pulled model {model_name}")
                return True, "Model pulled successfully"
                
        except Exception as e:
            error_msg = f"Could not pull model from Ollama: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    @staticmethod
    async def get_model_info(model_name: str) -> OllamaModelInfo:
        """
        Get detailed information about a specific model
        """
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_API_TIMEOUT) as client:
                response = await client.post(
                    f"{settings.OLLAMA_API_URL}/show",
                    json={"name": model_name}
                )
                
                if response.status_code != 200:
                    # If model not found, try to pull the default model
                    if model_name == OllamaService.DEFAULT_MODEL:
                        logger.info(f"Default model {model_name} not found. Attempting to pull it...")
                        success, message = await OllamaService.pull_model(model_name)
                        if success:
                            # Try to get info again after pulling
                            return await OllamaService.get_model_info(model_name)
                    
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Error fetching model info from Ollama: {response.text}"
                    )
                
                model_data = response.json()
                
                model = OllamaModelInfo(
                    name=model_data.get("name", model_name),
                    modified_at=None,
                    size=model_data.get("size"),
                    digest=model_data.get("digest"),
                    details=model_data.get("details")
                )
                
                return model
                
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Ollama API: {str(e)}"
            )
    
    @staticmethod
    async def delete_model(model_name: str) -> bool:
        """
        Delete a model from Ollama
        """
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_API_TIMEOUT) as client:
                response = await client.delete(
                    f"{settings.OLLAMA_API_URL}/delete",
                    json={"name": model_name}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Error deleting model from Ollama: {response.text}"
                    )
                
                return True
                
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Ollama API: {str(e)}"
            )
    
    @staticmethod
    async def copy_model(source: str, destination: str) -> bool:
        """
        Copy a model in Ollama
        """
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_API_TIMEOUT) as client:
                response = await client.post(
                    f"{settings.OLLAMA_API_URL}/copy",
                    json={"source": source, "destination": destination}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Error copying model in Ollama: {response.text}"
                    )
                
                return True
                
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Ollama API: {str(e)}"
            )
    
    @staticmethod
    async def chat_completion(request: OllamaChatCompletionRequest) -> AsyncGenerator[str, None]:
        """
        Generate chat completion from Ollama API with streaming
        """
        payload = {
            "model": request.model,
            "messages": request.messages,
            "stream": request.stream,
            "options": {
                "temperature": request.temperature,
                "top_p": request.top_p,
                "top_k": request.top_k,
                "num_predict": request.max_tokens
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{settings.OLLAMA_API_URL}/chat",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=settings.OLLAMA_API_TIMEOUT)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Error from Ollama API: {error_text}"
                        )
                    
                    # Process streaming response
                    async for line in response.content:
                        if not line:
                            continue
                        
                        try:
                            line_data = json.loads(line)
                            if "message" in line_data and "content" in line_data["message"]:
                                content = line_data["message"]["content"]
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
        
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Ollama API: {str(e)}"
            )