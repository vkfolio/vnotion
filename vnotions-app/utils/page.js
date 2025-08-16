/**
 * Page utilities for VNotions
 * Handles page creation, formatting, validation, and operations
 */

import { generateUUID, isValidUUID } from './uuid.js'

/**
 * Default page template
 */
const DEFAULT_PAGE = {
  id: null,
  title: 'Untitled',
  icon: '📄',
  content: {
    type: 'doc',
    content: []
  },
  parent: null,
  children: [],
  created: null,
  modified: null,
  properties: {},
  deleted: false,
  deletedAt: null
}

/**
 * Create a new page object
 * @param {Object} options - Page creation options
 * @param {string} [options.title] - Page title
 * @param {string} [options.icon] - Page icon (emoji)
 * @param {Object} [options.content] - TipTap JSON content
 * @param {string|null} [options.parent] - Parent page UUID
 * @param {Object} [options.properties] - Custom metadata
 * @returns {Object} New page object
 */
export function createPage(options = {}) {
  const now = new Date().toISOString()
  
  return {
    ...DEFAULT_PAGE,
    id: generateUUID(),
    title: options.title || DEFAULT_PAGE.title,
    icon: options.icon || DEFAULT_PAGE.icon,
    content: options.content || DEFAULT_PAGE.content,
    parent: options.parent || null,
    properties: options.properties || {},
    created: now,
    modified: now
  }
}

/**
 * Create a page from template
 * @param {Object} template - Template object
 * @param {Object} options - Override options
 * @returns {Object} New page object
 */
export function createPageFromTemplate(template, options = {}) {
  return createPage({
    title: options.title || template.title || 'Untitled',
    icon: options.icon || template.icon || '📄',
    content: options.content || template.content || DEFAULT_PAGE.content,
    parent: options.parent || null,
    properties: { ...template.properties, ...options.properties }
  })
}

/**
 * Validate page data structure
 * @param {Object} page - Page object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validatePage(page) {
  const errors = []
  
  // Required fields
  if (!page.id || !isValidUUID(page.id)) {
    errors.push('Invalid or missing page ID')
  }
  
  if (!page.title || typeof page.title !== 'string') {
    errors.push('Invalid or missing page title')
  }
  
  if (!page.created || !isValidDate(page.created)) {
    errors.push('Invalid or missing created timestamp')
  }
  
  if (!page.modified || !isValidDate(page.modified)) {
    errors.push('Invalid or missing modified timestamp')
  }
  
  // Optional fields validation
  if (page.parent && !isValidUUID(page.parent)) {
    errors.push('Invalid parent UUID')
  }
  
  if (!Array.isArray(page.children)) {
    errors.push('Children must be an array')
  } else {
    for (const childId of page.children) {
      if (!isValidUUID(childId)) {
        errors.push(`Invalid child UUID: ${childId}`)
      }
    }
  }
  
  if (page.properties && typeof page.properties !== 'object') {
    errors.push('Properties must be an object')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Update page modified timestamp
 * @param {Object} page - Page object to update
 * @returns {Object} Updated page object
 */
export function touchPage(page) {
  return {
    ...page,
    modified: new Date().toISOString()
  }
}

/**
 * Move page to trash (soft delete)
 * @param {Object} page - Page object to delete
 * @returns {Object} Updated page object
 */
export function deletePage(page) {
  return {
    ...page,
    deleted: true,
    deletedAt: new Date().toISOString(),
    modified: new Date().toISOString()
  }
}

/**
 * Restore page from trash
 * @param {Object} page - Page object to restore
 * @returns {Object} Updated page object
 */
export function restorePage(page) {
  return {
    ...page,
    deleted: false,
    deletedAt: null,
    modified: new Date().toISOString()
  }
}

/**
 * Duplicate page with new UUID
 * @param {Object} page - Page object to duplicate
 * @param {Object} options - Duplication options
 * @returns {Object} Duplicated page object
 */
