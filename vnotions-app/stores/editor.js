import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'

/**
 * Pinia store for managing editor state and document operations
 * Handles document creation, editing, auto-save, and history
 */
export const useEditorStore = defineStore('editor', () => {
  // State
  const documents = ref(new Map())
  const activeDocumentId = ref(null)
  const isAutoSaving = ref(false)
  const lastSavedAt = ref(null)
  const editorSettings = ref({
    autoSave: true,
    autoSaveDelay: 1000,
    showToolbar: true,
    showCharacterCount: false,
    theme: 'dark',
    fontSize: 'medium',
    lineHeight: 'normal',
    spellCheck: true
  })

  // Auto-save queue
  const saveQueue = ref(new Set())
  let saveTimeout = null

  // Getters
  const activeDocument = computed(() => {
    if (!activeDocumentId.value) return null
    return documents.value.get(activeDocumentId.value)
  })

  const hasUnsavedChanges = computed(() => {
    if (!activeDocument.value) return false
    return activeDocument.value.isDirty
  })

  const documentList = computed(() => {
    return Array.from(documents.value.values()).sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  })

  const recentDocuments = computed(() => {
    return documentList.value.slice(0, 10)
  })

  // Actions
  const createDocument = (options = {}) => {
    const {
      title = 'Untitled',
      content = '',
      type = 'page',
      parentId = null,
      templateId = null
    } = options

    const document = {
      id: nanoid(),
      title,
      content,
      type,
      parentId,
      templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDirty: false,
      metadata: {
        characterCount: 0,
        wordCount: 0,
        readingTime: 0,
        version: 1
      },
      settings: {
        ...editorSettings.value
      },
      history: []
    }

    documents.value.set(document.id, document)
    return document
  }

  const openDocument = (documentId) => {
    if (!documents.value.has(documentId)) {
      console.warn(`Document ${documentId} not found`)
      return false
    }

    activeDocumentId.value = documentId
    return true
  }

  const updateDocument = (documentId, updates) => {
    const document = documents.value.get(documentId)
    if (!document) return false

    const updatedDocument = {
      ...document,
      ...updates,
      updatedAt: new Date().toISOString(),
      isDirty: true,
      metadata: {
        ...document.metadata,
        ...updates.metadata,
        version: document.metadata.version + 1
      }
    }

    documents.value.set(documentId, updatedDocument)

    // Add to save queue if auto-save is enabled
    if (editorSettings.value.autoSave) {
      queueAutoSave(documentId)
    }

    return true
  }

  const updateActiveDocument = (updates) => {
    if (!activeDocumentId.value) return false
    return updateDocument(activeDocumentId.value, updates)
  }

  const deleteDocument = (documentId) => {
    if (activeDocumentId.value === documentId) {
      activeDocumentId.value = null
    }
    
    return documents.value.delete(documentId)
  }

  const duplicateDocument = (documentId) => {
    const original = documents.value.get(documentId)
    if (!original) return null

    const duplicate = createDocument({
      title: `${original.title} (Copy)`,
      content: original.content,
      type: original.type,
      parentId: original.parentId
    })

    return duplicate
  }

  // Auto-save functionality
  const queueAutoSave = (documentId) => {
    saveQueue.value.add(documentId)

    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    saveTimeout = setTimeout(() => {
      processSaveQueue()
    }, editorSettings.value.autoSaveDelay)
  }

  const processSaveQueue = async () => {
    if (saveQueue.value.size === 0) return

    isAutoSaving.value = true

    try {
      const savePromises = Array.from(saveQueue.value).map(documentId => 
        saveDocument(documentId)
      )

      await Promise.all(savePromises)
      saveQueue.value.clear()
      lastSavedAt.value = new Date().toISOString()
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      isAutoSaving.value = false
    }
  }

  const saveDocument = async (documentId) => {
    const document = documents.value.get(documentId)
    if (!document) return false

    try {
      // Here you would typically save to filesystem via Electron IPC
      // For now, we'll just mark as saved
      const savedDocument = {
        ...document,
        isDirty: false,
        lastSavedAt: new Date().toISOString()
      }

      documents.value.set(documentId, savedDocument)

      // Add to history
      addToHistory(documentId, {
        action: 'save',
        timestamp: new Date().toISOString(),
        content: document.content
      })

      return true
    } catch (error) {
      console.error(`Failed to save document ${documentId}:`, error)
      return false
    }
  }

  const saveActiveDocument = () => {
    if (!activeDocumentId.value) return Promise.resolve(false)
    return saveDocument(activeDocumentId.value)
  }

  // History management
  const addToHistory = (documentId, entry) => {
    const document = documents.value.get(documentId)
    if (!document) return

    const history = [...document.history, entry]
    
    // Keep only last 50 history entries
    if (history.length > 50) {
      history.splice(0, history.length - 50)
    }

    updateDocument(documentId, { history })
  }

  const getDocumentHistory = (documentId) => {
    const document = documents.value.get(documentId)
    return document?.history || []
  }

  // Settings management
  const updateEditorSettings = (newSettings) => {
    editorSettings.value = {
      ...editorSettings.value,
      ...newSettings
    }

    // Persist settings (would typically save to user preferences)
    if (process.client) {
      localStorage.setItem('vnotions-editor-settings', JSON.stringify(editorSettings.value))
    }
  }

  const loadEditorSettings = () => {
    if (process.client) {
      const saved = localStorage.getItem('vnotions-editor-settings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          editorSettings.value = { ...editorSettings.value, ...parsed }
        } catch (error) {
          console.error('Failed to load editor settings:', error)
        }
      }
    }
  }

  // Document operations
  const searchDocuments = (query) => {
    if (!query.trim()) return []

    const searchTerm = query.toLowerCase()
    return documentList.value.filter(doc => 
      doc.title.toLowerCase().includes(searchTerm) ||
      doc.content.toLowerCase().includes(searchTerm)
    )
  }

  const getDocumentsByType = (type) => {
    return documentList.value.filter(doc => doc.type === type)
  }

  const getDocumentsByParent = (parentId) => {
    return documentList.value.filter(doc => doc.parentId === parentId)
  }

  // Bulk operations
  const exportDocument = (documentId, format = 'json') => {
    const document = documents.value.get(documentId)
    if (!document) return null

    switch (format) {
      case 'json':
        return JSON.stringify(document, null, 2)
      case 'markdown':
        // Convert HTML content to Markdown (would need a proper converter)
        return `# ${document.title}\n\n${document.content}`
      case 'html':
        return `
          <!DOCTYPE html>
          <html>
            <head><title>${document.title}</title></head>
            <body>
              <h1>${document.title}</h1>
              ${document.content}
            </body>
          </html>
        `
      default:
        return document.content
    }
  }

  const importDocument = (data, format = 'json') => {
    try {
      let documentData

      switch (format) {
        case 'json':
          documentData = JSON.parse(data)
          break
        case 'markdown':
          // Parse Markdown to HTML (would need a proper parser)
          const lines = data.split('\n')
          const title = lines[0].replace(/^#\s*/, '')
          const content = lines.slice(2).join('\n')
          documentData = { title, content }
          break
        default:
          documentData = { title: 'Imported Document', content: data }
      }

      return createDocument(documentData)
    } catch (error) {
      console.error('Failed to import document:', error)
      return null
    }
  }

  // Statistics
  const getDocumentStats = (documentId) => {
    const document = documents.value.get(documentId)
    if (!document) return null

    const content = document.content.replace(/<[^>]*>/g, '') // Strip HTML
    const words = content.split(/\s+/).filter(word => word.length > 0)
    const characters = content.length
    const readingTime = Math.ceil(words.length / 200) // 200 WPM average

    return {
      characterCount: characters,
      wordCount: words.length,
      readingTime,
      lastModified: document.updatedAt,
      version: document.metadata.version
    }
  }

  const getTotalStats = () => {
    const docs = documentList.value
    const totalDocs = docs.length
    const totalWords = docs.reduce((sum, doc) => {
      const stats = getDocumentStats(doc.id)
      return sum + (stats?.wordCount || 0)
    }, 0)

    return {
      totalDocuments: totalDocs,
      totalWords,
      lastActivity: docs[0]?.updatedAt
    }
  }

  // Initialize settings on store creation
  loadEditorSettings()

  // Cleanup
  const cleanup = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
  }

  return {
    // State
    documents: readonly(documents),
    activeDocumentId: readonly(activeDocumentId),
    isAutoSaving: readonly(isAutoSaving),
    lastSavedAt: readonly(lastSavedAt),
    editorSettings,

    // Getters
    activeDocument,
    hasUnsavedChanges,
    documentList,
    recentDocuments,

    // Actions
    createDocument,
    openDocument,
    updateDocument,
    updateActiveDocument,
    deleteDocument,
    duplicateDocument,
    saveDocument,
    saveActiveDocument,
    addToHistory,
    getDocumentHistory,
    updateEditorSettings,
    loadEditorSettings,
    searchDocuments,
    getDocumentsByType,
    getDocumentsByParent,
    exportDocument,
    importDocument,
    getDocumentStats,
    getTotalStats,
    cleanup
  }
})

