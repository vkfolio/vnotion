"""
Embeddings Service for VNotions AI Engine
Provides text embedding generation and similarity search capabilities.
"""

import asyncio
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
import structlog
from sentence_transformers import SentenceTransformer
import threading

from models.base import BaseModel, EmbeddingResponse
from utils.model_manager import ModelManager

logger = structlog.get_logger()


class EmbeddingsService:
    """Service for generating and managing text embeddings."""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self._local_embedding_models: Dict[str, SentenceTransformer] = {}
        self._model_lock = threading.Lock()
        self._initialized = False
    
    async def initialize(self):
        """Initialize the embeddings service."""
        if self._initialized:
            return
        
        # Pre-load common embedding models
        await self._load_local_model("all-MiniLM-L6-v2")
        
        self._initialized = True
        logger.info("Embeddings service initialized")
    
    async def embed(
        self,
        text: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate embeddings for a single text."""
        texts = [text] if isinstance(text, str) else text
        result = await self.embed_batch(texts, model=model, **kwargs)
        
        return {
            "embedding": result["embeddings"][0] if result["embeddings"] else [],
            "model": result["model"],
            "dimension": result["dimension"],
            "metadata": result["metadata"]
        }
    
    async def embed_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: int = 32,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate embeddings for multiple texts."""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Determine which model to use
            embedding_model = model or "all-MiniLM-L6-v2"
            
            # Try cloud models first (OpenAI), then fallback to local
            if embedding_model.startswith("text-embedding"):
                return await self._embed_with_cloud_model(texts, embedding_model, **kwargs)
            else:
                return await self._embed_with_local_model(texts, embedding_model, batch_size, **kwargs)
            
        except Exception as e:
            logger.error("Batch embedding failed", error=str(e), model=model)
            raise
    
    async def _embed_with_cloud_model(
        self,
        texts: List[str],
        model_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate embeddings using cloud models (OpenAI)."""
        try:
            # Get OpenAI model
            target_model = await self.model_manager.get_model(
                model_name=model_name,
                provider="openai"
            )
            
            if not target_model:
                # Fallback to local model
                logger.warning("Cloud embedding model not available, falling back to local")
                return await self._embed_with_local_model(texts, "all-MiniLM-L6-v2")
            
            response = await target_model.embed(texts, **kwargs)
            
            return {
                "embeddings": response.embeddings,
                "model": model_name,
                "dimension": len(response.embeddings[0]) if response.embeddings else 0,
                "metadata": {
                    "provider": "openai",
                    **response.metadata
                },
                "usage": response.usage
            }
            
        except Exception as e:
            logger.error("Cloud embedding failed", error=str(e))
            # Fallback to local model
            return await self._embed_with_local_model(texts, "all-MiniLM-L6-v2")
    
    async def _embed_with_local_model(
        self,
        texts: List[str],
        model_name: str,
        batch_size: int = 32,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate embeddings using local sentence transformers."""
        try:
            # Load model if not already loaded
            if model_name not in self._local_embedding_models:
                await self._load_local_model(model_name)
            
            model = self._local_embedding_models.get(model_name)
            if not model:
                raise RuntimeError(f"Failed to load embedding model: {model_name}")
            
            # Process in batches to avoid memory issues
            all_embeddings = []
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                # Run embedding in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                embeddings = await loop.run_in_executor(
                    None,
                    lambda: model.encode(batch, convert_to_tensor=False)
                )
                
                # Convert to list of lists
                if isinstance(embeddings, np.ndarray):
                    embeddings = embeddings.tolist()
                
                all_embeddings.extend(embeddings)
            
            dimension = len(all_embeddings[0]) if all_embeddings else 0
            
            return {
                "embeddings": all_embeddings,
                "model": model_name,
                "dimension": dimension,
                "metadata": {
                    "provider": "sentence-transformers",
                    "batch_size": batch_size,
                    "total_texts": len(texts)
                }
            }
            
        except Exception as e:
            logger.error("Local embedding failed", error=str(e), model=model_name)
            raise
    
    async def _load_local_model(self, model_name: str):
        """Load a local sentence transformer model."""
        try:
            with self._model_lock:
                if model_name not in self._local_embedding_models:
                    logger.info("Loading embedding model", model=model_name)
                    
                    # Run model loading in thread pool
                    loop = asyncio.get_event_loop()
                    model = await loop.run_in_executor(
                        None,
                        lambda: SentenceTransformer(model_name)
                    )
                    
                    self._local_embedding_models[model_name] = model
                    logger.info("Embedding model loaded", model=model_name)
                    
        except Exception as e:
            logger.error("Failed to load embedding model", model=model_name, error=str(e))
            raise
    
    async def similarity_search(
        self,
        query: str,
        documents: List[str],
        top_k: int = 5,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Find most similar documents to query."""
        try:
            # Generate embeddings for query and documents
            query_result = await self.embed(query, model=model, **kwargs)
            docs_result = await self.embed_batch(documents, model=model, **kwargs)
            
            query_embedding = np.array(query_result["embedding"])
            doc_embeddings = np.array(docs_result["embeddings"])
            
            # Calculate cosine similarities
            similarities = self._cosine_similarity(query_embedding, doc_embeddings)
            
            # Get top-k most similar documents
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                results.append({
                    "document": documents[idx],
                    "similarity": float(similarities[idx]),
                    "index": int(idx)
                })
            
            return {
                "query": query,
                "results": results,
                "model": query_result["model"],
                "metadata": {
                    "total_documents": len(documents),
                    "top_k": top_k
                }
            }
            
        except Exception as e:
            logger.error("Similarity search failed", error=str(e))
            raise
    
    async def cluster_documents(
        self,
        documents: List[str],
        num_clusters: int = 5,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Cluster documents based on semantic similarity."""
        try:
            from sklearn.cluster import KMeans
            
            # Generate embeddings for all documents
            result = await self.embed_batch(documents, model=model, **kwargs)
            embeddings = np.array(result["embeddings"])
            
            # Perform K-means clustering
            kmeans = KMeans(n_clusters=min(num_clusters, len(documents)), random_state=42)
            cluster_labels = kmeans.fit_predict(embeddings)
            
            # Organize results by cluster
            clusters = {}
            for i, (doc, label) in enumerate(zip(documents, cluster_labels)):
                label = int(label)
                if label not in clusters:
                    clusters[label] = {
                        "documents": [],
                        "indices": [],
                        "center": kmeans.cluster_centers_[label].tolist()
                    }
                clusters[label]["documents"].append(doc)
                clusters[label]["indices"].append(i)
            
            return {
                "clusters": clusters,
                "num_clusters": len(clusters),
                "model": result["model"],
                "metadata": {
                    "total_documents": len(documents),
                    "requested_clusters": num_clusters
                }
            }
            
        except Exception as e:
            logger.error("Document clustering failed", error=str(e))
            raise
    
    async def find_duplicates(
        self,
        documents: List[str],
        threshold: float = 0.95,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Find duplicate or near-duplicate documents."""
        try:
            # Generate embeddings
            result = await self.embed_batch(documents, model=model, **kwargs)
            embeddings = np.array(result["embeddings"])
            
            # Calculate pairwise similarities
            similarities = np.dot(embeddings, embeddings.T)
            
            # Find duplicates above threshold
            duplicates = []
            for i in range(len(documents)):
                for j in range(i + 1, len(documents)):
                    if similarities[i, j] >= threshold:
                        duplicates.append({
                            "document1": {"text": documents[i], "index": i},
                            "document2": {"text": documents[j], "index": j},
                            "similarity": float(similarities[i, j])
                        })
            
            # Sort by similarity (highest first)
            duplicates.sort(key=lambda x: x["similarity"], reverse=True)
            
            return {
                "duplicates": duplicates,
                "threshold": threshold,
                "total_pairs_checked": len(documents) * (len(documents) - 1) // 2,
                "model": result["model"]
            }
            
        except Exception as e:
            logger.error("Duplicate detection failed", error=str(e))
            raise
    
    async def semantic_search(
        self,
        query: str,
        document_store: List[Dict[str, Any]],
        content_field: str = "content",
        top_k: int = 10,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Perform semantic search on a document store."""
        try:
            # Extract content for embedding
            documents = [doc.get(content_field, "") for doc in document_store]
            
            # Perform similarity search
            search_result = await self.similarity_search(
                query=query,
                documents=documents,
                top_k=top_k,
                model=model,
                **kwargs
            )
            
            # Enrich results with full document metadata
            enriched_results = []
            for result in search_result["results"]:
                doc_index = result["index"]
                enriched_result = {
                    "document": document_store[doc_index],
                    "similarity": result["similarity"],
                    "content_preview": result["document"][:200] + "..." if len(result["document"]) > 200 else result["document"]
                }
                enriched_results.append(enriched_result)
            
            return {
                "query": query,
                "results": enriched_results,
                "model": search_result["model"],
                "metadata": search_result["metadata"]
            }
            
        except Exception as e:
            logger.error("Semantic search failed", error=str(e))
            raise
    
    def _cosine_similarity(self, query_embedding: np.ndarray, doc_embeddings: np.ndarray) -> np.ndarray:
        """Calculate cosine similarity between query and document embeddings."""
        # Normalize embeddings
        query_norm = query_embedding / np.linalg.norm(query_embedding)
        doc_norms = doc_embeddings / np.linalg.norm(doc_embeddings, axis=1, keepdims=True)
        
        # Calculate cosine similarity
        similarities = np.dot(doc_norms, query_norm)
        return similarities
    
    async def get_available_models(self) -> Dict[str, Any]:
        """Get list of available embedding models."""
        local_models = [
            "all-MiniLM-L6-v2",
            "all-mpnet-base-v2",
            "paraphrase-MiniLM-L6-v2",
            "multi-qa-MiniLM-L6-cos-v1"
        ]
        
        cloud_models = [
            "text-embedding-ada-002"  # OpenAI
        ]
        
        # Check which models are actually available
        available_local = []
        for model in local_models:
            try:
                # Try to load model info without actually loading
                available_local.append({
                    "name": model,
                    "provider": "sentence-transformers",
                    "type": "local"
                })
            except:
                pass
        
        available_cloud = []
        for model in cloud_models:
            # Check if we have API keys for cloud providers
            if await self.model_manager.get_model(model_name=model, provider="openai"):
                available_cloud.append({
                    "name": model,
                    "provider": "openai",
                    "type": "cloud"
                })
        
        return {
            "local_models": available_local,
            "cloud_models": available_cloud,
            "total_models": len(available_local) + len(available_cloud)
        }
    
    async def cleanup(self):
        """Cleanup embedding service resources."""
        with self._model_lock:
            self._local_embedding_models.clear()
        logger.info("Embeddings service cleaned up")