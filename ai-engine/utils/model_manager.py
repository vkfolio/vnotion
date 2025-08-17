"""
Model Manager for VNotions AI Engine
Handles model lifecycle, selection, and fallback strategies.
"""

import asyncio
import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import structlog

from models.base import (
    BaseModel, ModelProvider, ModelCapability, ModelFactory, ModelPool,
    ModelInfo
)
from models.ollama import OllamaModel
from models.openai import OpenAIModel
from models.anthropic import AnthropicModel
from config import settings, get_model_config

logger = structlog.get_logger()


class ModelManager:
    """Manages AI models with automatic fallback and load balancing."""
    
    def __init__(self):
        self.model_pool = ModelPool(max_models=settings.max_concurrent_requests)
        self.provider_configs = {}
        self.model_capabilities: Dict[str, List[ModelCapability]] = {}
        self.installation_status: Dict[str, str] = {}
        self._lock = asyncio.Lock()
        self._initialized = False
        
        # Register model providers
        ModelFactory.register_provider(ModelProvider.OLLAMA, OllamaModel)
        ModelFactory.register_provider(ModelProvider.OPENAI, OpenAIModel)
        ModelFactory.register_provider(ModelProvider.ANTHROPIC, AnthropicModel)
    
    async def initialize(self):
        """Initialize the model manager."""
        if self._initialized:
            return
        
        async with self._lock:
            # Load provider configurations
            await self._load_provider_configs()
            
            # Initialize available models
            await self._discover_available_models()
            
            # Load default models
            await self._load_default_models()
            
            self._initialized = True
            logger.info("Model manager initialized", 
                       total_models=len(self.model_capabilities))
    
    async def get_model(
        self,
        model_name: Optional[str] = None,
        capability: Optional[Union[str, ModelCapability]] = None,
        provider: Optional[str] = None
    ) -> Optional[BaseModel]:
        """Get a model instance with fallback support."""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Convert capability string to enum if needed
            if isinstance(capability, str):
                capability = ModelCapability(capability)
            
            # Find suitable model
            target_model_name = await self._select_model(
                model_name=model_name,
                capability=capability,
                provider=provider
            )
            
            if not target_model_name:
                logger.warning("No suitable model found", 
                             requested_model=model_name,
                             capability=capability,
                             provider=provider)
                return None
            
            # Get model from pool or create new one
            model = await self.model_pool.get_model(target_model_name)
            if model:
                return model
            
            # Create new model instance
            model = await self._create_model_instance(target_model_name)
            if model and await model.initialize():
                await self.model_pool.add_model(target_model_name, model)
                return model
            
            # Try fallback models if primary fails
            fallback_models = await self._get_fallback_models(
                capability=capability,
                exclude=target_model_name
            )
            
            for fallback_name in fallback_models:
                try:
                    fallback_model = await self._create_model_instance(fallback_name)
                    if fallback_model and await fallback_model.initialize():
                        await self.model_pool.add_model(fallback_name, fallback_model)
                        logger.info("Using fallback model", 
                                   original=target_model_name,
                                   fallback=fallback_name)
                        return fallback_model
                except Exception as e:
                    logger.warning("Fallback model failed", 
                                 model=fallback_name, error=str(e))
                    continue
            
            return None
            
        except Exception as e:
            logger.error("Model retrieval failed", error=str(e))
            return None
    
    async def list_available_models(self) -> Dict[str, List[Dict[str, Any]]]:
        """List all available models by provider."""
        if not self._initialized:
            await self.initialize()
        
        result = {}
        
        for provider in ModelProvider:
            provider_name = provider.value
            result[provider_name] = []
            
            for model_name, capabilities in self.model_capabilities.items():
                model_provider = self._get_model_provider(model_name)
                if model_provider == provider:
                    model_info = await self._get_model_info(model_name)
                    result[provider_name].append({
                        "name": model_name,
                        "capabilities": [cap.value for cap in capabilities],
                        "available": model_info.is_available if model_info else False,
                        "description": model_info.description if model_info else "",
                        "size": model_info.size if model_info else None
                    })
        
        return result
    
    async def install_model(self, model_name: str, provider: str = "ollama"):
        """Install a model (mainly for Ollama models)."""
        try:
            self.installation_status[model_name] = "installing"
            
            if provider == "ollama":
                # Create Ollama model instance
                config = self.provider_configs.get("ollama", {})
                model = OllamaModel(model_name, config)
                
                # Try to pull the model
                if hasattr(model, 'pull_model'):
                    success = await model.pull_model()
                    if success:
                        self.installation_status[model_name] = "completed"
                        # Re-discover models to include newly installed
                        await self._discover_available_models()
                        logger.info("Model installed successfully", model=model_name)
                    else:
                        self.installation_status[model_name] = "failed"
                        logger.error("Model installation failed", model=model_name)
                else:
                    self.installation_status[model_name] = "failed"
            else:
                self.installation_status[model_name] = "not_supported"
                
        except Exception as e:
            self.installation_status[model_name] = "failed"
            logger.error("Model installation error", model=model_name, error=str(e))
    
    async def get_installation_status(self, model_name: str) -> str:
        """Get installation status of a model."""
        return self.installation_status.get(model_name, "not_found")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all loaded models."""
        if not self._initialized:
            await self.initialize()
        
        health_status = {
            "overall_status": "healthy",
            "models": {},
            "providers": {}
        }
        
        # Check loaded models
        for model_name in self.model_pool.list_models():
            model = await self.model_pool.get_model(model_name)
            if model:
                try:
                    model_health = await model.health_check()
                    health_status["models"][model_name] = model_health
                    
                    if model_health.get("status") != "healthy":
                        health_status["overall_status"] = "degraded"
                        
                except Exception as e:
                    health_status["models"][model_name] = {
                        "status": "error",
                        "error": str(e)
                    }
                    health_status["overall_status"] = "degraded"
        
        # Check provider availability
        for provider in ModelProvider:
            provider_name = provider.value
            provider_models = [
                name for name, caps in self.model_capabilities.items()
                if self._get_model_provider(name) == provider
            ]
            
            available_count = 0
            for model_name in provider_models:
                model_info = await self._get_model_info(model_name)
                if model_info and model_info.is_available:
                    available_count += 1
            
            health_status["providers"][provider_name] = {
                "total_models": len(provider_models),
                "available_models": available_count,
                "status": "healthy" if available_count > 0 else "unavailable"
            }
        
        return health_status
    
    async def cleanup(self):
        """Cleanup model manager resources."""
        await self.model_pool.cleanup_all()
        self._initialized = False
        logger.info("Model manager cleaned up")
    
    # Private methods
    
    async def _load_provider_configs(self):
        """Load configuration for each provider."""
        # Ollama configuration
        self.provider_configs["ollama"] = {
            "base_url": settings.ollama_base_url,
            "timeout": settings.ollama_timeout
        }
        
        # OpenAI configuration
        if settings.openai_api_key:
            self.provider_configs["openai"] = {
                "api_key": settings.openai_api_key,
                "timeout": settings.request_timeout
            }
        
        # Anthropic configuration
        if settings.anthropic_api_key:
            self.provider_configs["anthropic"] = {
                "api_key": settings.anthropic_api_key,
                "timeout": settings.request_timeout
            }
        
        logger.info("Provider configs loaded", 
                   providers=list(self.provider_configs.keys()))
    
    async def _discover_available_models(self):
        """Discover available models from all providers."""
        self.model_capabilities.clear()
        
        # Discover Ollama models
        if "ollama" in self.provider_configs:
            await self._discover_ollama_models()
        
        # Add OpenAI models if API key is available
        if "openai" in self.provider_configs:
            await self._discover_openai_models()
        
        # Add Anthropic models if API key is available
        if "anthropic" in self.provider_configs:
            await self._discover_anthropic_models()
        
        logger.info("Model discovery completed", 
                   total_models=len(self.model_capabilities))
    
    async def _discover_ollama_models(self):
        """Discover available Ollama models."""
        try:
            config = self.provider_configs["ollama"]
            temp_model = OllamaModel("temp", config)
            
            if await temp_model.initialize():
                available_models = await temp_model.list_available_models()
                
                for model_name in available_models:
                    # Infer capabilities based on model name
                    capabilities = self._infer_model_capabilities(model_name)
                    self.model_capabilities[model_name] = capabilities
                
                await temp_model.cleanup()
            
        except Exception as e:
            logger.warning("Ollama model discovery failed", error=str(e))
    
    async def _discover_openai_models(self):
        """Add known OpenAI models."""
        openai_models = {
            "gpt-3.5-turbo": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT],
            "gpt-4": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT, ModelCapability.REASONING],
            "gpt-4-turbo": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT, ModelCapability.REASONING],
            "text-embedding-ada-002": [ModelCapability.EMBEDDING]
        }
        
        for model_name, capabilities in openai_models.items():
            self.model_capabilities[model_name] = capabilities
    
    async def _discover_anthropic_models(self):
        """Add known Anthropic models."""
        anthropic_models = {
            "claude-3-haiku-20240307": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT],
            "claude-3-sonnet-20240229": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT, ModelCapability.REASONING],
            "claude-3-opus-20240229": [ModelCapability.TEXT_GENERATION, ModelCapability.CHAT, ModelCapability.REASONING]
        }
        
        for model_name, capabilities in anthropic_models.items():
            self.model_capabilities[model_name] = capabilities
    
    async def _load_default_models(self):
        """Pre-load default models for faster response."""
        try:
            # Load default text generation model
            default_model = await self.get_model(
                model_name=settings.default_text_model,
                capability=ModelCapability.TEXT_GENERATION
            )
            
            if default_model:
                logger.info("Default model loaded", model=default_model.model_name)
            
        except Exception as e:
            logger.warning("Failed to load default model", error=str(e))
    
    async def _select_model(
        self,
        model_name: Optional[str] = None,
        capability: Optional[ModelCapability] = None,
        provider: Optional[str] = None
    ) -> Optional[str]:
        """Select the best model based on criteria."""
        
        # If specific model requested, use it
        if model_name and model_name in self.model_capabilities:
            if capability:
                model_caps = self.model_capabilities[model_name]
                if capability in model_caps:
                    return model_name
                else:
                    logger.warning("Requested model doesn't support capability",
                                 model=model_name, capability=capability)
            else:
                return model_name
        
        # Find models by capability and provider
        candidates = []
        for name, capabilities in self.model_capabilities.items():
            # Check capability match
            if capability and capability not in capabilities:
                continue
            
            # Check provider match
            if provider and self._get_model_provider(name).value != provider:
                continue
            
            candidates.append(name)
        
        if not candidates:
            return None
        
        # Prioritize models based on preference
        return self._prioritize_models(candidates, capability)
    
    async def _get_fallback_models(
        self,
        capability: Optional[ModelCapability] = None,
        exclude: Optional[str] = None
    ) -> List[str]:
        """Get fallback models for a capability."""
        fallbacks = []
        
        for name, capabilities in self.model_capabilities.items():
            if name == exclude:
                continue
                
            if capability and capability not in capabilities:
                continue
            
            fallbacks.append(name)
        
        # Return prioritized fallbacks
        return self._prioritize_models(fallbacks, capability)[:3]  # Limit to 3 fallbacks
    
    def _prioritize_models(self, candidates: List[str], capability: Optional[ModelCapability]) -> List[str]:
        """Prioritize model candidates based on preference."""
        if not candidates:
            return []
        
        # Define priority order
        priority_map = {
            # Local models first for privacy
            "llama2": 10,
            "mistral": 9,
            "codellama": 8,
            "neural-chat": 7,
            
            # Cloud models
            "gpt-3.5-turbo": 6,
            "claude-3-haiku-20240307": 5,
            "gpt-4": 4,
            "claude-3-sonnet-20240229": 3,
            "claude-3-opus-20240229": 2,
            "gpt-4-turbo": 1
        }
        
        # Adjust priorities based on capability
        if capability == ModelCapability.CODE_GENERATION:
            priority_map["codellama"] = 15
            priority_map["gpt-4"] = 12
        elif capability == ModelCapability.EMBEDDING:
            priority_map["text-embedding-ada-002"] = 15
            priority_map["all-MiniLM-L6-v2"] = 12
        
        # Sort by priority (higher number = higher priority)
        def get_priority(model_name):
            return priority_map.get(model_name, 0)
        
        return sorted(candidates, key=get_priority, reverse=True)
    
    async def _create_model_instance(self, model_name: str) -> Optional[BaseModel]:
        """Create a model instance."""
        try:
            provider = self._get_model_provider(model_name)
            config = self.provider_configs.get(provider.value)
            
            if not config:
                logger.warning("No config for provider", provider=provider.value)
                return None
            
            model = ModelFactory.create_model(provider, model_name, config)
            return model
            
        except Exception as e:
            logger.error("Model instance creation failed", 
                        model=model_name, error=str(e))
            return None
    
    def _get_model_provider(self, model_name: str) -> ModelProvider:
        """Determine the provider for a model name."""
        if model_name.startswith("gpt-") or model_name.startswith("text-embedding"):
            return ModelProvider.OPENAI
        elif model_name.startswith("claude-"):
            return ModelProvider.ANTHROPIC
        else:
            return ModelProvider.OLLAMA  # Default to Ollama for local models
    
    def _infer_model_capabilities(self, model_name: str) -> List[ModelCapability]:
        """Infer capabilities from model name."""
        capabilities = [ModelCapability.TEXT_GENERATION]
        
        name_lower = model_name.lower()
        
        # Add chat capability for most models
        if not name_lower.startswith("text-embedding"):
            capabilities.append(ModelCapability.CHAT)
        
        # Code generation models
        if "code" in name_lower:
            capabilities.append(ModelCapability.CODE_GENERATION)
        
        # Reasoning models (larger or specialized)
        if any(term in name_lower for term in ["13b", "70b", "gpt-4", "claude-3"]):
            capabilities.append(ModelCapability.REASONING)
            capabilities.append(ModelCapability.ANALYSIS)
        
        # Embedding models
        if "embedding" in name_lower or "minilm" in name_lower:
            capabilities = [ModelCapability.EMBEDDING]
        
        return capabilities
    
    async def _get_model_info(self, model_name: str) -> Optional[ModelInfo]:
        """Get model information."""
        try:
            model = await self._create_model_instance(model_name)
            if model:
                await model.initialize()
                info = model.model_info
                await model.cleanup()
                return info
        except:
            pass
        
        return None