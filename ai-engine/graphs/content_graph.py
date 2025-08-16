"""
LangGraph Content Generation Workflow for VNotions AI Engine
Implements sophisticated content generation with refinement and quality control.
"""

import asyncio
from typing import Dict, List, Optional, Any, TypedDict
import structlog
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from models.base import BaseModel, GenerationConfig, ChatMessage
from utils.model_manager import ModelManager

logger = structlog.get_logger()


class ContentGenerationState(TypedDict):
    """State for content generation workflow."""
    prompt: str
    context: Optional[str]
    generated_content: str
    refinement_criteria: List[str]
    current_iteration: int
    max_iterations: int
    quality_score: float
    feedback: List[str]
    final_content: str
    metadata: Dict[str, Any]
    workflow_trace: List[Dict[str, Any]]


class ContentGenerationGraph:
    """LangGraph workflow for content generation with refinement."""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.graph: Optional[StateGraph] = None
        self.checkpointer = MemorySaver()
        self._initialized = False
    
    async def initialize(self):
        """Initialize the content generation graph."""
        if self._initialized:
            return
        
        # Build the workflow graph
        workflow = StateGraph(ContentGenerationState)
        
        # Add nodes
        workflow.add_node("generate_initial", self._generate_initial_content)
        workflow.add_node("evaluate_quality", self._evaluate_content_quality)
        workflow.add_node("generate_feedback", self._generate_feedback)
        workflow.add_node("refine_content", self._refine_content)
        workflow.add_node("finalize_content", self._finalize_content)
        
        # Define the workflow flow
        workflow.set_entry_point("generate_initial")
        
        workflow.add_edge("generate_initial", "evaluate_quality")
        
        # Conditional edge based on quality and iteration count
        workflow.add_conditional_edges(
            "evaluate_quality",
            self._should_refine,
            {
                "refine": "generate_feedback",
                "finalize": "finalize_content"
            }
        )
        
        workflow.add_edge("generate_feedback", "refine_content")
        workflow.add_edge("refine_content", "evaluate_quality")
        workflow.add_edge("finalize_content", END)
        
        # Compile the graph
        self.graph = workflow.compile(checkpointer=self.checkpointer)
        self._initialized = True
        logger.info("Content generation graph initialized")
    
    async def generate_content(
        self,
        prompt: str,
        context: Optional[str] = None,
        config: Optional[GenerationConfig] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate content using the workflow."""
        if not self._initialized:
            await self.initialize()
        
        initial_state: ContentGenerationState = {
            "prompt": prompt,
            "context": context,
            "generated_content": "",
            "refinement_criteria": [],
            "current_iteration": 0,
            "max_iterations": 1,  # Single generation
            "quality_score": 0.0,
            "feedback": [],
            "final_content": "",
            "metadata": {"config": config.__dict__ if config else {}, "model": model_name},
            "workflow_trace": []
        }
        
        # Execute workflow
        result = await self.graph.ainvoke(
            initial_state,
            config={"configurable": {"thread_id": f"content_{id(prompt)}"}}
        )
        
        return {
            "content": result["final_content"],
            "metadata": result["metadata"],
            "workflow_trace": result["workflow_trace"]
        }
    
    async def generate_with_refinement(
        self,
        prompt: str,
        context: Optional[str] = None,
        refinement_criteria: Optional[List[str]] = None,
        max_iterations: int = 3,
        model_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate content with iterative refinement."""
        if not self._initialized:
            await self.initialize()
        
        initial_state: ContentGenerationState = {
            "prompt": prompt,
            "context": context,
            "generated_content": "",
            "refinement_criteria": refinement_criteria or ["clarity", "coherence", "completeness"],
            "current_iteration": 0,
            "max_iterations": max_iterations,
            "quality_score": 0.0,
            "feedback": [],
            "final_content": "",
            "metadata": {"model": model_name, "max_iterations": max_iterations},
            "workflow_trace": []
        }
        
        # Execute workflow
        result = await self.graph.ainvoke(
            initial_state,
            config={"configurable": {"thread_id": f"refine_{id(prompt)}"}}
        )
        
        return {
            "final_content": result["final_content"],
            "iterations": result["current_iteration"],
            "quality_score": result["quality_score"],
            "metadata": result["metadata"],
            "workflow_trace": result["workflow_trace"]
        }
    
    async def generate_code(
        self,
        prompt: str,
        language: str,
        context: Optional[str] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate code with specialized workflow."""
        if not self._initialized:
            await self.initialize()
        
        # Enhance prompt for code generation
        code_criteria = [
            "syntax correctness",
            "code structure",
            "documentation quality",
            "error handling",
            "best practices"
        ]
        
        enhanced_prompt = f"""Generate {language} code for the following requirement:

{prompt}

{f"Additional context: {context}" if context else ""}

Requirements:
- Write clean, well-documented code
- Include error handling where appropriate
- Follow {language} best practices
- Add comments explaining complex logic"""
        
        initial_state: ContentGenerationState = {
            "prompt": enhanced_prompt,
            "context": context,
            "generated_content": "",
            "refinement_criteria": code_criteria,
            "current_iteration": 0,
            "max_iterations": 2,  # Allow one refinement for code
            "quality_score": 0.0,
            "feedback": [],
            "final_content": "",
            "metadata": {"language": language, "model": model_name, "type": "code"},
            "workflow_trace": []
        }
        
        result = await self.graph.ainvoke(
            initial_state,
            config={"configurable": {"thread_id": f"code_{id(prompt)}"}}
        )
        
        return {
            "code": result["final_content"],
            "language": language,
            "metadata": result["metadata"],
            "workflow_trace": result["workflow_trace"],
            "explanation": self._extract_code_explanation(result["final_content"])
        }
    
    # Workflow node implementations
    
    async def _generate_initial_content(self, state: ContentGenerationState) -> ContentGenerationState:
        """Generate initial content based on prompt."""
        try:
            # Get appropriate model
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="text-generation"
            )
            
            if not model:
                raise RuntimeError("No suitable model available for content generation")
            
            # Prepare messages
            messages = []
            if state["context"]:
                messages.append(ChatMessage(
                    role="system",
                    content=f"Context: {state['context']}"
                ))
            
            messages.append(ChatMessage(
                role="user",
                content=state["prompt"]
            ))
            
            # Generate content
            config = GenerationConfig(
                max_tokens=state["metadata"].get("config", {}).get("max_tokens", 1000),
                temperature=state["metadata"].get("config", {}).get("temperature", 0.7)
            )
            
            response = await model.chat(messages, config)
            
            # Update state
            state["generated_content"] = response.text
            state["current_iteration"] = 1
            state["workflow_trace"].append({
                "step": "generate_initial",
                "iteration": 1,
                "content_length": len(response.text),
                "model": model.model_name
            })
            
            return state
            
        except Exception as e:
            logger.error("Initial content generation failed", error=str(e))
            state["generated_content"] = f"Error generating content: {str(e)}"
            return state
    
    async def _evaluate_content_quality(self, state: ContentGenerationState) -> ContentGenerationState:
        """Evaluate the quality of generated content."""
        try:
            if not state["refinement_criteria"]:
                # No refinement criteria, assume good quality
                state["quality_score"] = 0.8
                state["workflow_trace"].append({
                    "step": "evaluate_quality",
                    "iteration": state["current_iteration"],
                    "quality_score": state["quality_score"],
                    "decision": "no_criteria"
                })
                return state
            
            # Get evaluation model
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="analysis"
            )
            
            if not model:
                # Fallback to simple evaluation
                state["quality_score"] = 0.7
                state["workflow_trace"].append({
                    "step": "evaluate_quality",
                    "iteration": state["current_iteration"],
                    "quality_score": state["quality_score"],
                    "decision": "no_evaluation_model"
                })
                return state
            
            # Create evaluation prompt
            criteria_text = ", ".join(state["refinement_criteria"])
            evaluation_prompt = f"""Evaluate the following content based on these criteria: {criteria_text}

Original prompt: {state['prompt']}

Generated content:
{state['generated_content']}

Please provide:
1. Overall quality score (0-10)
2. Assessment for each criterion
3. Specific areas for improvement

Evaluation:"""
            
            config = GenerationConfig(max_tokens=400, temperature=0.2)
            response = await model.generate(evaluation_prompt, config)
            
            # Extract quality score from response
            quality_score = self._extract_quality_score(response.text)
            state["quality_score"] = quality_score
            
            state["workflow_trace"].append({
                "step": "evaluate_quality",
                "iteration": state["current_iteration"],
                "quality_score": quality_score,
                "evaluation_text": response.text[:200]
            })
            
            return state
            
        except Exception as e:
            logger.error("Quality evaluation failed", error=str(e))
            state["quality_score"] = 0.5  # Default medium quality
            return state
    
    async def _generate_feedback(self, state: ContentGenerationState) -> ContentGenerationState:
        """Generate specific feedback for content improvement."""
        try:
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="analysis"
            )
            
            if not model:
                state["feedback"] = ["No feedback model available"]
                return state
            
            criteria_text = ", ".join(state["refinement_criteria"])
            feedback_prompt = f"""Provide specific, actionable feedback to improve the following content based on these criteria: {criteria_text}

Original prompt: {state['prompt']}
Current content:
{state['generated_content']}

Please provide:
1. Specific issues identified
2. Concrete suggestions for improvement
3. Areas that are working well

Focus on practical, actionable feedback:"""
            
            config = GenerationConfig(max_tokens=300, temperature=0.3)
            response = await model.generate(feedback_prompt, config)
            
            # Parse feedback into points
            feedback_points = self._parse_feedback(response.text)
            state["feedback"] = feedback_points
            
            state["workflow_trace"].append({
                "step": "generate_feedback",
                "iteration": state["current_iteration"],
                "feedback_count": len(feedback_points)
            })
            
            return state
            
        except Exception as e:
            logger.error("Feedback generation failed", error=str(e))
            state["feedback"] = ["Error generating feedback"]
            return state
    
    async def _refine_content(self, state: ContentGenerationState) -> ContentGenerationState:
        """Refine content based on feedback."""
        try:
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="text-generation"
            )
            
            if not model:
                # No refinement possible
                state["current_iteration"] += 1
                return state
            
            # Create refinement prompt
            feedback_text = "\n".join(f"- {fb}" for fb in state["feedback"])
            refinement_prompt = f"""Please refine the following content based on the provided feedback.

Original prompt: {state['prompt']}
Current content:
{state['generated_content']}

Feedback for improvement:
{feedback_text}

Please provide an improved version that addresses the feedback while maintaining the core message:"""
            
            config = GenerationConfig(
                max_tokens=state["metadata"].get("config", {}).get("max_tokens", 1000),
                temperature=0.6  # Slightly lower temperature for refinement
            )
            
            response = await model.generate(refinement_prompt, config)
            
            # Update content and iteration
            state["generated_content"] = response.text
            state["current_iteration"] += 1
            
            state["workflow_trace"].append({
                "step": "refine_content",
                "iteration": state["current_iteration"],
                "content_length": len(response.text),
                "feedback_applied": len(state["feedback"])
            })
            
            return state
            
        except Exception as e:
            logger.error("Content refinement failed", error=str(e))
            state["current_iteration"] += 1
            return state
    
    async def _finalize_content(self, state: ContentGenerationState) -> ContentGenerationState:
        """Finalize the content generation process."""
        state["final_content"] = state["generated_content"]
        
        state["workflow_trace"].append({
            "step": "finalize_content",
            "iteration": state["current_iteration"],
            "final_quality_score": state["quality_score"],
            "total_iterations": state["current_iteration"]
        })
        
        return state
    
    # Helper methods
    
    def _should_refine(self, state: ContentGenerationState) -> str:
        """Determine if content should be refined or finalized."""
        # Don't refine if we've reached max iterations
        if state["current_iteration"] >= state["max_iterations"]:
            return "finalize"
        
        # Don't refine if quality is already high
        if state["quality_score"] >= 0.8:
            return "finalize"
        
        # Don't refine if no refinement criteria
        if not state["refinement_criteria"]:
            return "finalize"
        
        # Refine if quality can be improved
        return "refine"
    
    def _extract_quality_score(self, evaluation_text: str) -> float:
        """Extract quality score from evaluation text."""
        import re
        
        # Look for patterns like "8/10", "8.5", "score: 7"
        patterns = [
            r'(\d+(?:\.\d+)?)/10',
            r'score:\s*(\d+(?:\.\d+)?)',
            r'(\d+(?:\.\d+)?)\s*out\s*of\s*10',
            r'quality:\s*(\d+(?:\.\d+)?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, evaluation_text.lower())
            if match:
                score = float(match.group(1))
                return min(score / 10.0, 1.0)  # Normalize to 0-1
        
        # Fallback: look for positive/negative words
        positive_words = ['excellent', 'good', 'great', 'strong', 'clear']
        negative_words = ['poor', 'weak', 'unclear', 'confusing', 'lacking']
        
        text_lower = evaluation_text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 0.7
        elif negative_count > positive_count:
            return 0.4
        else:
            return 0.6
    
    def _parse_feedback(self, feedback_text: str) -> List[str]:
        """Parse feedback text into actionable points."""
        lines = feedback_text.strip().split('\n')
        feedback_points = []
        
        for line in lines:
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('*') or line[0].isdigit()):
                # Remove list markers
                cleaned = re.sub(r'^[-\*\d+\.\)]\s*', '', line)
                if cleaned:
                    feedback_points.append(cleaned)
        
        return feedback_points[:5]  # Limit to 5 main points
    
    def _extract_code_explanation(self, code_content: str) -> str:
        """Extract explanation from generated code."""
        lines = code_content.split('\n')
        explanation_lines = []
        
        for line in lines:
            # Look for comment lines that explain what the code does
            if line.strip().startswith('#') or line.strip().startswith('//'):
                explanation_lines.append(line.strip())
        
        if explanation_lines:
            return '\n'.join(explanation_lines)
        else:
            return "Code generated without inline explanation."