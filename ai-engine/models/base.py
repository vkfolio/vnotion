"""
Base model interface for VNotions AI Engine
Defines the common interface for all AI model providers.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncGenerator
from enum import Enum
import asyncio
from pydantic import BaseModel


class ModelCapability(Enum):
    """Supported model capabilities."""
    TEXT_GENERATION = "text-generation"
    CHAT = "chat"
    CODE_GENERATION = "code-generation"
    EMBEDDING = "embedding"
    REASONING = "reasoning"
    ANALYSIS = "analysis"


class ModelProvider(Enum):
    """Supported model providers."""
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


class ModelInfo(BaseModel):
    """Model information structure."""
    name: str
    provider: ModelProvider
    capabilities: List[ModelCapability]
    description: Optional[str] = None
    size: Optional[str] = None
    context_length: Optional[int] = None
    is_available: bool = False
    is_local: bool = True


class GenerationConfig(BaseModel):
    """Configuration for text generation."""
    max_tokens: int = 1000
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    repetition_penalty: float = 1.1
    stop_sequences: List[str] = []
    stream: bool = False


class ChatMessage(BaseModel):
    """Chat message structure."""
    role: str  # "user", "assistant", "system"
    content: str
    metadata: Optional[Dict[str, Any]] = None


class GenerationResponse(BaseModel):
    """Response from text generation."""
    text: str
    metadata: Dict[str, Any] = {}
    usage: Optional[Dict[str, int]] = None
    finish_reason: Optional[str] = None


class EmbeddingResponse(BaseModel):
    """Response from embedding generation."""
    embeddings: List[List[float]]
    metadata: Dict[str, Any] = {}
    usage: Optional[Dict[str, int]] = None


class BaseModel(ABC):
    """Base class for all AI model implementations."""
    
    def __init__(self, model_name: str, config: Optional[Dict] = None):
        self.model_name = model_name
        self.config = config or {}
        self._is_available = False
        self._model_info: Optional[ModelInfo] = None
    
    @property
    def provider(self) -> ModelProvider:
        """Get the model provider type."""
        return self._get_provider()
    
    @property
    def is_available(self) -> bool:
        """Check if the model is available for use."""
        return self._is_available
    
    @property
    def model_info(self) -> Optional[ModelInfo]:
        """Get model information."""
        return self._model_info
    
    @abstractmethod
    def _get_provider(self) -> ModelProvider:
        """Get the provider type for this model."""
        pass
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the model and check availability."""
        pass
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate text from a prompt."""
        pass
    
    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate response in chat format."""
        pass
    
    async def stream_generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream text generation (optional implementation)."""
        # Default implementation: return full response at once
        response = await self.generate(prompt, config, **kwargs)
        yield response.text
    
    async def stream_chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream chat response (optional implementation)."""
        # Default implementation: return full response at once
        response = await self.chat(messages, config, **kwargs)
        yield response.text
    
    @abstractmethod
    async def embed(
        self,
        texts: List[str],
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings for texts."""
        pass
    
    async def health_check(self) -> Dict[str, Any]:
        """Check model health and availability."""
        try:
            # Simple test generation
            test_response = await self.generate(
                "Hello",
                GenerationConfig(max_tokens=10, temperature=0.1)
            )
            return {
                "status": "healthy",
                "model_name": self.model_name,
                "provider": self.provider.value,
                "test_successful": bool(test_response.text)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "model_name": self.model_name,
                "provider": self.provider.value,
                "error": str(e)
            }
    
    async def get_capabilities(self) -> List[ModelCapability]:
        """Get supported capabilities for this model."""
        if self._model_info:
            return self._model_info.capabilities
        return []
    
    def supports_capability(self, capability: ModelCapability) -> bool:
        """Check if model supports a specific capability."""
        if self._model_info:
            return capability in self._model_info.capabilities
        return False
    
    async def cleanup(self):
        """Cleanup model resources."""
        pass


class ModelFactory:
    """Factory for creating model instances."""
    
    _registry: Dict[ModelProvider, type] = {}
    
    @classmethod
    def register_provider(cls, provider: ModelProvider, model_class: type):
        """Register a model provider class."""
        cls._registry[provider] = model_class
    
    @classmethod
    def create_model(
        cls,
        provider: ModelProvider,
        model_name: str,
        config: Optional[Dict] = None
    ) -> BaseModel:
        """Create a model instance for the given provider."""
        if provider not in cls._registry:
            raise ValueError(f"Unsupported provider: {provider}")
        
        model_class = cls._registry[provider]
        return model_class(model_name, config)
    
    @classmethod
    def list_providers(cls) -> List[ModelProvider]:
        """List all registered providers."""
        return list(cls._registry.keys())


class ModelPool:
    """Pool for managing multiple model instances."""
    
    def __init__(self, max_models: int = 3):
        self.max_models = max_models
        self._models: Dict[str, BaseModel] = {}
        self._usage_count: Dict[str, int] = {}
        self._lock = asyncio.Lock()
    
    async def get_model(self, model_key: str) -> Optional[BaseModel]:
        """Get model from pool."""
        async with self._lock:
            if model_key in self._models:
                self._usage_count[model_key] += 1
                return self._models[model_key]
            return None
    
    async def add_model(self, model_key: str, model: BaseModel):
        """Add model to pool."""
        async with self._lock:
            # If pool is full, remove least used model
            if len(self._models) >= self.max_models:
                await self._evict_least_used()
            
            self._models[model_key] = model
            self._usage_count[model_key] = 0
    
    async def remove_model(self, model_key: str):
        """Remove model from pool."""
        async with self._lock:
            if model_key in self._models:
                model = self._models.pop(model_key)
                self._usage_count.pop(model_key, 0)
                await model.cleanup()
    
    async def _evict_least_used(self):
        """Evict the least used model from pool."""
        if not self._models:
            return
        
        least_used_key = min(self._usage_count, key=self._usage_count.get)
        await self.remove_model(least_used_key)
    
    async def cleanup_all(self):
        """Cleanup all models in pool."""
        async with self._lock:
            for model in self._models.values():
                await model.cleanup()
            self._models.clear()
            self._usage_count.clear()
    
    def list_models(self) -> List[str]:
        """List all models in pool."""
        return list(self._models.keys())