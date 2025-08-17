"""
Model Installer Script for VNotions AI Engine
Downloads and sets up AI models for local and cloud usage.
"""

import asyncio
import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any
import argparse
import structlog
import httpx
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.prompt import Confirm, Prompt

# Setup logging
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
console = Console()


class ModelInstaller:
    """Handles installation and management of AI models."""
    
    def __init__(self):
        self.ollama_base_url = "http://localhost:11434"
        self.models_dir = Path("./models")
        self.config_file = Path("./config/installed_models.json")
        self.models_dir.mkdir(exist_ok=True)
        self.config_file.parent.mkdir(exist_ok=True)
    
    async def check_prerequisites(self) -> Dict[str, bool]:
        """Check if required software is installed."""
        checks = {
            "python": True,  # We're running Python
            "ollama": False,
            "internet": False
        }
        
        # Check Ollama
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.ollama_base_url}/api/version", timeout=5.0)
                checks["ollama"] = response.status_code == 200
        except:
            checks["ollama"] = False
        
        # Check internet connectivity
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("https://api.github.com", timeout=5.0)
                checks["internet"] = response.status_code == 200
        except:
            checks["internet"] = False
        
        return checks
    
    async def list_available_models(self) -> Dict[str, List[Dict]]:
        """List all available models for installation."""
        return {
            "ollama": [
                {
                    "name": "llama2",
                    "size": "3.8GB",
                    "description": "Llama 2 7B - General purpose model",
                    "recommended": True,
                    "capabilities": ["text-generation", "chat"]
                },
                {
                    "name": "llama2:13b",
                    "size": "7.3GB",
                    "description": "Llama 2 13B - Larger, more capable model",
                    "recommended": False,
                    "capabilities": ["text-generation", "chat"]
                },
                {
                    "name": "codellama",
                    "size": "3.8GB",
                    "description": "Code Llama 7B - Specialized for code generation",
                    "recommended": True,
                    "capabilities": ["code-generation", "text-generation"]
                },
                {
                    "name": "mistral",
                    "size": "4.1GB",
                    "description": "Mistral 7B - Fast and efficient model",
                    "recommended": True,
                    "capabilities": ["text-generation", "chat"]
                },
                {
                    "name": "neural-chat",
                    "size": "4.1GB",
                    "description": "Neural Chat 7B - Optimized for conversations",
                    "recommended": False,
                    "capabilities": ["chat", "text-generation"]
                },
                {
                    "name": "dolphin-mixtral",
                    "size": "26GB",
                    "description": "Dolphin Mixtral 8x7B - Very capable but large",
                    "recommended": False,
                    "capabilities": ["text-generation", "chat", "reasoning"]
                }
            ],
            "embedding": [
                {
                    "name": "all-MiniLM-L6-v2",
                    "size": "90MB",
                    "description": "Lightweight sentence transformer",
                    "recommended": True,
                    "capabilities": ["embedding"]
                },
                {
                    "name": "all-mpnet-base-v2",
                    "size": "420MB",
                    "description": "High quality sentence transformer",
                    "recommended": True,
                    "capabilities": ["embedding"]
                }
            ]
        }
    
    async def list_installed_models(self) -> Dict[str, List[Dict]]:
        """List currently installed models."""
        installed = {
            "ollama": [],
            "embedding": [],
            "cloud": []
        }
        
        # Check Ollama models
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.ollama_base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    for model in data.get("models", []):
                        installed["ollama"].append({
                            "name": model["name"],
                            "size": self._format_size(model.get("size", 0)),
                            "modified": model.get("modified_at", "")
                        })
        except:
            pass
        
        # Check embedding models (sentence-transformers cache)
        try:
            from sentence_transformers import SentenceTransformer
            cache_dir = Path.home() / ".cache" / "torch" / "sentence_transformers"
            if cache_dir.exists():
                for model_dir in cache_dir.iterdir():
                    if model_dir.is_dir():
                        installed["embedding"].append({
                            "name": model_dir.name,
                            "size": self._get_directory_size(model_dir),
                            "path": str(model_dir)
                        })
        except:
            pass
        
        return installed
    
    async def install_ollama_model(self, model_name: str, progress_callback: Optional[callable] = None) -> bool:
        """Install an Ollama model."""
        try:
            console.print(f"[yellow]Installing Ollama model: {model_name}[/yellow]")
            
            # Use Ollama pull command
            process = await asyncio.create_subprocess_exec(
                "ollama", "pull", model_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Monitor progress
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                
                line_text = line.decode().strip()
                if progress_callback:
                    progress_callback(line_text)
                else:
                    console.print(f"[dim]{line_text}[/dim]")
            
            await process.wait()
            
            if process.returncode == 0:
                console.print(f"[green]✓ Successfully installed {model_name}[/green]")
                await self._update_installed_models_config(model_name, "ollama")
                return True
            else:
                error = await process.stderr.read()
                console.print(f"[red]✗ Failed to install {model_name}: {error.decode()}[/red]")
                return False
                
        except Exception as e:
            console.print(f"[red]✗ Error installing {model_name}: {str(e)}[/red]")
            return False
    
    async def install_embedding_model(self, model_name: str) -> bool:
        """Install a sentence transformer embedding model."""
        try:
            console.print(f"[yellow]Installing embedding model: {model_name}[/yellow]")
            
            # Import and load model (this will download it)
            from sentence_transformers import SentenceTransformer
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
            ) as progress:
                task = progress.add_task(f"Downloading {model_name}...", total=None)
                
                # This will download the model if not already cached
                model = SentenceTransformer(model_name)
                
                progress.update(task, description=f"✓ Downloaded {model_name}")
            
            console.print(f"[green]✓ Successfully installed {model_name}[/green]")
            await self._update_installed_models_config(model_name, "embedding")
            return True
            
        except Exception as e:
            console.print(f"[red]✗ Error installing {model_name}: {str(e)}[/red]")
            return False
    
    async def uninstall_model(self, model_name: str, model_type: str) -> bool:
        """Uninstall a model."""
        try:
            if model_type == "ollama":
                # Use Ollama rm command
                process = await asyncio.create_subprocess_exec(
                    "ollama", "rm", model_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                await process.wait()
                
                if process.returncode == 0:
                    console.print(f"[green]✓ Successfully uninstalled {model_name}[/green]")
                    await self._remove_from_installed_config(model_name, model_type)
                    return True
                else:
                    error = await process.stderr.read()
                    console.print(f"[red]✗ Failed to uninstall {model_name}: {error.decode()}[/red]")
                    return False
            
            elif model_type == "embedding":
                # Remove from sentence-transformers cache
                cache_dir = Path.home() / ".cache" / "torch" / "sentence_transformers"
                model_dir = cache_dir / model_name
                
                if model_dir.exists():
                    import shutil
                    shutil.rmtree(model_dir)
                    console.print(f"[green]✓ Successfully uninstalled {model_name}[/green]")
                    await self._remove_from_installed_config(model_name, model_type)
                    return True
                else:
                    console.print(f"[yellow]Model {model_name} not found in cache[/yellow]")
                    return False
            
            return False
            
        except Exception as e:
            console.print(f"[red]✗ Error uninstalling {model_name}: {str(e)}[/red]")
            return False
    
    async def install_recommended_models(self) -> bool:
        """Install all recommended models."""
        available = await self.list_available_models()
        success_count = 0
        total_count = 0
        
        # Install recommended Ollama models
        for model in available["ollama"]:
            if model.get("recommended", False):
                total_count += 1
                if await self.install_ollama_model(model["name"]):
                    success_count += 1
        
        # Install recommended embedding models
        for model in available["embedding"]:
            if model.get("recommended", False):
                total_count += 1
                if await self.install_embedding_model(model["name"]):
                    success_count += 1
        
        console.print(f"[blue]Installed {success_count}/{total_count} recommended models[/blue]")
        return success_count == total_count
    
    def display_available_models(self, available_models: Dict[str, List[Dict]]):
        """Display available models in a nice table."""
        for category, models in available_models.items():
            table = Table(title=f"{category.title()} Models")
            table.add_column("Name", style="cyan", no_wrap=True)
            table.add_column("Size", style="magenta")
            table.add_column("Description", style="white")
            table.add_column("Recommended", style="green")
            
            for model in models:
                recommended = "✓" if model.get("recommended", False) else ""
                table.add_row(
                    model["name"],
                    model["size"],
                    model["description"],
                    recommended
                )
            
            console.print(table)
            console.print()
    
    def display_installed_models(self, installed_models: Dict[str, List[Dict]]):
        """Display installed models in a table."""
        for category, models in installed_models.items():
            if not models:
                continue
                
            table = Table(title=f"Installed {category.title()} Models")
            table.add_column("Name", style="cyan", no_wrap=True)
            table.add_column("Size", style="magenta")
            
            if category == "ollama":
                table.add_column("Modified", style="dim")
            elif category == "embedding":
                table.add_column("Path", style="dim")
            
            for model in models:
                if category == "ollama":
                    table.add_row(
                        model["name"],
                        model["size"],
                        model.get("modified", "")[:19]  # Truncate timestamp
                    )
                elif category == "embedding":
                    table.add_row(
                        model["name"],
                        model["size"],
                        model.get("path", "")
                    )
            
            console.print(table)
            console.print()
    
    async def _update_installed_models_config(self, model_name: str, model_type: str):
        """Update the installed models configuration file."""
        config = {}
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                config = json.load(f)
        
        if model_type not in config:
            config[model_type] = []
        
        if model_name not in config[model_type]:
            config[model_type].append(model_name)
        
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
    
    async def _remove_from_installed_config(self, model_name: str, model_type: str):
        """Remove model from installed models configuration."""
        if not self.config_file.exists():
            return
        
        with open(self.config_file, 'r') as f:
            config = json.load(f)
        
        if model_type in config and model_name in config[model_type]:
            config[model_type].remove(model_name)
        
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format size in bytes to human readable."""
        if size_bytes < 1024**3:
            return f"{size_bytes / 1024**2:.1f}MB"
        else:
            return f"{size_bytes / 1024**3:.1f}GB"
    
    def _get_directory_size(self, directory: Path) -> str:
        """Get the size of a directory."""
        try:
            total_size = sum(f.stat().st_size for f in directory.rglob('*') if f.is_file())
            return self._format_size(total_size)
        except:
            return "Unknown"


async def main():
    """Main installer CLI."""
    parser = argparse.ArgumentParser(description="VNotions AI Engine Model Installer")
    parser.add_argument("command", choices=["list", "install", "uninstall", "setup", "status"], 
                       help="Command to execute")
    parser.add_argument("--model", help="Model name to install/uninstall")
    parser.add_argument("--type", choices=["ollama", "embedding"], help="Model type")
    parser.add_argument("--recommended", action="store_true", help="Install all recommended models")
    
    args = parser.parse_args()
    
    installer = ModelInstaller()
    
    console.print("[bold blue]VNotions AI Engine Model Installer[/bold blue]")
    console.print()
    
    if args.command == "status":
        # Check prerequisites
        console.print("[yellow]Checking prerequisites...[/yellow]")
        checks = await installer.check_prerequisites()
        
        table = Table(title="System Status")
        table.add_column("Component", style="cyan")
        table.add_column("Status", style="white")
        
        for component, status in checks.items():
            status_text = "[green]✓ Available[/green]" if status else "[red]✗ Not available[/red]"
            table.add_row(component.title(), status_text)
        
        console.print(table)
        console.print()
        
        # Show installed models
        installed = await installer.list_installed_models()
        installer.display_installed_models(installed)
    
    elif args.command == "list":
        # List available models
        available = await installer.list_available_models()
        installer.display_available_models(available)
    
    elif args.command == "install":
        if args.recommended:
            # Install all recommended models
            console.print("[yellow]Installing recommended models...[/yellow]")
            success = await installer.install_recommended_models()
            if success:
                console.print("[green]All recommended models installed successfully![/green]")
            else:
                console.print("[yellow]Some models failed to install[/yellow]")
        
        elif args.model and args.type:
            # Install specific model
            if args.type == "ollama":
                await installer.install_ollama_model(args.model)
            elif args.type == "embedding":
                await installer.install_embedding_model(args.model)
        
        else:
            # Interactive installation
            available = await installer.list_available_models()
            installer.display_available_models(available)
            
            model_type = Prompt.ask("Model type", choices=["ollama", "embedding"])
            model_list = available[model_type]
            
            console.print(f"\nAvailable {model_type} models:")
            for i, model in enumerate(model_list):
                rec = " (recommended)" if model.get("recommended") else ""
                console.print(f"{i+1}. {model['name']} - {model['size']}{rec}")
            
            choice = Prompt.ask("Select model number", default="1")
            try:
                model_index = int(choice) - 1
                selected_model = model_list[model_index]
                
                if model_type == "ollama":
                    await installer.install_ollama_model(selected_model["name"])
                else:
                    await installer.install_embedding_model(selected_model["name"])
                    
            except (ValueError, IndexError):
                console.print("[red]Invalid selection[/red]")
    
    elif args.command == "uninstall":
        if args.model and args.type:
            await installer.uninstall_model(args.model, args.type)
        else:
            # Interactive uninstallation
            installed = await installer.list_installed_models()
            installer.display_installed_models(installed)
            
            # Let user select model to uninstall
            all_models = []
            for model_type, models in installed.items():
                for model in models:
                    all_models.append((model["name"], model_type))
            
            if not all_models:
                console.print("[yellow]No models installed[/yellow]")
                return
            
            console.print("\nInstalled models:")
            for i, (name, model_type) in enumerate(all_models):
                console.print(f"{i+1}. {name} ({model_type})")
            
            choice = Prompt.ask("Select model number to uninstall")
            try:
                model_index = int(choice) - 1
                model_name, model_type = all_models[model_index]
                
                if Confirm.ask(f"Uninstall {model_name}?"):
                    await installer.uninstall_model(model_name, model_type)
                    
            except (ValueError, IndexError):
                console.print("[red]Invalid selection[/red]")
    
    elif args.command == "setup":
        # Full setup process
        console.print("[yellow]Setting up VNotions AI Engine...[/yellow]")
        
        # Check prerequisites
        checks = await installer.check_prerequisites()
        
        if not checks["ollama"]:
            console.print("[red]Ollama is not running. Please install and start Ollama first.[/red]")
            console.print("Visit: https://ollama.ai/download")
            return
        
        if not checks["internet"]:
            console.print("[yellow]No internet connection. Some models may not be available.[/yellow]")
        
        # Ask user what to install
        if Confirm.ask("Install recommended models?", default=True):
            await installer.install_recommended_models()
        else:
            console.print("You can install models later using: python installer.py install")
        
        console.print("[green]Setup complete! You can now start the AI Engine.[/green]")


if __name__ == "__main__":
    asyncio.run(main())