"""
OpenAI model integration for VNotions AI Engine
Provides cloud-based AI model support through OpenAI API.
"""

from typing import Dict, List, Optional, AsyncGenerator
import structlog
from openai import AsyncOpenAI

from .base import (
    BaseModel,
    ModelProvider,
    ModelCapability,
    ModelInfo,
    GenerationConfig,
    ChatMessage,
    GenerationResponse,
    EmbeddingResponse
)

logger = structlog.get_logger()


class OpenAIModel(BaseModel):
    """OpenAI model implementation."""
    
    def __init__(self, model_name: str, config: Optional[Dict] = None):
        super().__init__(model_name, config)
        self.api_key = config.get("api_key") if config else None
        self.timeout = config.get("timeout", 60) if config else 60
        self._client: Optional[AsyncOpenAI] = None
    
    def _get_provider(self) -> ModelProvider:
        return ModelProvider.OPENAI
    
    async def initialize(self) -> bool:
        """Initialize OpenAI model and check availability."""
        if not self.api_key:
            logger.warning("OpenAI API key not provided")
            return False
        
        try:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                timeout=self.timeout
            )
            
            # Test API connection
            models = await self._client.models.list()
            available_model_names = [model.id for model in models.data]
            
            if self.model_name in available_model_names:
                self._is_available = True
                self._model_info = self._get_model_info()
                logger.info("OpenAI model initialized", model=self.model_name)
            else:
                logger.warning("OpenAI model not available", 
                             model=self.model_name,
                             available=available_model_names[:5])
            
            return self._is_available
            
        except Exception as e:
            logger.error("Failed to initialize OpenAI model", model=self.model_name, error=str(e))
            return False
    
    def _get_model_info(self) -> ModelInfo:
        """Get OpenAI model information."""
        # Model info based on known OpenAI models
        model_configs = {
            "gpt-3.5-turbo": {
                "description": "GPT-3.5 Turbo - Fast and cost-effective",
                "context_length": 16385,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING
                ]
            },
            "gpt-4": {
                "description": "GPT-4 - Most capable model",
                "context_length": 8192,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS,
                    ModelCapability.CODE_GENERATION
                ]
            },
            "gpt-4-turbo": {
                "description": "GPT-4 Turbo - Latest and most capable",
                "context_length": 128000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS,
                    ModelCapability.CODE_GENERATION
                ]
            },
            "gpt-4-turbo-preview": {
                "description": "GPT-4 Turbo Preview - Latest preview model",
                "context_length": 128000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS,
                    ModelCapability.CODE_GENERATION
                ]
            },
            "text-embedding-ada-002": {
                "description": "OpenAI's embedding model",
                "context_length": 8191,
                "capabilities": [ModelCapability.EMBEDDING]
            }
        }
        
        config = model_configs.get(self.model_name, {
            "description": f"OpenAI model: {self.model_name}",
            "context_length": 4096,
            "capabilities": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT]
        })
        
        return ModelInfo(
            name=self.model_name,
            provider=ModelProvider.OPENAI,
            capabilities=config["capabilities"],
            description=config["description"],
            context_length=config["context_length"],
            is_available=True,
            is_local=False
        )
    
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate text using OpenAI."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        # Use chat completion for text generation
        messages = [{"role": "user", "content": prompt}]
        
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=gen_config.max_tokens,
                temperature=gen_config.temperature,
                top_p=gen_config.top_p,
                stop=gen_config.stop_sequences or None,
                stream=False
            )
            
            choice = response.choices[0]
            
            return GenerationResponse(
                text=choice.message.content or "",
                metadata={
                    "model": response.model,
                    "provider": "openai",
                    "created": response.created
                },
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                },
                finish_reason=choice.finish_reason
            )
            
        except Exception as e:
            logger.error("OpenAI generation failed", error=str(e))
            raise RuntimeError(f"Generation failed: {e}")
    
    async def chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate chat response using OpenAI."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        # Convert messages to OpenAI format
        openai_messages = []
        for msg in messages:
            openai_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=openai_messages,
                max_tokens=gen_config.max_tokens,
                temperature=gen_config.temperature,
                top_p=gen_config.top_p,
                stop=gen_config.stop_sequences or None,
                stream=False
            )
            
            choice = response.choices[0]
            
            return GenerationResponse(
                text=choice.message.content or "",
                metadata={
                    "model": response.model,
                    "provider": "openai",
                    "role": choice.message.role,
                    "created": response.created
                },
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                },
                finish_reason=choice.finish_reason
            )
            
        except Exception as e:
            logger.error("OpenAI chat failed", error=str(e))
            raise RuntimeError(f"Chat failed: {e}")
    
    async def stream_generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream text generation from OpenAI."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        messages = [{"role": "user", "content": prompt}]
        
        try:
            stream = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=gen_config.max_tokens,
                temperature=gen_config.temperature,
                top_p=gen_config.top_p,
                stop=gen_config.stop_sequences or None,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error("OpenAI streaming failed", error=str(e))
            raise RuntimeError(f"Streaming failed: {e}")
    
    async def stream_chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from OpenAI."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        openai_messages = []
        for msg in messages:
            openai_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        try:
            stream = await self._client.chat.completions.create(
                model=self.model_name,
                messages=openai_messages,
                max_tokens=gen_config.max_tokens,
                temperature=gen_config.temperature,
                top_p=gen_config.top_p,
                stop=gen_config.stop_sequences or None,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error("OpenAI chat streaming failed", error=str(e))
            raise RuntimeError(f"Chat streaming failed: {e}")
    
    async def embed(
        self,
        texts: List[str],
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using OpenAI."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        # Use appropriate embedding model
        embedding_model = "text-embedding-ada-002"
        if self.model_name.startswith("text-embedding"):
            embedding_model = self.model_name
        
        try:
            response = await self._client.embeddings.create(
                model=embedding_model,
                input=texts
            )
            
            embeddings = [data.embedding for data in response.data]
            
            return EmbeddingResponse(
                embeddings=embeddings,
                metadata={
                    "model": response.model,
                    "provider": "openai",
                    "dimension": len(embeddings[0]) if embeddings else 0
                },
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                }
            )
            
        except Exception as e:
            logger.error("OpenAI embedding failed", error=str(e))
            raise RuntimeError(f"Embedding failed: {e}")
    
    async def list_available_models(self) -> List[str]:
        """List available OpenAI models."""
        if not self._client:
            return []
        
        try:
            models = await self._client.models.list()
            return [model.id for model in models.data]
        except Exception as e:
            logger.error("Failed to list OpenAI models", error=str(e))
            return []
    
    async def cleanup(self):
        """Cleanup OpenAI model resources."""
        if self._client:
            await self._client.close()
            self._client = None