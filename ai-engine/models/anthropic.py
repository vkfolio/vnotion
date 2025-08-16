"""
Anthropic model integration for VNotions AI Engine
Provides cloud-based AI model support through Anthropic API.
"""

from typing import Dict, List, Optional, AsyncGenerator
import structlog
from anthropic import AsyncAnthropic

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


class AnthropicModel(BaseModel):
    """Anthropic model implementation."""
    
    def __init__(self, model_name: str, config: Optional[Dict] = None):
        super().__init__(model_name, config)
        self.api_key = config.get("api_key") if config else None
        self.timeout = config.get("timeout", 60) if config else 60
        self._client: Optional[AsyncAnthropic] = None
    
    def _get_provider(self) -> ModelProvider:
        return ModelProvider.ANTHROPIC
    
    async def initialize(self) -> bool:
        """Initialize Anthropic model and check availability."""
        if not self.api_key:
            logger.warning("Anthropic API key not provided")
            return False
        
        try:
            self._client = AsyncAnthropic(
                api_key=self.api_key,
                timeout=self.timeout
            )
            
            # Test model availability by checking known models
            known_models = [
                "claude-3-haiku-20240307",
                "claude-3-sonnet-20240229", 
                "claude-3-opus-20240229",
                "claude-2.1",
                "claude-2.0"
            ]
            
            if self.model_name in known_models:
                self._is_available = True
                self._model_info = self._get_model_info()
                logger.info("Anthropic model initialized", model=self.model_name)
            else:
                # Try to use model anyway - might be a newer model
                self._is_available = True
                self._model_info = self._get_model_info()
                logger.warning("Anthropic model not in known list, attempting to use", 
                             model=self.model_name)
            
            return self._is_available
            
        except Exception as e:
            logger.error("Failed to initialize Anthropic model", model=self.model_name, error=str(e))
            return False
    
    def _get_model_info(self) -> ModelInfo:
        """Get Anthropic model information."""
        # Model info based on known Anthropic models
        model_configs = {
            "claude-3-haiku-20240307": {
                "description": "Claude 3 Haiku - Fast and affordable",
                "context_length": 200000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS
                ]
            },
            "claude-3-sonnet-20240229": {
                "description": "Claude 3 Sonnet - Balanced performance",
                "context_length": 200000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS,
                    ModelCapability.CODE_GENERATION
                ]
            },
            "claude-3-opus-20240229": {
                "description": "Claude 3 Opus - Most capable model",
                "context_length": 200000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS,
                    ModelCapability.CODE_GENERATION
                ]
            },
            "claude-2.1": {
                "description": "Claude 2.1 - Previous generation model",
                "context_length": 200000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS
                ]
            },
            "claude-2.0": {
                "description": "Claude 2.0 - Previous generation model",
                "context_length": 100000,
                "capabilities": [
                    ModelCapability.TEXT_GENERATION,
                    ModelCapability.CHAT,
                    ModelCapability.REASONING,
                    ModelCapability.ANALYSIS
                ]
            }
        }
        
        config = model_configs.get(self.model_name, {
            "description": f"Anthropic model: {self.model_name}",
            "context_length": 100000,
            "capabilities": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT,
                ModelCapability.REASONING
            ]
        })
        
        return ModelInfo(
            name=self.model_name,
            provider=ModelProvider.ANTHROPIC,
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
        """Generate text using Anthropic."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        try:
            response = await self._client.messages.create(
                model=self.model_name,
                max_tokens=gen_config.max_tokens,
                temperature=gen_config.temperature,
                top_p=gen_config.top_p,
                stop_sequences=gen_config.stop_sequences or None,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract text from response content
            text_content = ""
            for content_block in response.content:
                if hasattr(content_block, 'text'):
                    text_content += content_block.text
            
            return GenerationResponse(
                text=text_content,
                metadata={
                    "model": response.model,
                    "provider": "anthropic",
                    "id": response.id,
                    "role": response.role
                },
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                },
                finish_reason=response.stop_reason
            )
            
        except Exception as e:
            logger.error("Anthropic generation failed", error=str(e))
            raise RuntimeError(f"Generation failed: {e}")
    
    async def chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate chat response using Anthropic."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        # Convert messages to Anthropic format
        anthropic_messages = []
        system_message = None
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                anthropic_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        try:
            kwargs = {
                "model": self.model_name,
                "max_tokens": gen_config.max_tokens,
                "temperature": gen_config.temperature,
                "top_p": gen_config.top_p,
                "messages": anthropic_messages
            }
            
            if system_message:
                kwargs["system"] = system_message
            
            if gen_config.stop_sequences:
                kwargs["stop_sequences"] = gen_config.stop_sequences
            
            response = await self._client.messages.create(**kwargs)
            
            # Extract text from response content
            text_content = ""
            for content_block in response.content:
                if hasattr(content_block, 'text'):
                    text_content += content_block.text
            
            return GenerationResponse(
                text=text_content,
                metadata={
                    "model": response.model,
                    "provider": "anthropic",
                    "id": response.id,
                    "role": response.role
                },
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                },
                finish_reason=response.stop_reason
            )
            
        except Exception as e:
            logger.error("Anthropic chat failed", error=str(e))
            raise RuntimeError(f"Chat failed: {e}")
    
    async def stream_generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream text generation from Anthropic."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        try:
            async with self._client.messages.stream(
                model=self.model_name,
                max_tokens=gen_config.max_tokens,
                temperature=gen_config.temperature,
                top_p=gen_config.top_p,
                stop_sequences=gen_config.stop_sequences or None,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            logger.error("Anthropic streaming failed", error=str(e))
            raise RuntimeError(f"Streaming failed: {e}")
    
    async def stream_chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from Anthropic."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        # Convert messages to Anthropic format
        anthropic_messages = []
        system_message = None
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                anthropic_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        try:
            kwargs = {
                "model": self.model_name,
                "max_tokens": gen_config.max_tokens,
                "temperature": gen_config.temperature,
                "top_p": gen_config.top_p,
                "messages": anthropic_messages
            }
            
            if system_message:
                kwargs["system"] = system_message
            
            if gen_config.stop_sequences:
                kwargs["stop_sequences"] = gen_config.stop_sequences
            
            async with self._client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            logger.error("Anthropic chat streaming failed", error=str(e))
            raise RuntimeError(f"Chat streaming failed: {e}")
    
    async def embed(
        self,
        texts: List[str],
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using Anthropic (not supported directly)."""
        # Anthropic doesn't provide embedding endpoints
        # This is a placeholder that would need to use another service
        logger.warning("Anthropic does not support embeddings directly")
        
        # Return empty embeddings as fallback
        embeddings = [[0.0] * 1536 for _ in texts]  # Standard embedding dimension
        
        return EmbeddingResponse(
            embeddings=embeddings,
            metadata={
                "model": self.model_name,
                "provider": "anthropic",
                "warning": "Embeddings not supported by Anthropic API",
                "dimension": 1536
            }
        )
    
    async def list_available_models(self) -> List[str]:
        """List available Anthropic models."""
        # Anthropic doesn't provide a models endpoint
        # Return known models
        return [
            "claude-3-haiku-20240307",
            "claude-3-sonnet-20240229",
            "claude-3-opus-20240229", 
            "claude-2.1",
            "claude-2.0"
        ]
    
    async def cleanup(self):
        """Cleanup Anthropic model resources."""
        if self._client:
            await self._client.close()
            self._client = None