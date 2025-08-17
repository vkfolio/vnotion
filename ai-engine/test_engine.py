#!/usr/bin/env python3
"""
Quick test script for VNotions AI Engine
Verifies that the engine is working correctly.
"""

import asyncio
import httpx
import sys
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()


async def test_ai_engine():
    """Test the AI Engine endpoints."""
    base_url = "http://localhost:8000"
    
    console.print(Panel("🧪 Testing VNotions AI Engine", style="blue"))
    
    results = {}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test 1: Health Check
        console.print("[yellow]Testing health endpoint...[/yellow]")
        try:
            response = await client.get(f"{base_url}/health")
            results["Health Check"] = response.status_code == 200
            if results["Health Check"]:
                data = response.json()
                console.print(f"[green]✓ Health check passed: {data['data']['status']}[/green]")
            else:
                console.print(f"[red]✗ Health check failed: {response.status_code}[/red]")
        except Exception as e:
            results["Health Check"] = False
            console.print(f"[red]✗ Health check error: {str(e)}[/red]")
        
        # Test 2: Models List
        console.print("[yellow]Testing models endpoint...[/yellow]")
        try:
            response = await client.get(f"{base_url}/models")
            results["Models List"] = response.status_code == 200
            if results["Models List"]:
                data = response.json()
                models = data.get("data", {}).get("models", {})
                total_models = sum(len(provider_models) for provider_models in models.values())
                console.print(f"[green]✓ Found {total_models} available models[/green]")
                
                # Show available models
                if total_models > 0:
                    table = Table(title="Available Models")
                    table.add_column("Provider", style="cyan")
                    table.add_column("Model", style="white")
                    table.add_column("Available", style="green")
                    
                    for provider, provider_models in models.items():
                        for model in provider_models[:3]:  # Show first 3 models per provider
                            available = "✓" if model.get("available", False) else "✗"
                            table.add_row(provider, model["name"], available)
                    
                    console.print(table)
            else:
                console.print(f"[red]✗ Models list failed: {response.status_code}[/red]")
        except Exception as e:
            results["Models List"] = False
            console.print(f"[red]✗ Models list error: {str(e)}[/red]")
        
        # Test 3: Simple Generation
        console.print("[yellow]Testing content generation...[/yellow]")
        try:
            response = await client.post(f"{base_url}/generate", json={
                "prompt": "Write a one-sentence summary of artificial intelligence.",
                "max_tokens": 50,
                "temperature": 0.3
            })
            results["Content Generation"] = response.status_code == 200
            if results["Content Generation"]:
                data = response.json()
                if data["success"]:
                    content = data["data"]["content"]
                    console.print(f"[green]✓ Generated content ({len(content)} chars)[/green]")
                    console.print(f"[dim]Preview: {content[:100]}{'...' if len(content) > 100 else ''}[/dim]")
                else:
                    console.print(f"[red]✗ Generation failed: {data.get('error', 'Unknown error')}[/red]")
                    results["Content Generation"] = False
            else:
                console.print(f"[red]✗ Generation failed: {response.status_code}[/red]")
        except Exception as e:
            results["Content Generation"] = False
            console.print(f"[red]✗ Generation error: {str(e)}[/red]")
        
        # Test 4: Content Analysis
        console.print("[yellow]Testing content analysis...[/yellow]")
        try:
            response = await client.post(f"{base_url}/analyze", json={
                "content": "This is a great example of AI technology working well!",
                "analysis_type": "sentiment"
            })
            results["Content Analysis"] = response.status_code == 200
            if results["Content Analysis"]:
                data = response.json()
                if data["success"]:
                    analysis = data["data"]
                    console.print(f"[green]✓ Analysis completed: {analysis.get('analysis_type', 'unknown')}[/green]")
                else:
                    console.print(f"[red]✗ Analysis failed: {data.get('error', 'Unknown error')}[/red]")
                    results["Content Analysis"] = False
            else:
                console.print(f"[red]✗ Analysis failed: {response.status_code}[/red]")
        except Exception as e:
            results["Content Analysis"] = False
            console.print(f"[red]✗ Analysis error: {str(e)}[/red]")
        
        # Test 5: Embeddings
        console.print("[yellow]Testing embeddings...[/yellow]")
        try:
            response = await client.post(f"{base_url}/embed", json={
                "text": "This is a test sentence for embedding generation."
            })
            results["Embeddings"] = response.status_code == 200
            if results["Embeddings"]:
                data = response.json()
                if data["success"]:
                    embedding = data["data"]["embedding"]
                    console.print(f"[green]✓ Generated embedding ({len(embedding)} dimensions)[/green]")
                else:
                    console.print(f"[red]✗ Embedding failed: {data.get('error', 'Unknown error')}[/red]")
                    results["Embeddings"] = False
            else:
                console.print(f"[red]✗ Embedding failed: {response.status_code}[/red]")
        except Exception as e:
            results["Embeddings"] = False
            console.print(f"[red]✗ Embedding error: {str(e)}[/red]")
    
    # Summary
    console.print()
    
    summary_table = Table(title="Test Results Summary")
    summary_table.add_column("Test", style="cyan")
    summary_table.add_column("Status", style="white")
    
    passed = 0
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "[green]✓ PASS[/green]" if passed_test else "[red]✗ FAIL[/red]"
        summary_table.add_row(test_name, status)
        if passed_test:
            passed += 1
    
    console.print(summary_table)
    console.print()
    
    if passed == total:
        console.print(f"[green]🎉 All tests passed! ({passed}/{total})[/green]")
        console.print("[green]Your VNotions AI Engine is working correctly.[/green]")
        return True
    else:
        console.print(f"[yellow]⚠️  Some tests failed. ({passed}/{total} passed)[/yellow]")
        
        if passed == 0:
            console.print("[red]The AI Engine may not be running. Try:[/red]")
            console.print("[dim]python start.py[/dim]")
        elif results.get("Health Check", False) and not results.get("Content Generation", False):
            console.print("[yellow]The engine is running but no models are available. Try:[/yellow]")
            console.print("[dim]python installer.py setup[/dim]")
        
        return False


async def main():
    """Main test runner."""
    console.print("[blue]VNotions AI Engine Test Suite[/blue]")
    console.print()
    
    success = await test_ai_engine()
    
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Test interrupted[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n[red]Test suite error: {str(e)}[/red]")
        sys.exit(1)