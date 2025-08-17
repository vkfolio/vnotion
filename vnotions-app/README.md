# VNotions

VNotions is a local-first, privacy-focused knowledge management application inspired by Notion. Built with Electron, Nuxt 3, Vue 3, and PrimeVue, it offers a powerful alternative that keeps your data under your control.

## Features

### 📝 Rich Text Editor
- TipTap-based editor with slash commands
- Text formatting, headings, lists, and code blocks
- Callouts, toggles, and custom block types
- Auto-save functionality

### 🗂️ Database System
- Multiple view types: Table, Board, Calendar, List, Gallery, Timeline
- Advanced filtering, sorting, and grouping
- Column types: text, number, select, date, checkbox, relation, formula
- Drag-and-drop functionality

### 🔄 Git Integration
- Automatic version control for all changes
- Manual commits with custom messages
- Branch management and conflict resolution
- Push/pull to remote repositories

### 🔍 Full-Text Search
- FlexSearch-powered search across all content
- Quick switcher (Cmd/Ctrl+K)
- Advanced filtering and search suggestions
- Real-time search indexing

### 🤖 AI Integration (Optional)
- Python-based AI engine with LangGraph
- Support for local models (Ollama) and cloud providers
- Content generation and analysis
- Natural language database queries

### 🎨 Modern UI
- Dark theme by default with PrimeVue Aura
- Three-panel layout matching Notion's design
- Responsive and accessible interface
- Keyboard shortcuts and navigation

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd vnotions-app

# Install dependencies
npm install

# Initialize a sample workspace
npm run workspace:init
```

### 2. Development

```bash
# Start Nuxt development server only
npm run dev

# Start Electron app only
npm run dev:electron

# Start both Nuxt and Electron (recommended)
npm run dev:full

# Start with AI engine
npm run ai:dev
```

### 3. Building

```bash
# Build for development
npm run build

# Build Electron app for current platform
npm run build:electron

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux
```

## Available Commands

### Core Development
- `npm run dev` - Start Nuxt development server
- `npm run dev:electron` - Start Electron app
- `npm run dev:full` - Start both Nuxt and Electron
- `npm run build` - Build for production

### AI Engine
- `npm run ai:setup` - Install AI models
- `npm run ai:start` - Start AI engine
- `npm run ai:dev` - Start with AI engine

### Testing & Quality
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier

### Utilities
- `npm run workspace:init` - Initialize sample workspace
- `npm run clean` - Clean build artifacts

## Architecture

VNotions follows a local-first architecture with all data stored in user-controlled folders. The application uses:

- **Electron + Nuxt 3** for the desktop application
- **Vue 3 + JavaScript** (no TypeScript) for the frontend
- **PrimeVue + TailwindCSS** for UI components and styling
- **TipTap** for rich text editing
- **Python + LangGraph** for AI capabilities
- **Git** for version control
- **FlexSearch** for full-text search

## Getting Started

1. Install dependencies: `npm install`
2. Initialize workspace: `npm run workspace:init`
3. Start development: `npm run dev:full`
4. Open VNotions and select your workspace folder

For AI features:
1. Setup AI engine: `npm run ai:setup`
2. Start with AI: `npm run ai:dev`

---

VNotions - Your knowledge, your control. 🧠✨