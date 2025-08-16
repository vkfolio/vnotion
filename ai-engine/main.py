"""
VNotions AI Engine - FastAPI Application
A local-first AI service for content generation, analysis, and database queries.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import structlog
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from services.generation import GenerationService
from services.analysis import AnalysisService
from services.embeddings import EmbeddingsService
from utils.model_manager import ModelManager


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.iso_timestamp,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


# Pydantic models for API requests/responses
class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="The prompt for content generation")
    context: Optional[str] = Field(None, description="Additional context")
    max_tokens: Optional[int] = Field(1000, description="Maximum tokens to generate")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature")
    model: Optional[str] = Field(None, description="Specific model to use")


class AnalyzeRequest(BaseModel):
    content: str = Field(..., description="Content to analyze")
    analysis_type: str = Field("summary", description="Type of analysis to perform")
    model: Optional[str] = Field(None, description="Specific model to use")


class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query")
    schema: Optional[Dict] = Field(None, description="Database schema context")
    model: Optional[str] = Field(None, description="Specific model to use")


class EmbedRequest(BaseModel):
    text: str = Field(..., description="Text to embed")
    model: Optional[str] = Field(None, description="Specific embedding model to use")


class InstallModelRequest(BaseModel):
    model_name: str = Field(..., description="Name of the model to install")
    provider: str = Field("ollama", description="Model provider")


class APIResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    metadata: Optional[Dict] = None


# Global service instances
generation_service: Optional[GenerationService] = None
analysis_service: Optional[AnalysisService] = None
embeddings_service: Optional[EmbeddingsService] = None
model_manager: Optional[ModelManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    # Startup
    logger.info("Starting VNotions AI Engine")
    
    global generation_service, analysis_service, embeddings_service, model_manager
    
    try:
        # Initialize model manager
        model_manager = ModelManager()
        await model_manager.initialize()
        
        # Initialize services
        generation_service = GenerationService(model_manager)
        analysis_service = AnalysisService(model_manager)
        embeddings_service = EmbeddingsService(model_manager)
        
        logger.info("AI Engine services initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize AI Engine", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down VNotions AI Engine")
    if model_manager:
        await model_manager.cleanup()


# Create FastAPI app
app = FastAPI(
    title="VNotions AI Engine",
    description="Local-first AI service for knowledge management",
    version="1.0.0-alpha",
    lifespan=lifespan
)

# Configure CORS for Electron communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to Electron app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> APIResponse:
    """Health check endpoint."""
    return APIResponse(
        success=True,
        data={"status": "healthy", "version": "1.0.0-alpha"}
    )


@app.get("/models")
async def list_models() -> APIResponse:
    """List available AI models."""
    try:
        if not model_manager:
            raise HTTPException(status_code=503, detail="Model manager not initialized")
        
        models = await model_manager.list_available_models()
        return APIResponse(
            success=True,
            data={"models": models}
        )
    except Exception as e:
        logger.error("Failed to list models", error=str(e))
        return APIResponse(
            success=False,
            error=str(e)
        )


@app.post("/generate")
async def generate_content(request: GenerateRequest) -> APIResponse:
    """Generate content using AI models."""
    try:
        if not generation_service:
            raise HTTPException(status_code=503, detail="Generation service not initialized")
        
        result = await generation_service.generate(
            prompt=request.prompt,
            context=request.context,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            model=request.model
        )
        
        return APIResponse(
            success=True,
            data=result
        )
    except Exception as e:
        logger.error("Content generation failed", error=str(e), prompt=request.prompt[:100])
        return APIResponse(
            success=False,
            error=str(e)
        )


@app.post("/analyze")
async def analyze_content(request: AnalyzeRequest) -> APIResponse:
    """Analyze content using AI models."""
    try:
        if not analysis_service:
            raise HTTPException(status_code=503, detail="Analysis service not initialized")
        
        result = await analysis_service.analyze(
            content=request.content,
            analysis_type=request.analysis_type,
            model=request.model
        )
        
        return APIResponse(
            success=True,
            data=result
        )
    except Exception as e:
        logger.error("Content analysis failed", error=str(e), analysis_type=request.analysis_type)
        return APIResponse(
            success=False,
            error=str(e)
        )


@app.post("/query")
async def query_database(request: QueryRequest) -> APIResponse:
    """Process natural language database queries."""
    try:
        if not generation_service:
            raise HTTPException(status_code=503, detail="Generation service not initialized")
        
        # Use generation service with database query workflow
        result = await generation_service.query_database(
            query=request.query,
            schema=request.schema,
            model=request.model
        )
        
        return APIResponse(
            success=True,
            data=result
        )
    except Exception as e:
        logger.error("Database query failed", error=str(e), query=request.query[:100])
        return APIResponse(
            success=False,
            error=str(e)
        )


@app.post("/embed")
async def generate_embeddings(request: EmbedRequest) -> APIResponse:
    """Generate embeddings for text."""
    try:
        if not embeddings_service:
            raise HTTPException(status_code=503, detail="Embeddings service not initialized")
        
        result = await embeddings_service.embed(
            text=request.text,
            model=request.model
        )
        
        return APIResponse(
            success=True,
            data=result
        )
    except Exception as e:
        logger.error("Embedding generation failed", error=str(e), text_length=len(request.text))
        return APIResponse(
            success=False,
            error=str(e)
        )


@app.post("/install")
async def install_model(request: InstallModelRequest, background_tasks: BackgroundTasks) -> APIResponse:
    """Install a new AI model."""
    try:
        if not model_manager:
            raise HTTPException(status_code=503, detail="Model manager not initialized")
        
        # Start installation in background
        background_tasks.add_task(
            model_manager.install_model,
            request.model_name,
            request.provider
        )
        
        return APIResponse(
            success=True,
            data={"message": f"Installing {request.model_name} in background"}
        )
    except Exception as e:
        logger.error("Model installation failed", error=str(e), model=request.model_name)
        return APIResponse(
            success=False,
            error=str(e)
        )


@app.get("/install/status/{model_name}")
async def installation_status(model_name: str) -> APIResponse:
    """Check installation status of a model."""
    try:
        if not model_manager:
            raise HTTPException(status_code=503, detail="Model manager not initialized")
        
        status = await model_manager.get_installation_status(model_name)
        return APIResponse(
            success=True,
            data={"status": status}
        )
    except Exception as e:
        logger.error("Failed to get installation status", error=str(e), model=model_name)
        return APIResponse(
            success=False,
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_config=None  # Use our custom logging
    )