#!/usr/bin/env node

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { execSync } from 'child_process'

/**
 * Workspace initialization script for VNotions
 * Creates default workspace structure and sample content
 */

const DEFAULT_WORKSPACE_PATH = process.env.VNOTIONS_WORKSPACE || join(process.cwd(), 'sample-workspace')

async function createWorkspaceStructure() {
  const dirs = [
    '.vnotions',
    '.vnotions/cache',
    'pages',
    'databases',
    'assets',
    'assets/images',
    'assets/files',
    'templates',
    'trash'
  ]

  console.log(`Creating workspace structure at: ${DEFAULT_WORKSPACE_PATH}`)
  
  for (const dir of dirs) {
    const fullPath = join(DEFAULT_WORKSPACE_PATH, dir)
    await mkdir(fullPath, { recursive: true })
    console.log(`✓ Created directory: ${dir}`)
  }
}

async function createConfigFiles() {
  const config = {
    workspace: {
      name: 'Sample Workspace',
      created: new Date().toISOString(),
      version: '1.0.0-alpha',
      path: DEFAULT_WORKSPACE_PATH
    },
    settings: {
      theme: 'dark',
      autoSave: true,
      autoSaveInterval: 5000,
      gitEnabled: false,
      aiEnabled: false,
      searchIndexEnabled: true
    }
  }

  const settings = {
    app: {
      theme: 'dark',
      language: 'en',
      fontSize: 14,
      showLineNumbers: false,
      wordWrap: true
    },
    editor: {
      spellCheck: true,
      autoCorrect: false,
      showCharacterCount: true,
      focusMode: false
    },
    shortcuts: {
      'toggle-sidebar': 'cmd+shift+s',
      'toggle-properties': 'cmd+shift+p',
      'quick-switcher': 'cmd+k',
      'new-page': 'cmd+n',
      'search': 'cmd+shift+f'
    }
  }

  const pageIndex = {
    pages: [],
    hierarchy: {},
    lastModified: new Date().toISOString()
  }

  const databaseIndex = {
    databases: [],
    lastModified: new Date().toISOString()
  }

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, '.vnotions/config.json'),
    JSON.stringify(config, null, 2)
  )

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, '.vnotions/settings.json'),
    JSON.stringify(settings, null, 2)
  )

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, 'pages/index.json'),
    JSON.stringify(pageIndex, null, 2)
  )

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, 'databases/index.json'),
    JSON.stringify(databaseIndex, null, 2)
  )

  console.log('✓ Created configuration files')
}

async function createSampleContent() {
  // Create sample page
  const samplePageId = 'welcome-page-uuid'
  const samplePage = {
    id: samplePageId,
    title: 'Welcome to VNotions',
    icon: '👋',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to VNotions' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'VNotions is a local-first, privacy-focused knowledge management application. Get started by creating your first page or database.' }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Features' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich text editor with slash commands' }] }]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Database views (Table, Board, Calendar, etc.)' }] }]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Git integration for version control' }] }]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Full-text search across all content' }] }]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AI integration (optional)' }] }]
            }
          ]
        }
      ]
    },
    parent: null,
    children: [],
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    properties: {
      tags: ['welcome', 'getting-started'],
      status: 'published'
    }
  }

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, `pages/${samplePageId}.json`),
    JSON.stringify(samplePage, null, 2)
  )

  // Update page index
  const pageIndex = {
    pages: [samplePageId],
    hierarchy: {
      [samplePageId]: {
        parent: null,
        children: []
      }
    },
    lastModified: new Date().toISOString()
  }

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, 'pages/index.json'),
    JSON.stringify(pageIndex, null, 2)
  )

  // Create sample database
  const sampleDbId = 'tasks-database-uuid'
  const sampleDatabase = {
    id: sampleDbId,
    title: 'Sample Tasks',
    icon: '✅',
    schema: {
      columns: [
        {
          id: 'title',
          name: 'Task',
          type: 'title',
          width: 200
        },
        {
          id: 'status',
          name: 'Status',
          type: 'select',
          options: ['Not Started', 'In Progress', 'Completed'],
          width: 120
        },
        {
          id: 'priority',
          name: 'Priority',
          type: 'select',
          options: ['Low', 'Medium', 'High'],
          width: 100
        },
        {
          id: 'due_date',
          name: 'Due Date',
          type: 'date',
          width: 120
        },
        {
          id: 'assignee',
          name: 'Assignee',
          type: 'text',
          width: 150
        }
      ]
    },
    views: [
      {
        id: 'default-view',
        type: 'table',
        name: 'All Tasks',
        filters: [],
        sorts: [{ column: 'due_date', direction: 'asc' }],
        groupBy: null
      },
      {
        id: 'board-view',
        type: 'board',
        name: 'Kanban Board',
        filters: [],
        sorts: [],
        groupBy: 'status'
      }
    ],
    rows: [
      {
        id: 'task-1',
        cells: {
          title: 'Set up VNotions workspace',
          status: 'Completed',
          priority: 'High',
          due_date: new Date().toISOString().split('T')[0],
          assignee: 'You'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      {
        id: 'task-2',
        cells: {
          title: 'Create your first page',
          status: 'Not Started',
          priority: 'Medium',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assignee: 'You'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    ],
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  }

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, `databases/${sampleDbId}.json`),
    JSON.stringify(sampleDatabase, null, 2)
  )

  // Update database index
  const databaseIndex = {
    databases: [sampleDbId],
    lastModified: new Date().toISOString()
  }

  await writeFile(
    join(DEFAULT_WORKSPACE_PATH, 'databases/index.json'),
    JSON.stringify(databaseIndex, null, 2)
  )

  console.log('✓ Created sample content')
}

async function initializeGit() {
  try {
    execSync('git init', { cwd: DEFAULT_WORKSPACE_PATH, stdio: 'ignore' })
    
    const gitignore = `
# VNotions cache
.vnotions/cache/
.vnotions/search-index/

# System files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
`

    await writeFile(join(DEFAULT_WORKSPACE_PATH, '.gitignore'), gitignore.trim())
    
    execSync('git add .', { cwd: DEFAULT_WORKSPACE_PATH, stdio: 'ignore' })
    execSync('git commit -m "Initial VNotions workspace setup"', { cwd: DEFAULT_WORKSPACE_PATH, stdio: 'ignore' })
    
    console.log('✓ Initialized Git repository')
  } catch (error) {
    console.log('⚠ Git initialization failed (git may not be installed)')
  }
}

async function main() {
  try {
    console.log('🚀 Initializing VNotions workspace...\n')
    
    await createWorkspaceStructure()
    await createConfigFiles()
    await createSampleContent()
    await initializeGit()
    
    console.log('\n✅ Workspace initialization complete!')
    console.log(`\nWorkspace created at: ${DEFAULT_WORKSPACE_PATH}`)
    console.log('\nNext steps:')
    console.log('1. Start the development server: npm run dev:full')
    console.log('2. Open VNotions and select your workspace folder')
    console.log('3. Start creating pages and databases!')
    
    if (process.env.VNOTIONS_WORKSPACE) {
      console.log(`\nUsing custom workspace path: ${process.env.VNOTIONS_WORKSPACE}`)
    }
    
  } catch (error) {
    console.error('❌ Error initializing workspace:', error.message)
    process.exit(1)
  }
}

main()