"""
Ollama model integration for VNotions AI Engine
Provides local AI model support through Ollama.
"""

import asyncio
import json
from typing import Dict, List, Optional, AsyncGenerator
import httpx
import structlog

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


class OllamaModel(BaseModel):
    """Ollama model implementation."""
    
    def __init__(self, model_name: str, config: Optional[Dict] = None):
        super().__init__(model_name, config)
        self.base_url = config.get("base_url", "http://localhost:11434") if config else "http://localhost:11434"
        self.timeout = config.get("timeout", 300) if config else 300
        self._client: Optional[httpx.AsyncClient] = None
    
    def _get_provider(self) -> ModelProvider:
        return ModelProvider.OLLAMA
    
    async def initialize(self) -> bool:
        """Initialize Ollama model and check availability."""
        try:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout)
            )
            
            # Check if Ollama is running
            response = await self._client.get("/api/version")
            if response.status_code != 200:
                logger.error("Ollama server not responding", status_code=response.status_code)
                return False
            
            # Check if specific model exists
            models_response = await self._client.get("/api/tags")
            if models_response.status_code == 200:
                models_data = models_response.json()
                available_models = [model["name"] for model in models_data.get("models", [])]
                
                # Check exact match or with :latest tag
                model_available = (
                    self.model_name in available_models or
                    f"{self.model_name}:latest" in available_models or
                    any(model.startswith(f"{self.model_name}:") for model in available_models)
                )
                
                if model_available:
                    self._is_available = True
                    self._model_info = await self._get_model_info()
                    logger.info("Ollama model initialized", model=self.model_name)
                else:
                    logger.warning("Ollama model not found", 
                                 model=self.model_name, 
                                 available=available_models[:5])
            
            return self._is_available
            
        except Exception as e:
            logger.error("Failed to initialize Ollama model", model=self.model_name, error=str(e))
            return False
    
    async def _get_model_info(self) -> ModelInfo:
        """Get detailed model information."""
        try:
            # Try to get model details
            response = await self._client.post(
                "/api/show",
                json={"name": self.model_name}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract capabilities based on model name/type
                capabilities = self._infer_capabilities(self.model_name)
                
                return ModelInfo(
                    name=self.model_name,
                    provider=ModelProvider.OLLAMA,
                    capabilities=capabilities,
                    description=data.get("details", {}).get("family", "Ollama model"),
                    size=self._format_size(data.get("size", 0)),
                    context_length=self._extract_context_length(data),
                    is_available=True,
                    is_local=True
                )
        except Exception as e:
            logger.warning("Could not get model details", model=self.model_name, error=str(e))
        
        # Fallback model info
        return ModelInfo(
            name=self.model_name,
            provider=ModelProvider.OLLAMA,
            capabilities=self._infer_capabilities(self.model_name),
            description=f"Ollama model: {self.model_name}",
            is_available=True,
            is_local=True
        )
    
    def _infer_capabilities(self, model_name: str) -> List[ModelCapability]:
        """Infer model capabilities from name."""
        capabilities = [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT]
        
        if "code" in model_name.lower():
            capabilities.append(ModelCapability.CODE_GENERATION)
        
        if any(name in model_name.lower() for name in ["llama", "mistral", "neural-chat"]):
            capabilities.append(ModelCapability.REASONING)
            capabilities.append(ModelCapability.ANALYSIS)
        
        return capabilities
    
    def _format_size(self, size_bytes: int) -> str:
        """Format size in bytes to human readable."""
        if size_bytes < 1024**3:
            return f"{size_bytes / 1024**2:.1f}MB"
        else:
            return f"{size_bytes / 1024**3:.1f}GB"
    
    def _extract_context_length(self, model_data: Dict) -> Optional[int]:
        """Extract context length from model data."""
        template = model_data.get("template", "")
        if "4096" in template:
            return 4096
        elif "2048" in template:
            return 2048
        return None
    
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate text using Ollama."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        request_data = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": gen_config.max_tokens,
                "temperature": gen_config.temperature,
                "top_p": gen_config.top_p,
                "top_k": gen_config.top_k,
                "repeat_penalty": gen_config.repetition_penalty,
            }
        }
        
        if gen_config.stop_sequences:
            request_data["options"]["stop"] = gen_config.stop_sequences
        
        try:
            response = await self._client.post("/api/generate", json=request_data)
            response.raise_for_status()
            
            data = response.json()
            
            return GenerationResponse(
                text=data.get("response", ""),
                metadata={
                    "model": self.model_name,
                    "provider": "ollama",
                    "done": data.get("done", False)
                },
                usage={
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0)
                },
                finish_reason="stop" if data.get("done") else "length"
            )
            
        except httpx.HTTPStatusError as e:
            logger.error("Ollama generation failed", error=str(e), status=e.response.status_code)
            raise RuntimeError(f"Generation failed: {e}")
        except Exception as e:
            logger.error("Ollama generation error", error=str(e))
            raise RuntimeError(f"Generation error: {e}")
    
    async def chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> GenerationResponse:
        """Generate chat response using Ollama."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        # Convert messages to Ollama format
        ollama_messages = []
        for msg in messages:
            ollama_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        request_data = {
            "model": self.model_name,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "num_predict": gen_config.max_tokens,
                "temperature": gen_config.temperature,
                "top_p": gen_config.top_p,
                "top_k": gen_config.top_k,
                "repeat_penalty": gen_config.repetition_penalty,
            }
        }
        
        if gen_config.stop_sequences:
            request_data["options"]["stop"] = gen_config.stop_sequences
        
        try:
            response = await self._client.post("/api/chat", json=request_data)
            response.raise_for_status()
            
            data = response.json()
            message = data.get("message", {})
            
            return GenerationResponse(
                text=message.get("content", ""),
                metadata={
                    "model": self.model_name,
                    "provider": "ollama",
                    "role": message.get("role", "assistant"),
                    "done": data.get("done", False)
                },
                usage={
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0)
                },
                finish_reason="stop" if data.get("done") else "length"
            )
            
        except httpx.HTTPStatusError as e:
            logger.error("Ollama chat failed", error=str(e), status=e.response.status_code)
            raise RuntimeError(f"Chat failed: {e}")
        except Exception as e:
            logger.error("Ollama chat error", error=str(e))
            raise RuntimeError(f"Chat error: {e}")
    
    async def stream_generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream text generation from Ollama."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        request_data = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": True,
            "options": {
                "num_predict": gen_config.max_tokens,
                "temperature": gen_config.temperature,
                "top_p": gen_config.top_p,
                "top_k": gen_config.top_k,
                "repeat_penalty": gen_config.repetition_penalty,
            }
        }
        
        try:
            async with self._client.stream("POST", "/api/generate", json=request_data) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error("Ollama streaming failed", error=str(e))
            raise RuntimeError(f"Streaming failed: {e}")
    
    async def stream_chat(
        self,
        messages: List[ChatMessage],
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from Ollama."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        gen_config = config or GenerationConfig()
        
        ollama_messages = []
        for msg in messages:
            ollama_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        request_data = {
            "model": self.model_name,
            "messages": ollama_messages,
            "stream": True,
            "options": {
                "num_predict": gen_config.max_tokens,
                "temperature": gen_config.temperature,
                "top_p": gen_config.top_p,
                "top_k": gen_config.top_k,
                "repeat_penalty": gen_config.repetition_penalty,
            }
        }
        
        try:
            async with self._client.stream("POST", "/api/chat", json=request_data) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            message = data.get("message", {})
                            if "content" in message:
                                yield message["content"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error("Ollama chat streaming failed", error=str(e))
            raise RuntimeError(f"Chat streaming failed: {e}")
    
    async def embed(
        self,
        texts: List[str],
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using Ollama."""
        if not self._client or not self._is_available:
            raise RuntimeError("Model not initialized or unavailable")
        
        # Ollama embeddings require a specific embedding model
        # This is a placeholder - actual implementation would need embedding-capable models
        embeddings = []
        
        for text in texts:
            try:
                response = await self._client.post(
                    "/api/embeddings",
                    json={
                        "model": self.model_name,
                        "prompt": text
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    embeddings.append(data.get("embedding", []))
                else:
                    # Fallback: return zero vector
                    embeddings.append([0.0] * 384)  # Default dimension
                    
            except Exception as e:
                logger.warning("Embedding failed for text", error=str(e))
                embeddings.append([0.0] * 384)
        
        return EmbeddingResponse(
            embeddings=embeddings,
            metadata={
                "model": self.model_name,
                "provider": "ollama",
                "dimension": len(embeddings[0]) if embeddings else 0
            }
        )
    
    async def list_available_models(self) -> List[str]:
        """List all available Ollama models."""
        if not self._client:
            return []
        
        try:
            response = await self._client.get("/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            logger.error("Failed to list Ollama models", error=str(e))
        
        return []
    
    async def pull_model(self, model_name: Optional[str] = None) -> bool:
        """Pull/download a model in Ollama."""
        if not self._client:
            return False
        
        target_model = model_name or self.model_name
        
        try:
            response = await self._client.post(
                "/api/pull",
                json={"name": target_model}
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error("Failed to pull Ollama model", model=target_model, error=str(e))
            return False
    
    async def cleanup(self):
        """Cleanup Ollama model resources."""
        if self._client:
            await self._client.aclose()
            self._client = None