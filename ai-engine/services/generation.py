"""
Content Generation Service for VNotions AI Engine
Orchestrates text generation using LangGraph workflows.
"""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from models.base import BaseModel, GenerationConfig, ChatMessage
from utils.model_manager import ModelManager
from graphs.content_graph import ContentGenerationGraph
from graphs.database_graph import DatabaseQueryGraph

logger = structlog.get_logger()


class GenerationService:
    """Service for AI-powered content generation."""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.content_graph = ContentGenerationGraph(model_manager)
        self.database_graph = DatabaseQueryGraph(model_manager)
        self._initialized = False
    
    async def initialize(self):
        """Initialize the generation service."""
        if self._initialized:
            return
        
        await self.content_graph.initialize()
        await self.database_graph.initialize()
        self._initialized = True
        logger.info("Generation service initialized")
    
    async def generate(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate content using LangGraph workflow."""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Prepare generation config
            config = GenerationConfig(
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            # Use content generation graph
            result = await self.content_graph.generate_content(
                prompt=prompt,
                context=context,
                config=config,
                model_name=model,
                **kwargs
            )
            
            return {
                "content": result.get("content", ""),
                "metadata": result.get("metadata", {}),
                "usage": result.get("usage", {}),
                "workflow_trace": result.get("workflow_trace", [])
            }
            
        except Exception as e:
            logger.error("Content generation failed", error=str(e), prompt=prompt[:100])
            raise
    
    async def generate_with_refinement(
        self,
        prompt: str,
        context: Optional[str] = None,
        refinement_criteria: Optional[List[str]] = None,
        max_iterations: int = 3,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate content with iterative refinement."""
        try:
            if not self._initialized:
                await self.initialize()
            
            result = await self.content_graph.generate_with_refinement(
                prompt=prompt,
                context=context,
                refinement_criteria=refinement_criteria or [],
                max_iterations=max_iterations,
                model_name=model,
                **kwargs
            )
            
            return {
                "content": result.get("final_content", ""),
                "iterations": result.get("iterations", []),
                "metadata": result.get("metadata", {}),
                "workflow_trace": result.get("workflow_trace", [])
            }
            
        except Exception as e:
            logger.error("Refined generation failed", error=str(e))
            raise
    
    async def chat_generate(
        self,
        messages: List[ChatMessage],
        max_tokens: int = 1000,
        temperature: float = 0.7,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate response in chat format."""
        try:
            # Get appropriate model
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="chat"
            )
            
            if not target_model:
                raise RuntimeError("No suitable chat model available")
            
            config = GenerationConfig(
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            response = await target_model.chat(messages, config, **kwargs)
            
            return {
                "content": response.text,
                "metadata": response.metadata,
                "usage": response.usage,
                "model": target_model.model_name
            }
            
        except Exception as e:
            logger.error("Chat generation failed", error=str(e))
            raise
    
    async def generate_code(
        self,
        prompt: str,
        language: str = "python",
        context: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate code using specialized workflow."""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Enhance prompt for code generation
            code_prompt = f"""Generate {language} code for the following request:

{prompt}

Requirements:
- Write clean, well-documented code
- Include error handling where appropriate
- Follow {language} best practices
- Add comments explaining complex logic

{f"Additional context: {context}" if context else ""}

Please provide only the code, properly formatted."""
            
            result = await self.content_graph.generate_code(
                prompt=code_prompt,
                language=language,
                context=context,
                model_name=model,
                **kwargs
            )
            
            return {
                "code": result.get("code", ""),
                "language": language,
                "metadata": result.get("metadata", {}),
                "usage": result.get("usage", {}),
                "explanation": result.get("explanation", "")
            }
            
        except Exception as e:
            logger.error("Code generation failed", error=str(e))
            raise
    
    async def query_database(
        self,
        query: str,
        schema: Optional[Dict] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Process natural language database queries."""
        try:
            if not self._initialized:
                await self.initialize()
            
            result = await self.database_graph.process_query(
                query=query,
                schema=schema,
                model_name=model,
                **kwargs
            )
            
            return {
                "sql": result.get("sql", ""),
                "explanation": result.get("explanation", ""),
                "confidence": result.get("confidence", 0.0),
                "metadata": result.get("metadata", {}),
                "workflow_trace": result.get("workflow_trace", [])
            }
            
        except Exception as e:
            logger.error("Database query failed", error=str(e))
            raise
    
    async def summarize_content(
        self,
        content: str,
        summary_type: str = "paragraph",
        max_length: int = 200,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Summarize content with specified format."""
        try:
            if not self._initialized:
                await self.initialize()
            
            summary_prompts = {
                "paragraph": "Summarize the following content in a single paragraph:",
                "bullet_points": "Summarize the following content as bullet points:",
                "key_insights": "Extract key insights from the following content:",
                "abstract": "Write an abstract for the following content:"
            }
            
            prompt = summary_prompts.get(summary_type, summary_prompts["paragraph"])
            full_prompt = f"""{prompt}

{content}

Summary (max {max_length} words):"""
            
            result = await self.generate(
                prompt=full_prompt,
                max_tokens=max_length * 2,  # Rough token estimate
                temperature=0.3,  # Lower temperature for summaries
                model=model,
                **kwargs
            )
            
            return {
                "summary": result.get("content", ""),
                "summary_type": summary_type,
                "original_length": len(content.split()),
                "summary_length": len(result.get("content", "").split()),
                "metadata": result.get("metadata", {})
            }
            
        except Exception as e:
            logger.error("Content summarization failed", error=str(e))
            raise
    
    async def expand_outline(
        self,
        outline: str,
        target_length: int = 1000,
        writing_style: str = "professional",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Expand an outline into full content."""
        try:
            if not self._initialized:
                await self.initialize()
            
            style_prompts = {
                "professional": "in a professional, clear tone",
                "casual": "in a casual, conversational tone",
                "academic": "in an academic, scholarly tone",
                "creative": "in a creative, engaging tone"
            }
            
            style_instruction = style_prompts.get(writing_style, style_prompts["professional"])
            
            prompt = f"""Expand the following outline into a comprehensive piece of writing {style_instruction}.

Outline:
{outline}

Requirements:
- Target length: approximately {target_length} words
- Maintain logical flow and structure
- Include relevant details and examples
- Write clearly and coherently

Expanded content:"""
            
            result = await self.generate(
                prompt=prompt,
                max_tokens=target_length * 2,
                temperature=0.7,
                model=model,
                **kwargs
            )
            
            return {
                "expanded_content": result.get("content", ""),
                "writing_style": writing_style,
                "target_length": target_length,
                "actual_length": len(result.get("content", "").split()),
                "metadata": result.get("metadata", {})
            }
            
        except Exception as e:
            logger.error("Outline expansion failed", error=str(e))
            raise
    
    async def translate_content(
        self,
        content: str,
        target_language: str,
        source_language: str = "auto",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Translate content to target language."""
        try:
            if not self._initialized:
                await self.initialize()
            
            if source_language == "auto":
                prompt = f"""Translate the following content to {target_language}:

{content}

Translation:"""
            else:
                prompt = f"""Translate the following content from {source_language} to {target_language}:

{content}

Translation:"""
            
            result = await self.generate(
                prompt=prompt,
                max_tokens=len(content.split()) * 2,  # Account for language differences
                temperature=0.3,  # Lower temperature for accuracy
                model=model,
                **kwargs
            )
            
            return {
                "translation": result.get("content", ""),
                "target_language": target_language,
                "source_language": source_language,
                "metadata": result.get("metadata", {})
            }
            
        except Exception as e:
            logger.error("Content translation failed", error=str(e))
            raise
    
    async def get_generation_suggestions(
        self,
        partial_content: str,
        context: Optional[str] = None,
        suggestion_count: int = 3,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get suggestions for continuing content."""
        try:
            prompt = f"""Given the following partial content, provide {suggestion_count} different suggestions for how to continue:

Partial content:
{partial_content}

{f"Context: {context}" if context else ""}

Provide {suggestion_count} distinct continuation suggestions, each on a new line starting with a number:"""
            
            result = await self.generate(
                prompt=prompt,
                max_tokens=300,
                temperature=0.8,  # Higher temperature for variety
                model=model
            )
            
            # Parse suggestions from response
            suggestions = []
            lines = result.get("content", "").split("\n")
            for line in lines:
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith("-")):
                    # Remove numbering
                    suggestion = line.split(".", 1)[-1].strip()
                    if suggestion:
                        suggestions.append(suggestion)
            
            return {
                "suggestions": suggestions[:suggestion_count],
                "partial_content": partial_content,
                "metadata": result.get("metadata", {})
            }
            
        except Exception as e:
            logger.error("Generation suggestions failed", error=str(e))
            raise