export function duplicatePage(page, options = {}) {
  const now = new Date().toISOString()
  
  return {
    ...page,
    id: generateUUID(),
    title: options.title || `${page.title} (Copy)`,
    parent: options.parent !== undefined ? options.parent : page.parent,
    children: [], // Don't duplicate children
    created: now,
    modified: now,
    deleted: false,
    deletedAt: null
  }
}

/**
 * Extract page breadcrumb path
 * @param {Object} page - Current page
 * @param {Map} pageMap - Map of all pages by ID
 * @returns {Array} Array of page objects representing the breadcrumb path
 */
export function getPageBreadcrumb(page, pageMap) {
  const breadcrumb = []
  let currentPage = page
  
  // Prevent infinite loops
  const visited = new Set()
  
  while (currentPage && currentPage.parent && !visited.has(currentPage.id)) {
    visited.add(currentPage.id)
    const parentPage = pageMap.get(currentPage.parent)
    if (parentPage) {
      breadcrumb.unshift(parentPage)
      currentPage = parentPage
    } else {
      break
    }
  }
  
  return breadcrumb
}

/**
 * Get page file path for storage
 * @param {string} pageId - Page UUID
 * @returns {string} File path for page storage
 */
export function getPageFilePath(pageId) {
  return `pages/${pageId}.json`
}

/**
 * Generate page slug for URLs
 * @param {string} title - Page title
 * @returns {string} URL-safe slug
 */
export function generatePageSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
    .substring(0, 50) // Limit length
}

/**
 * Check if date string is valid
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid date
 */
function isValidDate(dateStr) {
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date)
}

/**
 * Search pages by title or content
 * @param {Array} pages - Array of page objects
 * @param {string} query - Search query
 * @returns {Array} Filtered array of pages
 */
export function searchPages(pages, query) {
  if (!query || typeof query !== 'string') {
    return pages
  }
  
  const lowercaseQuery = query.toLowerCase()
  
  return pages.filter(page => {
    // Search in title
    if (page.title.toLowerCase().includes(lowercaseQuery)) {
      return true
    }
    
    // Search in content (basic text extraction)
    const contentText = extractTextFromContent(page.content)
    if (contentText.toLowerCase().includes(lowercaseQuery)) {
      return true
    }
    
    return false
  })
}

/**
 * Extract plain text from TipTap JSON content
 * @param {Object} content - TipTap JSON content
 * @returns {string} Plain text content
 */
export function extractTextFromContent(content) {
  if (!content || !content.content) {
    return ''
  }
  
  let text = ''
  
  function extractFromNode(node) {
    if (node.text) {
      text += node.text
    }
    
    if (node.content) {
      for (const child of node.content) {
        extractFromNode(child)
      }
    }
  }
  
  for (const node of content.content) {
    extractFromNode(node)
  }
  
  return text
}

/**
 * Page property types and validation
 */
export const PAGE_PROPERTY_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
  PHONE: 'phone'
}

/**
 * Validate page property value
 * @param {*} value - Property value
 * @param {string} type - Property type
 * @returns {boolean} True if valid
 */
export function validatePageProperty(value, type) {
  switch (type) {
    case PAGE_PROPERTY_TYPES.TEXT:
      return typeof value === 'string'
    case PAGE_PROPERTY_TYPES.NUMBER:
      return typeof value === 'number' && !isNaN(value)
    case PAGE_PROPERTY_TYPES.SELECT:
      return typeof value === 'string'
    case PAGE_PROPERTY_TYPES.MULTI_SELECT:
      return Array.isArray(value) && value.every(v => typeof v === 'string')
    case PAGE_PROPERTY_TYPES.DATE:
      return isValidDate(value)
    case PAGE_PROPERTY_TYPES.CHECKBOX:
      return typeof value === 'boolean'
    case PAGE_PROPERTY_TYPES.URL:
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    case PAGE_PROPERTY_TYPES.EMAIL:
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    case PAGE_PROPERTY_TYPES.PHONE:
      return typeof value === 'string' && /^[\d\s\-\+\(\)]+$/.test(value)
    default:
      return false
  }
}