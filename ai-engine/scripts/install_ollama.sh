#!/bin/bash
# Install Ollama and recommended models for VNotions AI Engine

set -e

echo "🦙 Installing Ollama for VNotions AI Engine..."

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is already installed"
else
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
    echo "✓ Ollama installed successfully"
fi

# Start Ollama service
echo "🚀 Starting Ollama service..."
if pgrep -x "ollama" > /dev/null; then
    echo "✓ Ollama is already running"
else
    # Start Ollama in background
    ollama serve &
    OLLAMA_PID=$!
    echo "✓ Ollama started with PID: $OLLAMA_PID"
    
    # Wait for Ollama to be ready
    echo "⏳ Waiting for Ollama to be ready..."
    sleep 5
    
    # Check if Ollama is responding
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/version > /dev/null; then
            echo "✓ Ollama is ready"
            break
        fi
        echo "   Waiting... ($i/30)"
        sleep 2
    done
fi

# Install recommended models
echo "📚 Installing recommended AI models..."

MODELS=("llama2" "mistral" "codellama")

for model in "${MODELS[@]}"; do
    echo "📥 Installing $model..."
    if ollama list | grep -q "$model"; then
        echo "✓ $model is already installed"
    else
        ollama pull "$model"
        echo "✓ $model installed successfully"
    fi
done

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📋 Installed models:"
ollama list

echo ""
echo "🔧 Next steps:"
echo "1. cd to your ai-engine directory"
echo "2. Install Python dependencies: pip install -r requirements.txt"
echo "3. Start the AI Engine: python start.py"
echo ""
echo "📖 For more information, see README.md"