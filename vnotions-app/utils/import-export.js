/**
 * Import/Export utilities for VNotions
 * Handles importing from various sources and exporting to different formats
 */

import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

class ImportExportManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath
    this.tempDir = path.join(workspacePath, '.vnotions', 'temp')
    this.supportedImportFormats = ['notion', 'markdown', 'csv', 'json']
    this.supportedExportFormats = ['markdown', 'html', 'pdf', 'json', 'csv']
  }

  /**
   * Initialize temporary directory
   */
  async initTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Import from Notion export
   */
  async importFromNotion(filePath, options = {}) {
    try {
      const { 
        preserveIds = false,
        convertToVNotions = true,
        createBackup = true
      } = options

      if (createBackup) {
        await this.createBackup()
      }

      // Read Notion export file (usually ZIP or JSON)
      const fileExtension = path.extname(filePath).toLowerCase()
      let notionData

      if (fileExtension === '.json') {
        const content = await fs.readFile(filePath, 'utf-8')
        notionData = JSON.parse(content)
      } else if (fileExtension === '.zip') {
        notionData = await this.extractNotionZip(filePath)
      } else {
        throw new Error('Unsupported Notion export format')
      }

      const importedPages = []
      const importedDatabases = []

      // Process Notion pages
      if (notionData.pages) {
        for (const notionPage of notionData.pages) {
          const vnotionsPage = await this.convertNotionPage(notionPage, preserveIds)
          await this.saveImportedPage(vnotionsPage)
          importedPages.push(vnotionsPage.id)
        }
      }

      // Process Notion databases
      if (notionData.databases) {
        for (const notionDb of notionData.databases) {
          const vnotionsDb = await this.convertNotionDatabase(notionDb, preserveIds)
          await this.saveImportedDatabase(vnotionsDb)
          importedDatabases.push(vnotionsDb.id)
        }
      }

      return {
        success: true,
        data: {
          pages: importedPages,
          databases: importedDatabases,
          totalItems: importedPages.length + importedDatabases.length
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Import from Markdown files
   */
  async importFromMarkdown(filePaths, options = {}) {
    try {
      const { 
        preserveStructure = true,
        convertHeaders = true,
        extractFrontmatter = true
      } = options

      const importedPages = []

      for (const filePath of filePaths) {
        const content = await fs.readFile(filePath, 'utf-8')
        const fileName = path.basename(filePath, '.md')
        
        const vnotionsPage = await this.convertMarkdownToPage(
          content, 
          fileName, 
          { convertHeaders, extractFrontmatter }
        )
        
        await this.saveImportedPage(vnotionsPage)
        importedPages.push(vnotionsPage.id)
      }

      return {
        success: true,
        data: {
          pages: importedPages,
          totalItems: importedPages.length
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Import from CSV for databases
   */
  async importFromCSV(filePath, options = {}) {
    try {
      const {
        hasHeaders = true,
        delimiter = ',',
        databaseName = null,
        columnTypes = {}
      } = options

      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty')
      }

      // Parse CSV
      const parsedData = this.parseCSV(lines, delimiter)
      const headers = hasHeaders ? parsedData[0] : this.generateHeaders(parsedData[0].length)
      const rows = hasHeaders ? parsedData.slice(1) : parsedData

      // Create database schema
      const schema = this.createSchemaFromCSV(headers, rows, columnTypes)
      
      // Create VNotions database
      const vnotionsDb = {
        id: uuidv4(),
        title: databaseName || path.basename(filePath, '.csv'),
        type: 'database',
        schema,
        rows: rows.map((row, index) => ({
          id: uuidv4(),
          data: this.createRowData(headers, row, schema)
        })),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }

      await this.saveImportedDatabase(vnotionsDb)

      return {
        success: true,
        data: {
          databaseId: vnotionsDb.id,
          rowCount: rows.length,
          columns: headers.length
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Export pages to Markdown
   */
  async exportToMarkdown(pageIds, outputPath, options = {}) {
    try {
      const {
        includeMetadata = true,
        preserveFormatting = true,
        createZip = false
      } = options

      const exportedFiles = []

      for (const pageId of pageIds) {
        const page = await this.loadPage(pageId)
        const markdown = await this.convertPageToMarkdown(page, {
          includeMetadata,
          preserveFormatting
        })

        const fileName = `${this.sanitizeFileName(page.title)}.md`
        const filePath = path.join(outputPath, fileName)
        
        await fs.writeFile(filePath, markdown, 'utf-8')
        exportedFiles.push(filePath)
      }

      if (createZip) {
        const zipPath = await this.createZipArchive(exportedFiles, outputPath)
        return {
          success: true,
          data: {
            format: 'zip',
            path: zipPath,
            files: exportedFiles.length
          }
        }
      }

      return {
        success: true,
        data: {
          format: 'markdown',
          path: outputPath,
          files: exportedFiles
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Export pages to HTML
   */
  async exportToHTML(pageIds, outputPath, options = {}) {
    try {
      const {
        includeCSS = true,
        standalone = true,
        theme = 'light'
      } = options

      const exportedFiles = []

      for (const pageId of pageIds) {
        const page = await this.loadPage(pageId)
        const html = await this.convertPageToHTML(page, {
          includeCSS,
          standalone,
          theme
        })

        const fileName = `${this.sanitizeFileName(page.title)}.html`
        const filePath = path.join(outputPath, fileName)
        
        await fs.writeFile(filePath, html, 'utf-8')
        exportedFiles.push(filePath)
      }

      return {
        success: true,
        data: {
          format: 'html',
          path: outputPath,
          files: exportedFiles
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Export to JSON
   */
  async exportToJSON(pageIds, outputPath, options = {}) {
    try {
      const {
        includeMetadata = true,
        minify = false,
        singleFile = true
      } = options

      if (singleFile) {
        const exportData = {
          export: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'VNotions'
          },
          pages: []
        }

        for (const pageId of pageIds) {
          const page = await this.loadPage(pageId)
          if (includeMetadata) {
            exportData.pages.push(page)
          } else {
            const { createdAt, lastModified, ...pageWithoutMeta } = page
            exportData.pages.push(pageWithoutMeta)
          }
        }

        const json = minify ? JSON.stringify(exportData) : JSON.stringify(exportData, null, 2)
        const filePath = path.join(outputPath, 'vnotions-export.json')
        
        await fs.writeFile(filePath, json, 'utf-8')

        return {
          success: true,
          data: {
            format: 'json',
            path: filePath,
            pages: pageIds.length
          }
        }
      } else {
        // Export each page as separate JSON file
        const exportedFiles = []

        for (const pageId of pageIds) {
          const page = await this.loadPage(pageId)
          const json = minify ? JSON.stringify(page) : JSON.stringify(page, null, 2)
          
          const fileName = `${this.sanitizeFileName(page.title)}.json`
          const filePath = path.join(outputPath, fileName)
          
          await fs.writeFile(filePath, json, 'utf-8')
          exportedFiles.push(filePath)
        }

        return {
          success: true,
          data: {
            format: 'json',
            path: outputPath,
            files: exportedFiles
          }
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Export database to CSV
   */
  async exportDatabaseToCSV(databaseId, outputPath, options = {}) {
    try {
      const {
        includeHeaders = true,
        delimiter = ',',
        dateFormat = 'ISO'
      } = options

      const database = await this.loadDatabase(databaseId)
      const csv = this.convertDatabaseToCSV(database, {
        includeHeaders,
        delimiter,
        dateFormat
      })

      const fileName = `${this.sanitizeFileName(database.title)}.csv`
      const filePath = path.join(outputPath, fileName)
      
      await fs.writeFile(filePath, csv, 'utf-8')

      return {
        success: true,
        data: {
          format: 'csv',
          path: filePath,
          rows: database.rows.length
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Convert Notion page to VNotions format
   */
  async convertNotionPage(notionPage, preserveIds = false) {
    const vnotionsPage = {
      id: preserveIds ? notionPage.id : uuidv4(),
      title: notionPage.title || 'Untitled',
      type: 'page',
      content: {
        blocks: await this.convertNotionBlocks(notionPage.content || [])
      },
      properties: this.convertNotionProperties(notionPage.properties || {}),
      createdAt: notionPage.created_time || new Date().toISOString(),
      lastModified: notionPage.last_edited_time || new Date().toISOString(),
      parent: notionPage.parent || null
    }

    return vnotionsPage
  }

  /**
   * Convert Notion blocks to VNotions blocks
   */
  async convertNotionBlocks(notionBlocks) {
    const vnotionsBlocks = []

    for (const block of notionBlocks) {
      const vnotionsBlock = await this.convertNotionBlock(block)
      if (vnotionsBlock) {
        vnotionsBlocks.push(vnotionsBlock)
      }
    }

    return vnotionsBlocks
  }

  /**
   * Convert single Notion block
   */
  async convertNotionBlock(notionBlock) {
    const { type, content } = notionBlock

    switch (type) {
      case 'paragraph':
        return {
          id: uuidv4(),
          type: 'paragraph',
          content: {
            text: content.rich_text?.map(t => t.plain_text).join('') || ''
          }
        }

      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return {
          id: uuidv4(),
          type: 'heading',
          content: {
            level: parseInt(type.split('_')[1]),
            text: content.rich_text?.map(t => t.plain_text).join('') || ''
          }
        }

      case 'bulleted_list_item':
      case 'numbered_list_item':
        return {
          id: uuidv4(),
          type: 'list',
          content: {
            listType: type === 'bulleted_list_item' ? 'bullet' : 'number',
            items: [content.rich_text?.map(t => t.plain_text).join('') || '']
          }
        }

      case 'code':
        return {
          id: uuidv4(),
          type: 'code',
          content: {
            language: content.language || 'text',
            code: content.rich_text?.map(t => t.plain_text).join('') || ''
          }
        }

      case 'quote':
        return {
          id: uuidv4(),
          type: 'quote',
          content: {
            text: content.rich_text?.map(t => t.plain_text).join('') || ''
          }
        }

      default:
        // For unsupported blocks, create a paragraph
        return {
          id: uuidv4(),
          type: 'paragraph',
          content: {
            text: `[${type}] ${content.rich_text?.map(t => t.plain_text).join('') || ''}`
          }
        }
    }
  }

  /**
   * Convert page to Markdown
   */
  async convertPageToMarkdown(page, options = {}) {
    const { includeMetadata = true, preserveFormatting = true } = options
    let markdown = ''

    // Add metadata as frontmatter
    if (includeMetadata) {
      markdown += '---\n'
      markdown += `title: "${page.title}"\n`
      markdown += `id: ${page.id}\n`
      markdown += `created: ${page.createdAt}\n`
      markdown += `modified: ${page.lastModified}\n`
      markdown += '---\n\n'
    }

    // Add title
    markdown += `# ${page.title}\n\n`

    // Convert blocks
    if (page.content?.blocks) {
      for (const block of page.content.blocks) {
        markdown += this.convertBlockToMarkdown(block) + '\n\n'
      }
    }

    return markdown.trim()
  }

  /**
   * Convert block to Markdown
   */
  convertBlockToMarkdown(block) {
    switch (block.type) {
      case 'paragraph':
        return block.content?.text || ''

      case 'heading':
        const level = block.content?.level || 1
        const hashes = '#'.repeat(level + 1)
        return `${hashes} ${block.content?.text || ''}`

      case 'list':
        const listType = block.content?.listType || 'bullet'
        const marker = listType === 'bullet' ? '-' : '1.'
        return block.content?.items?.map(item => `${marker} ${item}`).join('\n') || ''

      case 'code':
        const language = block.content?.language || ''
        const code = block.content?.code || ''
        return `\`\`\`${language}\n${code}\n\`\`\``

      case 'quote':
        return `> ${block.content?.text || ''}`

      default:
        return block.content?.text || ''
    }
  }

  /**
   * Create backup before import
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(this.workspacePath, '.vnotions', 'backups', timestamp)
    
    await fs.mkdir(backupDir, { recursive: true })
    
    // Copy current workspace
    await this.copyDirectory(
      path.join(this.workspacePath, 'pages'),
      path.join(backupDir, 'pages')
    )
    
    try {
      await this.copyDirectory(
        path.join(this.workspacePath, 'databases'),
        path.join(backupDir, 'databases')
      )
    } catch (error) {
      // Databases folder might not exist
    }

    return backupDir
  }

  /**
   * Parse CSV content
   */
  parseCSV(lines, delimiter = ',') {
    return lines.map(line => {
      const cells = []
      let currentCell = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
          cells.push(currentCell.trim())
          currentCell = ''
        } else {
          currentCell += char
        }
      }
      
      cells.push(currentCell.trim())
      return cells
    })
  }

  /**
   * Sanitize filename for export
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .substring(0, 100)
  }

  /**
   * Load page from workspace
   */
  async loadPage(pageId) {
    const filePath = path.join(this.workspacePath, 'pages', `${pageId}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  }

  /**
   * Load database from workspace
   */
  async loadDatabase(databaseId) {
    const filePath = path.join(this.workspacePath, 'databases', `${databaseId}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  }

  /**
   * Save imported page
   */
  async saveImportedPage(page) {
    const pagesDir = path.join(this.workspacePath, 'pages')
    await fs.mkdir(pagesDir, { recursive: true })
    
    const filePath = path.join(pagesDir, `${page.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(page, null, 2), 'utf-8')
  }

  /**
   * Save imported database
   */
  async saveImportedDatabase(database) {
    const databasesDir = path.join(this.workspacePath, 'databases')
    await fs.mkdir(databasesDir, { recursive: true })
    
    const filePath = path.join(databasesDir, `${database.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(database, null, 2), 'utf-8')
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return {
      import: this.supportedImportFormats,
      export: this.supportedExportFormats
    }
  }
}

export default ImportExportManager