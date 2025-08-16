"""
Content Analysis Service for VNotions AI Engine
Provides AI-powered content analysis and insights.
"""

import re
from typing import Dict, List, Optional, Any, Tuple
import structlog

from models.base import BaseModel, GenerationConfig
from utils.model_manager import ModelManager

logger = structlog.get_logger()


class AnalysisService:
    """Service for AI-powered content analysis."""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self._initialized = False
    
    async def initialize(self):
        """Initialize the analysis service."""
        if self._initialized:
            return
        
        self._initialized = True
        logger.info("Analysis service initialized")
    
    async def analyze(
        self,
        content: str,
        analysis_type: str = "summary",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Analyze content with specified analysis type."""
        try:
            if not self._initialized:
                await self.initialize()
            
            analysis_methods = {
                "summary": self.summarize,
                "sentiment": self.analyze_sentiment,
                "keywords": self.extract_keywords,
                "topics": self.extract_topics,
                "readability": self.analyze_readability,
                "structure": self.analyze_structure,
                "insights": self.extract_insights,
                "questions": self.generate_questions,
                "entities": self.extract_entities,
                "writing_style": self.analyze_writing_style
            }
            
            if analysis_type not in analysis_methods:
                raise ValueError(f"Unsupported analysis type: {analysis_type}")
            
            analysis_method = analysis_methods[analysis_type]
            result = await analysis_method(content, model=model, **kwargs)
            
            return {
                "analysis_type": analysis_type,
                "content_length": len(content),
                "word_count": len(content.split()),
                **result
            }
            
        except Exception as e:
            logger.error("Content analysis failed", error=str(e), analysis_type=analysis_type)
            raise
    
    async def summarize(
        self,
        content: str,
        summary_length: str = "medium",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate a summary of the content."""
        try:
            length_configs = {
                "short": {"max_tokens": 100, "instruction": "brief summary (1-2 sentences)"},
                "medium": {"max_tokens": 200, "instruction": "concise summary (1 paragraph)"},
                "long": {"max_tokens": 400, "instruction": "detailed summary (2-3 paragraphs)"}
            }
            
            config = length_configs.get(summary_length, length_configs["medium"])
            
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="text-generation"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for summarization")
            
            prompt = f"""Analyze and summarize the following content. Provide a {config['instruction']}:

Content:
{content}

Summary:"""
            
            gen_config = GenerationConfig(
                max_tokens=config["max_tokens"],
                temperature=0.3
            )
            
            response = await target_model.generate(prompt, gen_config)
            
            return {
                "summary": response.text.strip(),
                "summary_length": summary_length,
                "metadata": response.metadata,
                "usage": response.usage
            }
            
        except Exception as e:
            logger.error("Summarization failed", error=str(e))
            raise
    
    async def analyze_sentiment(
        self,
        content: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Analyze sentiment of the content."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for sentiment analysis")
            
            prompt = f"""Analyze the sentiment of the following content. Provide:
1. Overall sentiment (positive, negative, neutral)
2. Confidence score (0-1)
3. Key emotional indicators
4. Brief explanation

Content:
{content}

Analysis:"""
            
            gen_config = GenerationConfig(max_tokens=300, temperature=0.2)
            response = await target_model.generate(prompt, gen_config)
            
            # Extract sentiment information from response
            sentiment_text = response.text.strip()
            sentiment = self._extract_sentiment_from_response(sentiment_text)
            
            return {
                "sentiment": sentiment["sentiment"],
                "confidence": sentiment["confidence"],
                "emotional_indicators": sentiment["indicators"],
                "explanation": sentiment["explanation"],
                "raw_analysis": sentiment_text,
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Sentiment analysis failed", error=str(e))
            raise
    
    async def extract_keywords(
        self,
        content: str,
        max_keywords: int = 10,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Extract important keywords from content."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for keyword extraction")
            
            prompt = f"""Extract the {max_keywords} most important keywords from the following content. 
List them in order of importance, one per line:

Content:
{content}

Keywords:"""
            
            gen_config = GenerationConfig(max_tokens=200, temperature=0.2)
            response = await target_model.generate(prompt, gen_config)
            
            # Parse keywords from response
            keywords = []
            for line in response.text.strip().split('\n'):
                line = line.strip()
                if line:
                    # Remove numbering or bullet points
                    keyword = re.sub(r'^\d+[\.\)]\s*', '', line)
                    keyword = re.sub(r'^[-\*]\s*', '', keyword)
                    if keyword:
                        keywords.append(keyword)
            
            return {
                "keywords": keywords[:max_keywords],
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Keyword extraction failed", error=str(e))
            raise
    
    async def extract_topics(
        self,
        content: str,
        max_topics: int = 5,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Extract main topics from content."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for topic extraction")
            
            prompt = f"""Identify the {max_topics} main topics discussed in the following content.
For each topic, provide:
- Topic name
- Brief description
- Relevance (high/medium/low)

Content:
{content}

Topics:"""
            
            gen_config = GenerationConfig(max_tokens=400, temperature=0.3)
            response = await target_model.generate(prompt, gen_config)
            
            topics = self._parse_topics_from_response(response.text)
            
            return {
                "topics": topics[:max_topics],
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Topic extraction failed", error=str(e))
            raise
    
    async def analyze_readability(
        self,
        content: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Analyze content readability."""
        try:
            # Basic statistical analysis
            stats = self._calculate_basic_stats(content)
            
            # AI-powered readability analysis
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            ai_analysis = {}
            if target_model:
                prompt = f"""Analyze the readability of the following content. Consider:
1. Reading level (elementary, middle school, high school, college, graduate)
2. Clarity and comprehension
3. Sentence complexity
4. Vocabulary difficulty
5. Suggestions for improvement

Content:
{content}

Readability Analysis:"""
                
                gen_config = GenerationConfig(max_tokens=300, temperature=0.2)
                response = await target_model.generate(prompt, gen_config)
                ai_analysis = {"ai_assessment": response.text.strip()}
            
            return {
                **stats,
                **ai_analysis,
                "readability_score": self._calculate_readability_score(stats)
            }
            
        except Exception as e:
            logger.error("Readability analysis failed", error=str(e))
            raise
    
    async def analyze_structure(
        self,
        content: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Analyze content structure and organization."""
        try:
            # Basic structure analysis
            structure = self._analyze_basic_structure(content)
            
            # AI-powered structure analysis
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            ai_analysis = {}
            if target_model:
                prompt = f"""Analyze the structure and organization of the following content:
1. Overall structure (introduction, body, conclusion)
2. Logical flow and coherence
3. Use of headings and sections
4. Paragraph organization
5. Suggestions for better structure

Content:
{content}

Structure Analysis:"""
                
                gen_config = GenerationConfig(max_tokens=400, temperature=0.3)
                response = await target_model.generate(prompt, gen_config)
                ai_analysis = {"ai_assessment": response.text.strip()}
            
            return {
                **structure,
                **ai_analysis
            }
            
        except Exception as e:
            logger.error("Structure analysis failed", error=str(e))
            raise
    
    async def extract_insights(
        self,
        content: str,
        insight_count: int = 5,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Extract key insights from content."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="reasoning"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for insight extraction")
            
            prompt = f"""Extract {insight_count} key insights from the following content.
For each insight, provide:
- The insight statement
- Supporting evidence from the text
- Implications or significance

Content:
{content}

Key Insights:"""
            
            gen_config = GenerationConfig(max_tokens=500, temperature=0.3)
            response = await target_model.generate(prompt, gen_config)
            
            insights = self._parse_insights_from_response(response.text)
            
            return {
                "insights": insights[:insight_count],
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Insight extraction failed", error=str(e))
            raise
    
    async def generate_questions(
        self,
        content: str,
        question_count: int = 5,
        question_type: str = "comprehension",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate questions based on content."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="text-generation"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for question generation")
            
            question_types = {
                "comprehension": "comprehension questions that test understanding",
                "critical": "critical thinking questions that encourage analysis",
                "discussion": "discussion questions that promote deeper conversation",
                "review": "review questions that test key points"
            }
            
            question_description = question_types.get(question_type, question_types["comprehension"])
            
            prompt = f"""Generate {question_count} {question_description} based on the following content:

Content:
{content}

Questions:"""
            
            gen_config = GenerationConfig(max_tokens=300, temperature=0.4)
            response = await target_model.generate(prompt, gen_config)
            
            questions = []
            for line in response.text.strip().split('\n'):
                line = line.strip()
                if line and ('?' in line or line.endswith('?')):
                    # Remove numbering
                    question = re.sub(r'^\d+[\.\)]\s*', '', line)
                    questions.append(question)
            
            return {
                "questions": questions[:question_count],
                "question_type": question_type,
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Question generation failed", error=str(e))
            raise
    
    async def extract_entities(
        self,
        content: str,
        entity_types: Optional[List[str]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Extract named entities from content."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for entity extraction")
            
            entity_types = entity_types or ["person", "organization", "location", "date", "event"]
            entity_list = ", ".join(entity_types)
            
            prompt = f"""Extract named entities from the following content. 
Focus on these types: {entity_list}

For each entity, provide:
- Entity name
- Type
- Context where it appears

Content:
{content}

Named Entities:"""
            
            gen_config = GenerationConfig(max_tokens=400, temperature=0.2)
            response = await target_model.generate(prompt, gen_config)
            
            entities = self._parse_entities_from_response(response.text)
            
            return {
                "entities": entities,
                "entity_types": entity_types,
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Entity extraction failed", error=str(e))
            raise
    
    async def analyze_writing_style(
        self,
        content: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Analyze writing style and tone."""
        try:
            target_model = await self.model_manager.get_model(
                model_name=model,
                capability="analysis"
            )
            
            if not target_model:
                raise RuntimeError("No suitable model available for style analysis")
            
            prompt = f"""Analyze the writing style and tone of the following content:
1. Tone (formal, informal, academic, conversational, etc.)
2. Voice (active vs passive)
3. Perspective (first, second, third person)
4. Vocabulary level
5. Sentence structure patterns
6. Overall writing style characteristics

Content:
{content}

Writing Style Analysis:"""
            
            gen_config = GenerationConfig(max_tokens=400, temperature=0.3)
            response = await target_model.generate(prompt, gen_config)
            
            # Basic statistical analysis
            style_stats = self._calculate_style_stats(content)
            
            return {
                "ai_analysis": response.text.strip(),
                **style_stats,
                "metadata": response.metadata
            }
            
        except Exception as e:
            logger.error("Style analysis failed", error=str(e))
            raise
    
    # Helper methods for parsing and analysis
    
    def _extract_sentiment_from_response(self, response: str) -> Dict[str, Any]:
        """Extract sentiment information from AI response."""
        sentiment = "neutral"
        confidence = 0.5
        indicators = []
        explanation = response
        
        # Simple pattern matching (could be improved with more sophisticated parsing)
        if "positive" in response.lower():
            sentiment = "positive"
            confidence = 0.7
        elif "negative" in response.lower():
            sentiment = "negative"
            confidence = 0.7
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "indicators": indicators,
            "explanation": explanation
        }
    
    def _parse_topics_from_response(self, response: str) -> List[Dict[str, str]]:
        """Parse topics from AI response."""
        topics = []
        lines = response.strip().split('\n')
        
        current_topic = {}
        for line in lines:
            line = line.strip()
            if line:
                # Simple parsing - could be improved
                if "Topic" in line or line.startswith(str(len(topics) + 1)):
                    if current_topic:
                        topics.append(current_topic)
                    current_topic = {"name": line, "description": "", "relevance": "medium"}
                elif current_topic:
                    current_topic["description"] += " " + line
        
        if current_topic:
            topics.append(current_topic)
        
        return topics
    
    def _calculate_basic_stats(self, content: str) -> Dict[str, Any]:
        """Calculate basic text statistics."""
        words = content.split()
        sentences = re.split(r'[.!?]+', content)
        paragraphs = content.split('\n\n')
        
        return {
            "word_count": len(words),
            "sentence_count": len([s for s in sentences if s.strip()]),
            "paragraph_count": len([p for p in paragraphs if p.strip()]),
            "avg_words_per_sentence": len(words) / max(len(sentences), 1),
            "avg_sentences_per_paragraph": len(sentences) / max(len(paragraphs), 1)
        }
    
    def _calculate_readability_score(self, stats: Dict[str, Any]) -> float:
        """Calculate a simple readability score."""
        # Simplified readability calculation
        avg_words = stats.get("avg_words_per_sentence", 15)
        
        if avg_words < 10:
            return 0.9  # Very easy
        elif avg_words < 15:
            return 0.7  # Easy
        elif avg_words < 20:
            return 0.5  # Medium
        elif avg_words < 25:
            return 0.3  # Hard
        else:
            return 0.1  # Very hard
    
    def _analyze_basic_structure(self, content: str) -> Dict[str, Any]:
        """Analyze basic document structure."""
        lines = content.split('\n')
        
        headings = []
        for line in lines:
            line = line.strip()
            if line and (line.isupper() or line.startswith('#') or len(line.split()) < 10):
                headings.append(line)
        
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        return {
            "heading_count": len(headings),
            "headings": headings[:5],  # First 5 headings
            "paragraph_count": len(paragraphs),
            "has_introduction": len(paragraphs) > 0,
            "has_conclusion": len(paragraphs) > 2
        }
    
    def _parse_insights_from_response(self, response: str) -> List[Dict[str, str]]:
        """Parse insights from AI response."""
        insights = []
        lines = response.strip().split('\n')
        
        current_insight = {}
        for line in lines:
            line = line.strip()
            if line and (line.startswith(str(len(insights) + 1)) or "Insight" in line):
                if current_insight:
                    insights.append(current_insight)
                current_insight = {"statement": line, "evidence": "", "implications": ""}
            elif line and current_insight:
                if "evidence" in line.lower():
                    current_insight["evidence"] = line
                elif "implication" in line.lower():
                    current_insight["implications"] = line
                else:
                    current_insight["statement"] += " " + line
        
        if current_insight:
            insights.append(current_insight)
        
        return insights
    
    def _parse_entities_from_response(self, response: str) -> List[Dict[str, str]]:
        """Parse entities from AI response."""
        entities = []
        lines = response.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line and ':' in line:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    name = parts[0].strip()
                    details = parts[1].strip()
                    entities.append({
                        "name": name,
                        "type": "unknown",
                        "context": details
                    })
        
        return entities
    
    def _calculate_style_stats(self, content: str) -> Dict[str, Any]:
        """Calculate writing style statistics."""
        sentences = re.split(r'[.!?]+', content)
        words = content.split()
        
        # Count passive voice indicators (simplified)
        passive_indicators = ["was", "were", "been", "being", "is", "are"]
        passive_count = sum(1 for word in words if word.lower() in passive_indicators)
        
        # Count first/second/third person
        first_person = sum(1 for word in words if word.lower() in ["i", "me", "my", "we", "us", "our"])
        second_person = sum(1 for word in words if word.lower() in ["you", "your", "yours"])
        third_person = sum(1 for word in words if word.lower() in ["he", "she", "it", "they", "them", "their"])
        
        return {
            "passive_voice_ratio": passive_count / max(len(words), 1),
            "first_person_count": first_person,
            "second_person_count": second_person,
            "third_person_count": third_person,
            "average_sentence_length": len(words) / max(len(sentences), 1)
        }