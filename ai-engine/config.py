"""
Configuration management for VNotions AI Engine
"""

import os
from typing import Optional, Dict, List
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server configuration
    host: str = Field(default="127.0.0.1", env="AI_ENGINE_HOST")
    port: int = Field(default=8000, env="AI_ENGINE_PORT")
    debug: bool = Field(default=False, env="AI_ENGINE_DEBUG")
    
    # Model providers
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    
    # Ollama configuration
    ollama_base_url: str = Field(default="http://localhost:11434", env="OLLAMA_BASE_URL")
    ollama_timeout: int = Field(default=300, env="OLLAMA_TIMEOUT")
    
    # Model configuration
    default_text_model: str = Field(default="llama2", env="DEFAULT_TEXT_MODEL")
    default_embedding_model: str = Field(default="all-MiniLM-L6-v2", env="DEFAULT_EMBEDDING_MODEL")
    
    # Performance settings
    max_concurrent_requests: int = Field(default=10, env="MAX_CONCURRENT_REQUESTS")
    request_timeout: int = Field(default=300, env="REQUEST_TIMEOUT")
    
    # Storage configuration
    models_dir: str = Field(default="./models", env="MODELS_DIR")
    cache_dir: str = Field(default="./cache", env="CACHE_DIR")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: Optional[str] = Field(default=None, env="LOG_FILE")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


class ModelConfig:
    """Model configuration templates."""
    
    OLLAMA_MODELS = {
        "llama2": {
            "name": "llama2",
            "size": "3.8GB",
            "description": "Llama 2 7B - General purpose model",
            "capabilities": ["text-generation", "chat"]
        },
        "llama2:13b": {
            "name": "llama2:13b",
            "size": "7.3GB", 
            "description": "Llama 2 13B - Larger, more capable model",
            "capabilities": ["text-generation", "chat"]
        },
        "codellama": {
            "name": "codellama",
            "size": "3.8GB",
            "description": "Code Llama 7B - Specialized for code generation",
            "capabilities": ["code-generation", "text-generation"]
        },
        "mistral": {
            "name": "mistral",
            "size": "4.1GB",
            "description": "Mistral 7B - Fast and efficient model",
            "capabilities": ["text-generation", "chat"]
        },
        "neural-chat": {
            "name": "neural-chat",
            "size": "4.1GB",
            "description": "Neural Chat 7B - Optimized for conversations",
            "capabilities": ["chat", "text-generation"]
        }
    }
    
    OPENAI_MODELS = {
        "gpt-3.5-turbo": {
            "name": "gpt-3.5-turbo",
            "description": "GPT-3.5 Turbo - Fast and cost-effective",
            "capabilities": ["chat", "text-generation"]
        },
        "gpt-4": {
            "name": "gpt-4",
            "description": "GPT-4 - Most capable model",
            "capabilities": ["chat", "text-generation", "reasoning"]
        },
        "gpt-4-turbo": {
            "name": "gpt-4-turbo-preview",
            "description": "GPT-4 Turbo - Latest and most capable",
            "capabilities": ["chat", "text-generation", "reasoning"]
        }
    }
    
    ANTHROPIC_MODELS = {
        "claude-3-haiku": {
            "name": "claude-3-haiku-20240307",
            "description": "Claude 3 Haiku - Fast and affordable",
            "capabilities": ["chat", "text-generation"]
        },
        "claude-3-sonnet": {
            "name": "claude-3-sonnet-20240229",
            "description": "Claude 3 Sonnet - Balanced performance",
            "capabilities": ["chat", "text-generation", "reasoning"]
        },
        "claude-3-opus": {
            "name": "claude-3-opus-20240229",
            "description": "Claude 3 Opus - Most capable model",
            "capabilities": ["chat", "text-generation", "reasoning"]
        }
    }
    
    EMBEDDING_MODELS = {
        "all-MiniLM-L6-v2": {
            "name": "all-MiniLM-L6-v2",
            "dimensions": 384,
            "description": "Lightweight sentence transformer",
            "provider": "sentence-transformers"
        },
        "all-mpnet-base-v2": {
            "name": "all-mpnet-base-v2", 
            "dimensions": 768,
            "description": "High quality sentence transformer",
            "provider": "sentence-transformers"
        },
        "text-embedding-ada-002": {
            "name": "text-embedding-ada-002",
            "dimensions": 1536,
            "description": "OpenAI's embedding model",
            "provider": "openai"
        }
    }


# Global settings instance
settings = Settings()


def get_model_config(provider: str, model_name: str) -> Optional[Dict]:
    """Get configuration for a specific model."""
    configs = {
        "ollama": ModelConfig.OLLAMA_MODELS,
        "openai": ModelConfig.OPENAI_MODELS,
        "anthropic": ModelConfig.ANTHROPIC_MODELS,
        "embedding": ModelConfig.EMBEDDING_MODELS
    }
    
    return configs.get(provider, {}).get(model_name)


def list_available_models() -> Dict[str, List[str]]:
    """List all available models by provider."""
    return {
        "ollama": list(ModelConfig.OLLAMA_MODELS.keys()),
        "openai": list(ModelConfig.OPENAI_MODELS.keys()),
        "anthropic": list(ModelConfig.ANTHROPIC_MODELS.keys()),
        "embedding": list(ModelConfig.EMBEDDING_MODELS.keys())
    }