"""
LangGraph Database Query Workflow for VNotions AI Engine
Implements natural language to SQL conversion with validation and safety checks.
"""

import re
import asyncio
from typing import Dict, List, Optional, Any, TypedDict
import structlog
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from models.base import BaseModel, GenerationConfig, ChatMessage
from utils.model_manager import ModelManager

logger = structlog.get_logger()


class DatabaseQueryState(TypedDict):
    """State for database query workflow."""
    natural_query: str
    schema_info: Optional[Dict[str, Any]]
    generated_sql: str
    sql_explanation: str
    validation_results: Dict[str, Any]
    safety_checks: Dict[str, Any]
    confidence_score: float
    alternative_queries: List[str]
    metadata: Dict[str, Any]
    workflow_trace: List[Dict[str, Any]]


class DatabaseQueryGraph:
    """LangGraph workflow for natural language to SQL conversion."""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.graph: Optional[StateGraph] = None
        self.checkpointer = MemorySaver()
        self._initialized = False
        
        # SQL safety patterns to avoid
        self.dangerous_patterns = [
            r'drop\s+table',
            r'drop\s+database',
            r'delete\s+from\s+\w+\s*(?:;|$)',  # DELETE without WHERE
            r'truncate\s+table',
            r'alter\s+table',
            r'create\s+table',
            r'insert\s+into',
            r'update\s+\w+\s+set\s+.*(?:;|$)',  # UPDATE without WHERE
            r'grant\s+',
            r'revoke\s+',
            r'exec\s*\(',
            r'sp_\w+',  # Stored procedures
            r'xp_\w+',  # Extended procedures
        ]
    
    async def initialize(self):
        """Initialize the database query graph."""
        if self._initialized:
            return
        
        # Build the workflow graph
        workflow = StateGraph(DatabaseQueryState)
        
        # Add nodes
        workflow.add_node("analyze_query", self._analyze_natural_query)
        workflow.add_node("generate_sql", self._generate_sql_query)
        workflow.add_node("validate_sql", self._validate_sql_syntax)
        workflow.add_node("safety_check", self._perform_safety_checks)
        workflow.add_node("explain_sql", self._explain_sql_query)
        workflow.add_node("generate_alternatives", self._generate_alternative_queries)
        workflow.add_node("finalize_result", self._finalize_query_result)
        
        # Define the workflow flow
        workflow.set_entry_point("analyze_query")
        
        workflow.add_edge("analyze_query", "generate_sql")
        workflow.add_edge("generate_sql", "validate_sql")
        workflow.add_edge("validate_sql", "safety_check")
        
        # Conditional edge based on safety checks
        workflow.add_conditional_edges(
            "safety_check",
            self._is_query_safe,
            {
                "safe": "explain_sql",
                "unsafe": "finalize_result"  # Skip explanation for unsafe queries
            }
        )
        
        workflow.add_edge("explain_sql", "generate_alternatives")
        workflow.add_edge("generate_alternatives", "finalize_result")
        workflow.add_edge("finalize_result", END)
        
        # Compile the graph
        self.graph = workflow.compile(checkpointer=self.checkpointer)
        self._initialized = True
        logger.info("Database query graph initialized")
    
    async def process_query(
        self,
        query: str,
        schema: Optional[Dict] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Process natural language database query."""
        if not self._initialized:
            await self.initialize()
        
        initial_state: DatabaseQueryState = {
            "natural_query": query,
            "schema_info": schema,
            "generated_sql": "",
            "sql_explanation": "",
            "validation_results": {},
            "safety_checks": {},
            "confidence_score": 0.0,
            "alternative_queries": [],
            "metadata": {"model": model_name, "schema_provided": bool(schema)},
            "workflow_trace": []
        }
        
        # Execute workflow
        result = await self.graph.ainvoke(
            initial_state,
            config={"configurable": {"thread_id": f"query_{id(query)}"}}
        )
        
        return {
            "sql": result["generated_sql"],
            "explanation": result["sql_explanation"],
            "confidence": result["confidence_score"],
            "safety_checks": result["safety_checks"],
            "alternative_queries": result["alternative_queries"],
            "metadata": result["metadata"],
            "workflow_trace": result["workflow_trace"]
        }
    
    # Workflow node implementations
    
    async def _analyze_natural_query(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Analyze the natural language query to understand intent."""
        try:
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="reasoning"
            )
            
            if not model:
                state["workflow_trace"].append({
                    "step": "analyze_query",
                    "status": "error",
                    "error": "No suitable model available"
                })
                return state
            
            analysis_prompt = f"""Analyze the following natural language database query and identify:
1. Query type (SELECT, INSERT, UPDATE, DELETE, etc.)
2. Main entities/tables involved
3. Conditions and filters
4. Required columns or data
5. Any aggregations or grouping needed
6. Complexity level (simple, medium, complex)

Natural language query: "{state['natural_query']}"

{f"Available schema information: {state['schema_info']}" if state['schema_info'] else "No schema information provided."}

Analysis:"""
            
            config = GenerationConfig(max_tokens=300, temperature=0.2)
            response = await model.generate(analysis_prompt, config)
            
            # Extract query type and complexity
            analysis_text = response.text.lower()
            query_type = self._extract_query_type(analysis_text)
            complexity = self._extract_complexity(analysis_text)
            
            state["metadata"].update({
                "query_type": query_type,
                "complexity": complexity,
                "analysis": response.text
            })
            
            state["workflow_trace"].append({
                "step": "analyze_query",
                "status": "success",
                "query_type": query_type,
                "complexity": complexity
            })
            
            return state
            
        except Exception as e:
            logger.error("Query analysis failed", error=str(e))
            state["workflow_trace"].append({
                "step": "analyze_query",
                "status": "error",
                "error": str(e)
            })
            return state
    
    async def _generate_sql_query(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Generate SQL query from natural language."""
        try:
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="code-generation"
            )
            
            if not model:
                # Fallback to general model
                model = await self.model_manager.get_model(
                    model_name=state["metadata"].get("model"),
                    capability="text-generation"
                )
            
            if not model:
                state["generated_sql"] = "-- Error: No suitable model available"
                return state
            
            # Build SQL generation prompt
            schema_context = ""
            if state["schema_info"]:
                schema_context = f"""
Database Schema:
{self._format_schema_info(state['schema_info'])}
"""
            
            sql_prompt = f"""Convert the following natural language query to SQL.

{schema_context}
Natural language query: "{state['natural_query']}"

Requirements:
- Generate valid SQL syntax
- Use proper table and column names from the schema
- Include appropriate WHERE clauses for filtering
- Add comments to explain complex parts
- Ensure the query is safe and follows best practices

SQL Query:"""
            
            config = GenerationConfig(max_tokens=400, temperature=0.1)
            response = await model.generate(sql_prompt, config)
            
            # Clean and extract SQL
            sql_query = self._extract_sql_from_response(response.text)
            state["generated_sql"] = sql_query
            
            state["workflow_trace"].append({
                "step": "generate_sql",
                "status": "success",
                "sql_length": len(sql_query),
                "model": model.model_name
            })
            
            return state
            
        except Exception as e:
            logger.error("SQL generation failed", error=str(e))
            state["generated_sql"] = f"-- Error generating SQL: {str(e)}"
            state["workflow_trace"].append({
                "step": "generate_sql",
                "status": "error",
                "error": str(e)
            })
            return state
    
    async def _validate_sql_syntax(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Validate SQL syntax and structure."""
        try:
            sql = state["generated_sql"]
            validation_results = {
                "is_valid": True,
                "errors": [],
                "warnings": [],
                "suggestions": []
            }
            
            # Basic syntax validation
            if not sql or sql.strip().startswith("--"):
                validation_results["is_valid"] = False
                validation_results["errors"].append("No valid SQL generated")
            
            # Check for common SQL patterns
            sql_lower = sql.lower().strip()
            
            # Must start with a valid SQL keyword
            valid_starts = ['select', 'insert', 'update', 'delete', 'with', 'create', 'alter', 'drop']
            if not any(sql_lower.startswith(keyword) for keyword in valid_starts):
                validation_results["warnings"].append("SQL doesn't start with recognized keyword")
            
            # Check for balanced parentheses
            if sql.count('(') != sql.count(')'):
                validation_results["errors"].append("Unbalanced parentheses")
                validation_results["is_valid"] = False
            
            # Check for semicolon at end (optional but good practice)
            if not sql_lower.rstrip().endswith(';'):
                validation_results["suggestions"].append("Consider adding semicolon at end")
            
            # Check for SQL injection patterns
            injection_patterns = [
                r"'.*?'.*?(or|and).*?'.*?'",  # Basic injection pattern
                r"union\s+select",
                r"drop\s+table",
                r"exec\s*\(",
            ]
            
            for pattern in injection_patterns:
                if re.search(pattern, sql_lower):
                    validation_results["warnings"].append(f"Potential security concern: {pattern}")
            
            state["validation_results"] = validation_results
            
            state["workflow_trace"].append({
                "step": "validate_sql",
                "status": "success" if validation_results["is_valid"] else "warning",
                "errors": len(validation_results["errors"]),
                "warnings": len(validation_results["warnings"])
            })
            
            return state
            
        except Exception as e:
            logger.error("SQL validation failed", error=str(e))
            state["validation_results"] = {
                "is_valid": False,
                "errors": [f"Validation error: {str(e)}"],
                "warnings": [],
                "suggestions": []
            }
            return state
    
    async def _perform_safety_checks(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Perform safety checks on the generated SQL."""
        try:
            sql = state["generated_sql"].lower()
            safety_results = {
                "is_safe": True,
                "risk_level": "low",
                "dangerous_patterns": [],
                "recommendations": []
            }
            
            # Check against dangerous patterns
            for pattern in self.dangerous_patterns:
                if re.search(pattern, sql, re.IGNORECASE):
                    safety_results["dangerous_patterns"].append(pattern)
                    safety_results["is_safe"] = False
                    safety_results["risk_level"] = "high"
            
            # Check for DELETE/UPDATE without WHERE
            if re.search(r'delete\s+from\s+\w+\s*(?:;|$)', sql):
                safety_results["dangerous_patterns"].append("DELETE without WHERE clause")
                safety_results["is_safe"] = False
                safety_results["risk_level"] = "high"
                safety_results["recommendations"].append("Add WHERE clause to DELETE statement")
            
            if re.search(r'update\s+\w+\s+set\s+.*(?:;|$)', sql) and 'where' not in sql:
                safety_results["dangerous_patterns"].append("UPDATE without WHERE clause")
                safety_results["is_safe"] = False
                safety_results["risk_level"] = "high"
                safety_results["recommendations"].append("Add WHERE clause to UPDATE statement")
            
            # Check for SELECT with potential performance issues
            if 'select *' in sql:
                safety_results["recommendations"].append("Consider selecting specific columns instead of *")
                if safety_results["risk_level"] == "low":
                    safety_results["risk_level"] = "medium"
            
            # Check for missing LIMIT in potentially large result sets
            if 'select' in sql and 'limit' not in sql and 'top' not in sql:
                safety_results["recommendations"].append("Consider adding LIMIT clause for large datasets")
            
            state["safety_checks"] = safety_results
            
            # Calculate confidence score based on safety and validation
            confidence = 0.5  # Base confidence
            if safety_results["is_safe"]:
                confidence += 0.3
            if state["validation_results"].get("is_valid", False):
                confidence += 0.2
            
            state["confidence_score"] = min(confidence, 1.0)
            
            state["workflow_trace"].append({
                "step": "safety_check",
                "status": "success",
                "is_safe": safety_results["is_safe"],
                "risk_level": safety_results["risk_level"],
                "confidence_score": state["confidence_score"]
            })
            
            return state
            
        except Exception as e:
            logger.error("Safety check failed", error=str(e))
            state["safety_checks"] = {
                "is_safe": False,
                "risk_level": "unknown",
                "dangerous_patterns": [],
                "recommendations": [f"Safety check error: {str(e)}"]
            }
            return state
    
    async def _explain_sql_query(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Generate explanation for the SQL query."""
        try:
            if not state["safety_checks"].get("is_safe", False):
                state["sql_explanation"] = "Query deemed unsafe - explanation skipped for security"
                return state
            
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="analysis"
            )
            
            if not model:
                state["sql_explanation"] = "No model available for explanation"
                return state
            
            explanation_prompt = f"""Explain the following SQL query in simple, non-technical terms:

Original request: "{state['natural_query']}"

SQL Query:
{state['generated_sql']}

Please explain:
1. What data this query retrieves/modifies
2. How it works step by step
3. Any important conditions or filters
4. Expected results

Explanation:"""
            
            config = GenerationConfig(max_tokens=300, temperature=0.3)
            response = await model.generate(explanation_prompt, config)
            
            state["sql_explanation"] = response.text.strip()
            
            state["workflow_trace"].append({
                "step": "explain_sql",
                "status": "success",
                "explanation_length": len(response.text)
            })
            
            return state
            
        except Exception as e:
            logger.error("SQL explanation failed", error=str(e))
            state["sql_explanation"] = f"Error generating explanation: {str(e)}"
            return state
    
    async def _generate_alternative_queries(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Generate alternative SQL queries for the same request."""
        try:
            if not state["safety_checks"].get("is_safe", False):
                state["alternative_queries"] = []
                return state
            
            model = await self.model_manager.get_model(
                model_name=state["metadata"].get("model"),
                capability="code-generation"
            )
            
            if not model:
                state["alternative_queries"] = []
                return state
            
            # Only generate alternatives for SELECT queries to be safe
            if not state["generated_sql"].lower().strip().startswith("select"):
                state["alternative_queries"] = []
                return state
            
            alternatives_prompt = f"""Given this natural language request and SQL query, provide 2-3 alternative SQL queries that achieve the same result using different approaches.

Original request: "{state['natural_query']}"

Current SQL:
{state['generated_sql']}

Please provide alternative approaches (e.g., different JOINs, subqueries vs CTEs, etc.):"""
            
            config = GenerationConfig(max_tokens=400, temperature=0.4)
            response = await model.generate(alternatives_prompt, config)
            
            # Extract alternative queries
            alternatives = self._extract_alternative_queries(response.text)
            state["alternative_queries"] = alternatives
            
            state["workflow_trace"].append({
                "step": "generate_alternatives",
                "status": "success",
                "alternatives_count": len(alternatives)
            })
            
            return state
            
        except Exception as e:
            logger.error("Alternative query generation failed", error=str(e))
            state["alternative_queries"] = []
            return state
    
    async def _finalize_query_result(self, state: DatabaseQueryState) -> DatabaseQueryState:
        """Finalize the query processing result."""
        # Add final metadata
        state["metadata"].update({
            "final_confidence": state["confidence_score"],
            "is_safe": state["safety_checks"].get("is_safe", False),
            "has_alternatives": len(state["alternative_queries"]) > 0
        })
        
        state["workflow_trace"].append({
            "step": "finalize_result",
            "status": "complete",
            "total_steps": len(state["workflow_trace"]) + 1
        })
        
        return state
    
    # Helper methods
    
    def _is_query_safe(self, state: DatabaseQueryState) -> str:
        """Determine if query is safe to explain and provide alternatives."""
        return "safe" if state["safety_checks"].get("is_safe", False) else "unsafe"
    
    def _extract_query_type(self, analysis_text: str) -> str:
        """Extract query type from analysis text."""
        types = ["select", "insert", "update", "delete", "create", "alter", "drop"]
        for query_type in types:
            if query_type in analysis_text:
                return query_type.upper()
        return "UNKNOWN"
    
    def _extract_complexity(self, analysis_text: str) -> str:
        """Extract complexity level from analysis text."""
        if "complex" in analysis_text:
            return "complex"
        elif "medium" in analysis_text:
            return "medium"
        elif "simple" in analysis_text:
            return "simple"
        else:
            return "medium"  # Default
    
    def _format_schema_info(self, schema: Dict[str, Any]) -> str:
        """Format schema information for prompt."""
        if not schema:
            return "No schema information available"
        
        formatted = []
        for table_name, table_info in schema.items():
            if isinstance(table_info, dict):
                columns = table_info.get("columns", [])
                if columns:
                    formatted.append(f"Table: {table_name}")
                    formatted.append(f"Columns: {', '.join(columns)}")
                    formatted.append("")
        
        return "\n".join(formatted) if formatted else str(schema)
    
    def _extract_sql_from_response(self, response_text: str) -> str:
        """Extract SQL query from model response."""
        lines = response_text.strip().split('\n')
        sql_lines = []
        in_sql_block = False
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines and comments at the start
            if not line or line.startswith('--') or line.startswith('#'):
                if sql_lines:  # Only skip if we haven't started collecting SQL
                    sql_lines.append(line)
                continue
            
            # Look for SQL keywords
            sql_keywords = ['select', 'insert', 'update', 'delete', 'with', 'create', 'alter']
            if any(line.lower().startswith(keyword) for keyword in sql_keywords):
                in_sql_block = True
            
            if in_sql_block:
                sql_lines.append(line)
                
                # Stop at semicolon or end of obvious SQL block
                if line.endswith(';'):
                    break
        
        return '\n'.join(sql_lines) if sql_lines else response_text.strip()
    
    def _extract_alternative_queries(self, response_text: str) -> List[str]:
        """Extract alternative SQL queries from response."""
        alternatives = []
        lines = response_text.split('\n')
        current_query = []
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines and headers
            if not line or line.lower().startswith(('alternative', 'option', 'approach')):
                if current_query:
                    # Save current query
                    query = '\n'.join(current_query).strip()
                    if query and query.lower().startswith('select'):
                        alternatives.append(query)
                    current_query = []
                continue
            
            # Collect query lines
            if line.lower().startswith(('select', 'with')) or current_query:
                current_query.append(line)
                
                # End query at semicolon
                if line.endswith(';'):
                    query = '\n'.join(current_query).strip()
                    if query.lower().startswith('select'):
                        alternatives.append(query)
                    current_query = []
        
        # Handle last query if no semicolon
        if current_query:
            query = '\n'.join(current_query).strip()
            if query.lower().startswith('select'):
                alternatives.append(query)
        
        return alternatives[:3]  # Limit to 3 alternatives