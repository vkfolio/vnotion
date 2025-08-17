/**
 * FlexSearch implementation for VNotions
 * Provides full-text search functionality across pages and databases
 */

import FlexSearch from 'flexsearch'
import { promises as fs } from 'fs'
import path from 'path'

class SearchManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath
    this.pagesIndex = null
    this.titlesIndex = null
    this.databasesIndex = null
    this.isInitialized = false
    this.searchHistory = []
    this.maxHistoryItems = 50
    
    this.initializeIndexes()
  }

  /**
   * Initialize FlexSearch indexes
   */
  initializeIndexes() {
    // Main content index with advanced options
    this.pagesIndex = new FlexSearch.Index({
      preset: 'match',
      tokenize: 'forward',
      resolution: 9,
      minlength: 2,
      optimize: true,
      fastupdate: true
    })

    // Titles index for quick title matching
    this.titlesIndex = new FlexSearch.Index({
      preset: 'score',
      tokenize: 'strict',
      resolution: 5,
      minlength: 1
    })

    // Database content index
    this.databasesIndex = new FlexSearch.Index({
      preset: 'match',
      tokenize: 'forward',
      resolution: 7,
      minlength: 2
    })

    this.isInitialized = true
  }

  /**
   * Index all content in workspace
   */
  async indexWorkspace() {
    try {
      const pagesPath = path.join(this.workspacePath, 'pages')
      const databasesPath = path.join(this.workspacePath, 'databases')

      // Index pages
      await this.indexPages(pagesPath)
      
      // Index databases if they exist
      try {
        await fs.access(databasesPath)
        await this.indexDatabases(databasesPath)
      } catch (error) {
        // Databases folder doesn't exist yet
      }

      return { success: true, message: 'Workspace indexed successfully' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Index all pages
   */
  async indexPages(pagesPath) {
    try {
      const files = await fs.readdir(pagesPath)
      const pageFiles = files.filter(file => file.endsWith('.json'))

      for (const file of pageFiles) {
        const filePath = path.join(pagesPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const pageData = JSON.parse(content)
        
        await this.indexPage(pageData)
      }
    } catch (error) {
      console.error('Error indexing pages:', error)
    }
  }

  /**
   * Index all databases
   */
  async indexDatabases(databasesPath) {
    try {
      const files = await fs.readdir(databasesPath)
      const dbFiles = files.filter(file => file.endsWith('.json'))

      for (const file of dbFiles) {
        const filePath = path.join(databasesPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const dbData = JSON.parse(content)
        
        await this.indexDatabase(dbData)
      }
    } catch (error) {
      console.error('Error indexing databases:', error)
    }
  }

  /**
   * Index a single page
   */
  async indexPage(pageData) {
    try {
      const { id, title, content, type, properties, children } = pageData

      // Extract text content from blocks
      const textContent = this.extractTextFromBlocks(content?.blocks || [])
      const fullContent = `${title} ${textContent}`.trim()

      // Index in main content index
      this.pagesIndex.add(id, fullContent)
      
      // Index title separately for better title matching
      this.titlesIndex.add(id, title)

      // Index properties if they exist
      if (properties) {
        const propertiesText = Object.values(properties)
          .filter(value => typeof value === 'string')
          .join(' ')
        
        if (propertiesText) {
          this.pagesIndex.add(`${id}_props`, propertiesText)
        }
      }

      return { success: true, pageId: id }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Index a database
   */
  async indexDatabase(dbData) {
    try {
      const { id, title, schema, rows } = dbData

      // Index database title and schema
      const schemaText = Object.values(schema)
        .map(field => `${field.name} ${field.type}`)
        .join(' ')
      
      this.databasesIndex.add(id, `${title} ${schemaText}`)

      // Index database rows
      if (rows) {
        rows.forEach((row, index) => {
          const rowText = Object.values(row.data || {})
            .filter(value => typeof value === 'string')
            .join(' ')
          
          if (rowText) {
            this.databasesIndex.add(`${id}_row_${index}`, rowText)
          }
        })
      }

      return { success: true, databaseId: id }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove page from index
   */
  async removePageFromIndex(pageId) {
    try {
      this.pagesIndex.remove(pageId)
      this.titlesIndex.remove(pageId)
      this.pagesIndex.remove(`${pageId}_props`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove database from index
   */
  async removeDatabaseFromIndex(dbId) {
    try {
      this.databasesIndex.remove(dbId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Search across all content
   */
  async search(query, options = {}) {
    try {
      const {
        type = 'all', // 'all', 'pages', 'databases', 'titles'
        limit = 50,
        offset = 0,
        includeContent = false
      } = options

      if (!query || query.trim().length < 2) {
        return { success: true, results: [], totalCount: 0 }
      }

      const cleanQuery = query.trim().toLowerCase()
      let results = []

      // Search based on type
      if (type === 'all' || type === 'pages') {
        const pageResults = await this.searchPages(cleanQuery, limit)
        results = results.concat(pageResults)
      }

      if (type === 'all' || type === 'titles') {
        const titleResults = await this.searchTitles(cleanQuery, limit)
        results = results.concat(titleResults)
      }

      if (type === 'all' || type === 'databases') {
        const dbResults = await this.searchDatabases(cleanQuery, limit)
        results = results.concat(dbResults)
      }

      // Remove duplicates and sort by relevance
      results = this.deduplicateResults(results)
      results = this.sortByRelevance(results, cleanQuery)

      // Apply pagination
      const totalCount = results.length
      const paginatedResults = results.slice(offset, offset + limit)

      // Add content if requested
      if (includeContent) {
        for (const result of paginatedResults) {
          result.content = await this.getResultContent(result.id, result.type)
        }
      }

      // Add to search history
      this.addToHistory(query, totalCount)

      return {
        success: true,
        results: paginatedResults,
        totalCount,
        query: cleanQuery
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Search pages content
   */
  async searchPages(query, limit) {
    const results = this.pagesIndex.search(query, { limit: limit * 2 })
    
    return results.map(id => ({
      id: typeof id === 'string' && id.includes('_props') ? id.split('_props')[0] : id,
      type: 'page',
      source: id.includes('_props') ? 'properties' : 'content',
      score: 1
    }))
  }

  /**
   * Search page titles
   */
  async searchTitles(query, limit) {
    const results = this.titlesIndex.search(query, { limit })
    
    return results.map(id => ({
      id,
      type: 'page',
      source: 'title',
      score: 2 // Higher score for title matches
    }))
  }

  /**
   * Search databases
   */
  async searchDatabases(query, limit) {
    const results = this.databasesIndex.search(query, { limit: limit * 2 })
    
    return results.map(id => ({
      id: id.includes('_row_') ? id.split('_row_')[0] : id,
      type: 'database',
      source: id.includes('_row_') ? 'row' : 'schema',
      rowIndex: id.includes('_row_') ? parseInt(id.split('_row_')[1]) : null,
      score: 1
    }))
  }

  /**
   * Get suggestions for query
   */
  async getSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return { success: true, suggestions: [] }
      }

      // Get partial matches from titles
      const titleMatches = this.titlesIndex.search(query, { limit })
      
      // Get recent searches that match
      const recentMatches = this.searchHistory
        .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map(item => item.query)

      const suggestions = [
        ...new Set([
          ...titleMatches.map(id => this.getPageTitle(id)),
          ...recentMatches
        ])
      ].slice(0, limit)

      return { success: true, suggestions }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get recent searches
   */
  getRecentSearches(limit = 10) {
    return this.searchHistory
      .slice(-limit)
      .reverse()
      .map(item => ({
        query: item.query,
        timestamp: item.timestamp,
        resultCount: item.resultCount
      }))
  }

  /**
   * Clear search history
   */
  clearHistory() {
    this.searchHistory = []
    return { success: true, message: 'Search history cleared' }
  }

  /**
   * Extract text content from editor blocks
   */
  extractTextFromBlocks(blocks) {
    let text = ''
    
    for (const block of blocks) {
      if (block.type === 'paragraph' || block.type === 'heading') {
        text += block.content?.text || ''
        text += ' '
      } else if (block.type === 'list') {
        if (block.content?.items) {
          text += block.content.items.join(' ') + ' '
        }
      } else if (block.type === 'code') {
        text += block.content?.code || ''
        text += ' '
      } else if (block.type === 'quote') {
        text += block.content?.text || ''
        text += ' '
      }

      // Process nested blocks
      if (block.children && block.children.length > 0) {
        text += this.extractTextFromBlocks(block.children)
      }
    }
    
    return text.trim()
  }

  /**
   * Remove duplicate results
   */
  deduplicateResults(results) {
    const seen = new Map()
    const deduplicated = []

    for (const result of results) {
      const key = `${result.id}_${result.type}`
      if (!seen.has(key) || seen.get(key).score < result.score) {
        seen.set(key, result)
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Sort results by relevance
   */
  sortByRelevance(results, query) {
    return results.sort((a, b) => {
      // Title matches get highest priority
      if (a.source === 'title' && b.source !== 'title') return -1
      if (b.source === 'title' && a.source !== 'title') return 1
      
      // Then by score
      return b.score - a.score
    })
  }

  /**
   * Add search to history
   */
  addToHistory(query, resultCount) {
    this.searchHistory.push({
      query,
      timestamp: new Date().toISOString(),
      resultCount
    })

    // Keep only recent searches
    if (this.searchHistory.length > this.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(-this.maxHistoryItems)
    }
  }

  /**
   * Get result content for display
   */
  async getResultContent(id, type) {
    try {
      let filePath
      if (type === 'page') {
        filePath = path.join(this.workspacePath, 'pages', `${id}.json`)
      } else if (type === 'database') {
        filePath = path.join(this.workspacePath, 'databases', `${id}.json`)
      }

      const content = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      
      return {
        title: data.title,
        excerpt: this.createExcerpt(data),
        lastModified: data.lastModified
      }
    } catch (error) {
      return {
        title: 'Unknown',
        excerpt: '',
        lastModified: null
      }
    }
  }

  /**
   * Create excerpt from content
   */
  createExcerpt(data, maxLength = 200) {
    let text = ''
    
    if (data.content?.blocks) {
      text = this.extractTextFromBlocks(data.content.blocks)
    } else if (data.schema) {
      // For databases, show schema info
      text = Object.values(data.schema)
        .map(field => field.name)
        .join(', ')
    }

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...'
    }

    return text
  }

  /**
   * Get page title by ID (cache this in real implementation)
   */
  getPageTitle(id) {
    // This would normally be cached or retrieved from a title index
    return `Page ${id}`
  }

  /**
   * Export search index for backup
   */
  async exportIndex() {
    try {
      return {
        success: true,
        data: {
          pages: this.pagesIndex.export(),
          titles: this.titlesIndex.export(),
          databases: this.databasesIndex.export(),
          history: this.searchHistory
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Import search index from backup
   */
  async importIndex(indexData) {
    try {
      if (indexData.pages) {
        this.pagesIndex.import(indexData.pages)
      }
      if (indexData.titles) {
        this.titlesIndex.import(indexData.titles)
      }
      if (indexData.databases) {
        this.databasesIndex.import(indexData.databases)
      }
      if (indexData.history) {
        this.searchHistory = indexData.history
      }

      return { success: true, message: 'Search index imported successfully' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get search statistics
   */
  getStatistics() {
    return {
      totalQueries: this.searchHistory.length,
      indexedPages: this.pagesIndex.length || 0,
      indexedDatabases: this.databasesIndex.length || 0,
      lastIndexed: new Date().toISOString(),
      isInitialized: this.isInitialized
    }
  }
}

export default SearchManager