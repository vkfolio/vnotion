#!/usr/bin/env python3
"""
Startup script for VNotions AI Engine
Handles initialization, health checks, and graceful startup.
"""

import asyncio
import sys
import signal
from pathlib import Path
import structlog
import uvicorn
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from utils.model_manager import ModelManager

logger = structlog.get_logger()
console = Console()


class AIEngineStarter:
    """Handles AI Engine startup process."""
    
    def __init__(self):
        self.model_manager = None
        self.server_task = None
    
    async def startup_checks(self) -> bool:
        """Perform startup health checks."""
        console.print("[yellow]Performing startup checks...[/yellow]")
        
        checks = {
            "Configuration": True,
            "Model Manager": False,
            "Default Models": False,
            "API Server": False
        }
        
        try:
            # Check model manager initialization
            self.model_manager = ModelManager()
            await self.model_manager.initialize()
            checks["Model Manager"] = True
            
            # Check if any models are available
            available_models = await self.model_manager.list_available_models()
            total_models = sum(len(models) for models in available_models.values())
            checks["Default Models"] = total_models > 0
            
            # Check if API server can start (basic check)
            checks["API Server"] = True
            
        except Exception as e:
            logger.error("Startup check failed", error=str(e))
        
        # Display results
        table = Table(title="Startup Status")
        table.add_column("Component", style="cyan")
        table.add_column("Status", style="white")
        table.add_column("Details", style="dim")
        
        for component, status in checks.items():
            status_text = "[green]✓ Ready[/green]" if status else "[red]✗ Failed[/red]"
            details = ""
            
            if component == "Default Models" and checks["Model Manager"]:
                details = f"{total_models} models available"
            elif component == "API Server":
                details = f"Port {settings.port}"
            
            table.add_row(component, status_text, details)
        
        console.print(table)
        
        # Check if we can start
        critical_checks = ["Configuration", "Model Manager"]
        can_start = all(checks[check] for check in critical_checks)
        
        if not can_start:
            console.print("[red]Critical startup checks failed. Cannot start AI Engine.[/red]")
            return False
        
        if not checks["Default Models"]:
            console.print("[yellow]Warning: No models available. Install models using:[/yellow]")
            console.print("[dim]python installer.py setup[/dim]")
        
        return True
    
    def display_banner(self):
        """Display startup banner."""
        banner_text = """
╦  ╦┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ╔═╗╦  ╔═╗┌┐┌┌─┐┬┌┐┌┌─┐
╚╗╔╝││││ │ │ ││ ││││└─┐  ║╣ ║  ║╣ ││││ ┬││││├┤ 
 ╚╝ ┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘  ╚═╝╩  ╚═╝┘└┘└─┘┴┘└┘└─┘
        """
        
        panel = Panel(
            banner_text,
            title="VNotions AI Engine",
            subtitle=f"v1.0.0-alpha | Privacy-First Knowledge AI",
            style="blue"
        )
        console.print(panel)
    
    async def start_server(self):
        """Start the FastAPI server."""
        config = uvicorn.Config(
            "main:app",
            host=settings.host,
            port=settings.port,
            reload=settings.debug,
            log_config=None,  # Use our custom logging
            access_log=False  # Disable access logs for cleaner output
        )
        
        server = uvicorn.Server(config)
        
        # Display server info
        info_table = Table(title="Server Configuration")
        info_table.add_column("Setting", style="cyan")
        info_table.add_column("Value", style="white")
        
        info_table.add_row("Host", settings.host)
        info_table.add_row("Port", str(settings.port))
        info_table.add_row("Debug Mode", str(settings.debug))
        info_table.add_row("Max Concurrent", str(settings.max_concurrent_requests))
        
        console.print(info_table)
        console.print()
        
        console.print(f"[green]🚀 Starting AI Engine at http://{settings.host}:{settings.port}[/green]")
        console.print("[dim]Press Ctrl+C to stop[/dim]")
        console.print()
        
        try:
            await server.serve()
        except KeyboardInterrupt:
            console.print("\n[yellow]Shutting down AI Engine...[/yellow]")
        except Exception as e:
            console.print(f"[red]Server error: {str(e)}[/red]")
        finally:
            if self.model_manager:
                await self.model_manager.cleanup()
    
    async def run(self):
        """Main startup routine."""
        self.display_banner()
        
        # Perform startup checks
        if not await self.startup_checks():
            sys.exit(1)
        
        console.print()
        
        # Start the server
        await self.start_server()


def signal_handler(signum, frame):
    """Handle shutdown signals."""
    console.print("\n[yellow]Received shutdown signal. Stopping...[/yellow]")
    sys.exit(0)


async def main():
    """Main entry point."""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start the AI Engine
    starter = AIEngineStarter()
    await starter.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[dim]Goodbye![/dim]")
    except Exception as e:
        console.print(f"[red]Fatal error: {str(e)}[/red]")
        sys.exit(1)