/**
 * Document template store for managing reusable templates
 */
export const useTemplateStore = defineStore('templates', () => {
  const templates = ref(new Map())

  const createTemplate = (options = {}) => {
    const {
      title = 'Untitled Template',
      description = '',
      content = '',
      category = 'general',
      tags = []
    } = options

    const template = {
      id: nanoid(),
      title,
      description,
      content,
      category,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    }

    templates.value.set(template.id, template)
    return template
  }

  const getTemplatesByCategory = (category) => {
    return Array.from(templates.value.values())
      .filter(template => template.category === category)
      .sort((a, b) => b.usageCount - a.usageCount)
  }

  const useTemplate = (templateId) => {
    const template = templates.value.get(templateId)
    if (!template) return null

    // Increment usage count
    template.usageCount++
    templates.value.set(templateId, template)

    return template
  }

  // Built-in templates
  const builtInTemplates = [
    {
      title: 'Meeting Notes',
      description: 'Template for meeting notes with agenda and action items',
      content: `
        <h1>Meeting Notes</h1>
        <p><strong>Date:</strong> </p>
        <p><strong>Attendees:</strong> </p>
        
        <h2>Agenda</h2>
        <ul>
          <li></li>
        </ul>
        
        <h2>Discussion</h2>
        <p></p>
        
        <h2>Action Items</h2>
        <ul class="task-list">
          <li class="task-item"><label><input type="checkbox"> </label></li>
        </ul>
      `,
      category: 'work',
      tags: ['meeting', 'notes', 'agenda']
    },
    {
      title: 'Project Plan',
      description: 'Template for project planning and tracking',
      content: `
        <h1>Project Plan</h1>
        <p><strong>Project Name:</strong> </p>
        <p><strong>Start Date:</strong> </p>
        <p><strong>End Date:</strong> </p>
        
        <h2>Objectives</h2>
        <ul>
          <li></li>
        </ul>
        
        <h2>Tasks</h2>
        <ul class="task-list">
          <li class="task-item"><label><input type="checkbox"> </label></li>
        </ul>
        
        <h2>Resources</h2>
        <p></p>
        
        <h2>Timeline</h2>
        <p></p>
      `,
      category: 'work',
      tags: ['project', 'planning', 'tasks']
    },
    {
      title: 'Daily Journal',
      description: 'Template for daily journaling and reflection',
      content: `
        <h1>Daily Journal</h1>
        <p><strong>Date:</strong> </p>
        
        <h2>Today's Highlights</h2>
        <ul>
          <li></li>
        </ul>
        
        <h2>Thoughts & Reflections</h2>
        <p></p>
        
        <h2>Gratitude</h2>
        <ul>
          <li></li>
        </ul>
        
        <h2>Tomorrow's Goals</h2>
        <ul class="task-list">
          <li class="task-item"><label><input type="checkbox"> </label></li>
        </ul>
      `,
      category: 'personal',
      tags: ['journal', 'daily', 'reflection']
    }
  ]

  // Initialize built-in templates
  builtInTemplates.forEach(template => {
    createTemplate(template)
  })

  return {
    templates: readonly(templates),
    createTemplate,
    getTemplatesByCategory,
    useTemplate
  }
})