# VNotions AI Engine

A local-first AI service for the VNotions knowledge management application. Provides content generation, analysis, embeddings, and database query capabilities using LangGraph workflows.

## Features

- **Multi-Provider Support**: Ollama (local), OpenAI, Anthropic
- **LangGraph Workflows**: Sophisticated AI orchestration
- **Content Generation**: Text, code, summaries with refinement
- **Content Analysis**: Sentiment, keywords, insights, readability
- **Database Queries**: Natural language to SQL conversion
- **Embeddings**: Semantic search and similarity
- **Model Management**: Automatic fallback and load balancing
- **Privacy-First**: Local models preferred, cloud optional

## Quick Start

### Prerequisites

1. **Python 3.11+**
2. **Ollama** (for local models)
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama
   ollama serve
   ```

### Installation

1. **Clone and setup**:
   ```bash
   cd /path/to/vnotions/ai-engine
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (optional for cloud providers)
   ```

3. **Install AI models**:
   ```bash
   # Interactive setup
   python installer.py setup
   
   # Or install recommended models
   python installer.py install --recommended
   
   # Or install specific models
   python installer.py install --model llama2 --type ollama
   ```

4. **Start the AI Engine**:
   ```bash
   python main.py
   # Or with uvicorn
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

## API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /models` - List available models

### Content Generation
- `POST /generate` - Generate content
- `POST /analyze` - Analyze content
- `POST /query` - Natural language database queries
- `POST /embed` - Generate embeddings

### Model Management
- `POST /install` - Install new models
- `GET /install/status/{model_name}` - Installation status

## Usage Examples

### Generate Content
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post("http://localhost:8000/generate", json={
        "prompt": "Write a summary of quantum computing",
        "max_tokens": 500,
        "temperature": 0.7
    })
    result = response.json()
    print(result["data"]["content"])
```

### Analyze Content
```python
response = await client.post("http://localhost:8000/analyze", json={
    "content": "This is an amazing product! I love using it every day.",
    "analysis_type": "sentiment"
})
```

### Database Query
```python
response = await client.post("http://localhost:8000/query", json={
    "query": "Show me all users who signed up last month",
    "schema": {
        "users": {
            "columns": ["id", "name", "email", "created_at"]
        }
    }
})
```

### Generate Embeddings
```python
response = await client.post("http://localhost:8000/embed", json={
    "text": "VNotions is a knowledge management application"
})
```

## Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Core settings
AI_ENGINE_HOST=127.0.0.1
AI_ENGINE_PORT=8000

# Model providers (optional)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434

# Default models
DEFAULT_TEXT_MODEL=llama2
DEFAULT_EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### Model Configuration

Edit `config.yaml` to customize:
- Default models for different tasks
- Performance settings
- Security options
- Provider preferences

## Model Management

### Install Models

```bash
# See available models
python installer.py list

# Install recommended models
python installer.py install --recommended

# Install specific model
python installer.py install --model mistral --type ollama

# Check status
python installer.py status
```

### Supported Models

#### Ollama (Local)
- **llama2** - General purpose (recommended)
- **mistral** - Fast and efficient (recommended)
- **codellama** - Code generation (recommended)
- **neural-chat** - Conversations
- **dolphin-mixtral** - Advanced reasoning

#### OpenAI (Cloud)
- **gpt-3.5-turbo** - Fast and cost-effective
- **gpt-4** - Most capable
- **gpt-4-turbo** - Latest version
- **text-embedding-ada-002** - Embeddings

#### Anthropic (Cloud)
- **claude-3-haiku** - Fast and affordable
- **claude-3-sonnet** - Balanced performance
- **claude-3-opus** - Most capable

#### Embedding Models
- **all-MiniLM-L6-v2** - Lightweight (recommended)
- **all-mpnet-base-v2** - High quality (recommended)

## Architecture

### Core Components

1. **FastAPI Server** (`main.py`) - REST API endpoints
2. **Model Manager** (`utils/model_manager.py`) - Model lifecycle and selection
3. **Services** (`services/`) - High-level AI operations
4. **LangGraph Workflows** (`graphs/`) - AI orchestration
5. **Model Integrations** (`models/`) - Provider-specific implementations

### LangGraph Workflows

#### Content Generation Workflow
```
Input → Generate Initial → Evaluate Quality → Generate Feedback → Refine Content → Finalize
```

#### Database Query Workflow
```
Natural Query → Analyze Intent → Generate SQL → Validate Syntax → Safety Check → Explain → Alternatives
```

### Privacy & Security

- **Local-First**: Ollama models run entirely locally
- **Optional Cloud**: OpenAI/Anthropic only if API keys provided
- **SQL Safety**: Dangerous queries blocked automatically
- **No Data Logging**: Content not logged by default
- **Configurable**: Full control over data flow

## Development

### Project Structure

```
ai-engine/
├── main.py                    # FastAPI application
├── config.py                  # Configuration management
├── installer.py               # Model installer
├── requirements.txt           # Dependencies
├── models/                    # Model integrations
│   ├── base.py               # Base model interface
│   ├── ollama.py             # Ollama integration
│   ├── openai.py             # OpenAI integration
│   └── anthropic.py          # Anthropic integration
├── services/                  # High-level services
│   ├── generation.py         # Content generation
│   ├── analysis.py           # Content analysis
│   └── embeddings.py         # Embeddings service
├── graphs/                    # LangGraph workflows
│   ├── content_graph.py      # Content generation workflow
│   └── database_graph.py     # Database query workflow
└── utils/                     # Utilities
    └── model_manager.py       # Model management
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/

# Run with coverage
pytest --cov=. tests/
```

### Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure privacy-first principles

## Troubleshooting

### Common Issues

1. **Ollama not running**:
   ```bash
   ollama serve
   ```

2. **Model not found**:
   ```bash
   python installer.py status
   python installer.py install --model llama2 --type ollama
   ```

3. **Memory issues**:
   - Reduce `max_concurrent_requests` in config
   - Use smaller models (e.g., llama2 instead of llama2:13b)

4. **Slow responses**:
   - Check if using local models
   - Increase timeout settings
   - Consider GPU acceleration for Ollama

### Logs

Check logs for debugging:
```bash
# Set log level in .env
LOG_LEVEL=DEBUG

# View logs
tail -f ai_engine.log
```

## License

Part of the VNotions project. See main project license.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Open an issue in the VNotions repository