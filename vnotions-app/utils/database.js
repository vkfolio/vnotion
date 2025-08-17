/**
 * Database Utilities
 * Helper functions for database operations, validation, and data transformations
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Column types supported by the database system
 */
export const COLUMN_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
  PHONE: 'phone',
  FILE: 'file',
  RELATION: 'relation',
  FORMULA: 'formula',
  CREATED_TIME: 'created_time',
  LAST_EDITED_TIME: 'last_edited_time',
  CREATED_BY: 'created_by',
  LAST_EDITED_BY: 'last_edited_by'
}

/**
 * View types supported by the database system
 */
export const VIEW_TYPES = {
  TABLE: 'table',
  BOARD: 'board',
  CALENDAR: 'calendar',
  LIST: 'list',
  GALLERY: 'gallery',
  TIMELINE: 'timeline'
}

/**
 * Filter operators by column type
 */
export const FILTER_OPERATORS = {
  [COLUMN_TYPES.TEXT]: ['equals', 'does_not_equal', 'contains', 'does_not_contain', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.NUMBER]: ['equals', 'does_not_equal', 'greater_than', 'less_than', 'greater_than_or_equal_to', 'less_than_or_equal_to', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.SELECT]: ['equals', 'does_not_equal', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.MULTI_SELECT]: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.DATE]: ['equals', 'before', 'after', 'on_or_before', 'on_or_after', 'is_empty', 'is_not_empty', 'past_week', 'past_month', 'past_year', 'next_week', 'next_month', 'next_year'],
  [COLUMN_TYPES.CHECKBOX]: ['checked', 'unchecked'],
  [COLUMN_TYPES.URL]: ['equals', 'does_not_equal', 'contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.EMAIL]: ['equals', 'does_not_equal', 'contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.PHONE]: ['equals', 'does_not_equal', 'contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  [COLUMN_TYPES.FILE]: ['is_empty', 'is_not_empty'],
  [COLUMN_TYPES.RELATION]: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty']
}

/**
 * Sort directions
 */
export const SORT_DIRECTIONS = {
  ASC: 'ascending',
  DESC: 'descending'
}

/**
 * Create a new database
 * @param {Object} options - Database creation options
 * @returns {Object} Database object
 */
export function createDatabase(options = {}) {
  const now = new Date().toISOString()
  
  return {
    id: options.id || uuidv4(),
    title: options.title || 'Untitled Database',
    description: options.description || '',
    icon: options.icon || '📋',
    created: options.created || now,
    modified: options.modified || now,
    created_by: options.created_by || 'system',
    last_edited_by: options.last_edited_by || 'system',
    parent: options.parent || null,
    deleted: false,
    
    // Database-specific properties
    columns: options.columns || [
      createColumn({
        name: 'Name',
        type: COLUMN_TYPES.TEXT,
        primary: true
      })
    ],
    rows: options.rows || [],
    views: options.views || [
      createView({
        name: 'All',
        type: VIEW_TYPES.TABLE,
        is_default: true
      })
    ],
    relations: options.relations || [],
    
    // Settings
    settings: {
      allow_public_access: false,
      allow_comments: true,
      show_properties: true,
      ...options.settings
    }
  }
}

/**
 * Create a new database column
 * @param {Object} options - Column creation options
 * @returns {Object} Column object
 */
export function createColumn(options = {}) {
  const column = {
    id: options.id || uuidv4(),
    name: options.name || 'Untitled',
    type: options.type || COLUMN_TYPES.TEXT,
    primary: options.primary || false,
    required: options.required || false,
    description: options.description || '',
    width: options.width || 150,
    visible: options.visible !== false,
    position: options.position || 0,
    
    // Type-specific configuration
    config: {}
  }

  // Add type-specific configuration
  switch (options.type) {
    case COLUMN_TYPES.SELECT:
    case COLUMN_TYPES.MULTI_SELECT:
      column.config.options = options.config?.options || []
      break
    
    case COLUMN_TYPES.NUMBER:
      column.config.format = options.config?.format || 'number'
      column.config.precision = options.config?.precision || 0
      break
    
    case COLUMN_TYPES.DATE:
      column.config.format = options.config?.format || 'MM/DD/YYYY'
      column.config.include_time = options.config?.include_time || false
      break
    
    case COLUMN_TYPES.FORMULA:
      column.config.formula = options.config?.formula || ''
      break
    
    case COLUMN_TYPES.RELATION:
      column.config.database_id = options.config?.database_id || null
      column.config.relation_property = options.config?.relation_property || null
      column.config.multiple = options.config?.multiple || false
      break
  }

  return column
}

/**
 * Create a new database view
 * @param {Object} options - View creation options
 * @returns {Object} View object
 */
export function createView(options = {}) {
  return {
    id: options.id || uuidv4(),
    name: options.name || 'Untitled View',
    type: options.type || VIEW_TYPES.TABLE,
    is_default: options.is_default || false,
    
    // View configuration
    config: {
      // Column visibility and order
      visible_columns: options.config?.visible_columns || [],
      column_order: options.config?.column_order || [],
      column_widths: options.config?.column_widths || {},
      
      // Filters
      filters: options.config?.filters || [],
      filter_operator: options.config?.filter_operator || 'and', // 'and' or 'or'
      
      // Sorting
      sorts: options.config?.sorts || [],
      
      // Grouping
      group_by: options.config?.group_by || null,
      
      // View-specific settings
      ...getViewTypeDefaults(options.type),
      ...options.config
    }
  }
}

/**
 * Get default configuration for view type
 * @param {string} viewType - View type
 * @returns {Object} Default configuration
 */
function getViewTypeDefaults(viewType) {
  switch (viewType) {
    case VIEW_TYPES.BOARD:
      return {
        group_by_column: null,
        card_size: 'medium',
        show_empty_groups: true
      }
    
    case VIEW_TYPES.CALENDAR:
      return {
        date_column: null,
        calendar_view: 'month' // 'month', 'week', 'day'
      }
    
    case VIEW_TYPES.GALLERY:
      return {
        card_size: 'medium',
        fit_type: 'cover', // 'cover', 'contain'
        cards_per_row: 4
      }
    
    case VIEW_TYPES.TIMELINE:
      return {
        date_column: null,
        end_date_column: null,
        timeline_view: 'months' // 'days', 'weeks', 'months', 'years'
      }
    
    default:
      return {}
  }
}

/**
 * Create a new database row
 * @param {Object} options - Row creation options
 * @returns {Object} Row object
 */
export function createRow(options = {}) {
  const now = new Date().toISOString()
  
  return {
    id: options.id || uuidv4(),
    created: options.created || now,
    modified: options.modified || now,
    created_by: options.created_by || 'system',
    last_edited_by: options.last_edited_by || 'system',
    
    // Row data (column_id -> value)
    data: options.data || {}
  }
}

/**
 * Validate database structure
 * @param {Object} database - Database object to validate
 * @returns {Object} Validation result
 */
export function validateDatabase(database) {
  const errors = []

  if (!database.id) errors.push('Database ID is required')
  if (!database.title) errors.push('Database title is required')
  if (!Array.isArray(database.columns)) errors.push('Database must have columns array')
  if (!Array.isArray(database.rows)) errors.push('Database must have rows array')
  if (!Array.isArray(database.views)) errors.push('Database must have views array')

  // Validate columns
  const columnIds = new Set()
  let hasPrimaryColumn = false
  
  database.columns?.forEach((column, index) => {
    if (!column.id) errors.push(`Column ${index} missing ID`)
    if (!column.name) errors.push(`Column ${index} missing name`)
    if (!Object.values(COLUMN_TYPES).includes(column.type)) {
      errors.push(`Column ${index} has invalid type: ${column.type}`)
    }
    
    if (columnIds.has(column.id)) {
      errors.push(`Duplicate column ID: ${column.id}`)
    }
    columnIds.add(column.id)
    
    if (column.primary) {
      if (hasPrimaryColumn) {
        errors.push('Multiple primary columns found')
      }
      hasPrimaryColumn = true
    }
  })

  if (!hasPrimaryColumn && database.columns?.length > 0) {
    errors.push('Database must have a primary column')
  }

  // Validate views
  const viewIds = new Set()
  let hasDefaultView = false
  
  database.views?.forEach((view, index) => {
    if (!view.id) errors.push(`View ${index} missing ID`)
    if (!view.name) errors.push(`View ${index} missing name`)
    if (!Object.values(VIEW_TYPES).includes(view.type)) {
      errors.push(`View ${index} has invalid type: ${view.type}`)
    }
    
    if (viewIds.has(view.id)) {
      errors.push(`Duplicate view ID: ${view.id}`)
    }
    viewIds.add(view.id)
    
    if (view.is_default) {
      if (hasDefaultView) {
        errors.push('Multiple default views found')
      }
      hasDefaultView = true
    }
  })

  if (!hasDefaultView && database.views?.length > 0) {
    errors.push('Database must have a default view')
  }

  // Validate rows
  database.rows?.forEach((row, index) => {
    if (!row.id) errors.push(`Row ${index} missing ID`)
    if (!row.data || typeof row.data !== 'object') {
      errors.push(`Row ${index} missing or invalid data`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Apply filters to database rows
 * @param {Array} rows - Database rows
 * @param {Array} columns - Database columns
 * @param {Array} filters - Filter definitions
 * @param {string} operator - Filter operator ('and' or 'or')
 * @returns {Array} Filtered rows
 */
export function applyFilters(rows, columns, filters, operator = 'and') {
  if (!filters || filters.length === 0) return rows

  const columnMap = new Map(columns.map(col => [col.id, col]))

  return rows.filter(row => {
    const results = filters.map(filter => {
      const column = columnMap.get(filter.column)
      if (!column) return false

      const value = row.data[filter.column]
      return evaluateFilter(value, filter, column)
    })

    return operator === 'and' 
      ? results.every(result => result)
      : results.some(result => result)
  })
}

/**
 * Evaluate a single filter condition
 * @param {*} value - Cell value
 * @param {Object} filter - Filter definition
 * @param {Object} column - Column definition
 * @returns {boolean} Filter result
 */
export function evaluateFilter(value, filter, column) {
  const { operator, condition } = filter

  // Handle empty/null values
  const isEmpty = value === null || value === undefined || value === ''
  
  if (operator === 'is_empty') return isEmpty
  if (operator === 'is_not_empty') return !isEmpty
  if (isEmpty) return false

  switch (column.type) {
    case COLUMN_TYPES.TEXT:
    case COLUMN_TYPES.URL:
    case COLUMN_TYPES.EMAIL:
    case COLUMN_TYPES.PHONE:
      return evaluateTextFilter(String(value), operator, condition)
    
    case COLUMN_TYPES.NUMBER:
      return evaluateNumberFilter(Number(value), operator, Number(condition))
    
    case COLUMN_TYPES.SELECT:
      return evaluateSelectFilter(value, operator, condition)
    
    case COLUMN_TYPES.MULTI_SELECT:
      return evaluateMultiSelectFilter(value || [], operator, condition)
    
    case COLUMN_TYPES.DATE:
      return evaluateDateFilter(new Date(value), operator, condition)
    
    case COLUMN_TYPES.CHECKBOX:
      return evaluateCheckboxFilter(Boolean(value), operator)
    
    case COLUMN_TYPES.RELATION:
      return evaluateRelationFilter(value || [], operator, condition)
    
    default:
      return true
  }
}

/**
 * Evaluate text filter
 */
function evaluateTextFilter(value, operator, condition) {
  const lowerValue = value.toLowerCase()
  const lowerCondition = String(condition).toLowerCase()

  switch (operator) {
    case 'equals': return value === condition
    case 'does_not_equal': return value !== condition
    case 'contains': return lowerValue.includes(lowerCondition)
    case 'does_not_contain': return !lowerValue.includes(lowerCondition)
    case 'starts_with': return lowerValue.startsWith(lowerCondition)
    case 'ends_with': return lowerValue.endsWith(lowerCondition)
    default: return true
  }
}

/**
 * Evaluate number filter
 */
function evaluateNumberFilter(value, operator, condition) {
  switch (operator) {
    case 'equals': return value === condition
    case 'does_not_equal': return value !== condition
    case 'greater_than': return value > condition
    case 'less_than': return value < condition
    case 'greater_than_or_equal_to': return value >= condition
    case 'less_than_or_equal_to': return value <= condition
    default: return true
  }
}

/**
 * Evaluate select filter
 */
function evaluateSelectFilter(value, operator, condition) {
  switch (operator) {
    case 'equals': return value === condition
    case 'does_not_equal': return value !== condition
    default: return true
  }
}

/**
 * Evaluate multi-select filter
 */
function evaluateMultiSelectFilter(values, operator, condition) {
  switch (operator) {
    case 'contains': return values.includes(condition)
    case 'does_not_contain': return !values.includes(condition)
    default: return true
  }
}

/**
 * Evaluate date filter
 */
function evaluateDateFilter(value, operator, condition) {
  const now = new Date()
  const conditionDate = condition ? new Date(condition) : null

  switch (operator) {
    case 'equals':
      return conditionDate && value.toDateString() === conditionDate.toDateString()
    case 'before':
      return conditionDate && value < conditionDate
    case 'after':
      return conditionDate && value > conditionDate
    case 'on_or_before':
      return conditionDate && value <= conditionDate
    case 'on_or_after':
      return conditionDate && value >= conditionDate
    case 'past_week':
      return value >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'past_month':
      return value >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'past_year':
      return value >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    default: return true
  }
}

/**
 * Evaluate checkbox filter
 */
function evaluateCheckboxFilter(value, operator) {
  switch (operator) {
    case 'checked': return value === true
    case 'unchecked': return value !== true
    default: return true
  }
}

/**
 * Evaluate relation filter
 */
function evaluateRelationFilter(values, operator, condition) {
  switch (operator) {
    case 'contains': return values.some(v => v.id === condition)
    case 'does_not_contain': return !values.some(v => v.id === condition)
    default: return true
  }
}

/**
 * Apply sorting to database rows
 * @param {Array} rows - Database rows
 * @param {Array} columns - Database columns
 * @param {Array} sorts - Sort definitions
 * @returns {Array} Sorted rows
 */
export function applySorts(rows, columns, sorts) {
  if (!sorts || sorts.length === 0) return rows

  const columnMap = new Map(columns.map(col => [col.id, col]))

  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const column = columnMap.get(sort.column)
      if (!column) continue

      const aValue = a.data[sort.column]
      const bValue = b.data[sort.column]
      const result = compareValues(aValue, bValue, column.type)

      if (result !== 0) {
        return sort.direction === SORT_DIRECTIONS.DESC ? -result : result
      }
    }
    return 0
  })
}

/**
 * Compare two values for sorting
 * @param {*} a - First value
 * @param {*} b - Second value
 * @param {string} type - Column type
 * @returns {number} Comparison result
 */
function compareValues(a, b, type) {
  // Handle null/undefined values
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1

  switch (type) {
    case COLUMN_TYPES.NUMBER:
      return Number(a) - Number(b)
    
    case COLUMN_TYPES.DATE:
      return new Date(a) - new Date(b)
    
    case COLUMN_TYPES.CHECKBOX:
      return Boolean(a) - Boolean(b)
    
    case COLUMN_TYPES.TEXT:
    case COLUMN_TYPES.SELECT:
    case COLUMN_TYPES.URL:
    case COLUMN_TYPES.EMAIL:
    case COLUMN_TYPES.PHONE:
    default:
      return String(a).localeCompare(String(b))
  }
}

/**
 * Group database rows by column value
 * @param {Array} rows - Database rows
 * @param {Array} columns - Database columns
 * @param {string} groupByColumn - Column ID to group by
 * @returns {Map} Grouped rows (group value -> rows array)
 */
export function groupRows(rows, columns, groupByColumn) {
  if (!groupByColumn) return new Map([['all', rows]])

  const column = columns.find(col => col.id === groupByColumn)
  if (!column) return new Map([['all', rows]])

  const groups = new Map()

  rows.forEach(row => {
    const value = row.data[groupByColumn]
    let groupKey

    // Handle different column types for grouping
    switch (column.type) {
      case COLUMN_TYPES.SELECT:
        groupKey = value || 'No selection'
        break
      
      case COLUMN_TYPES.MULTI_SELECT:
        // For multi-select, create a group for each selected option
        const values = value || []
        if (values.length === 0) {
          groupKey = 'No selection'
          if (!groups.has(groupKey)) groups.set(groupKey, [])
          groups.get(groupKey).push(row)
        } else {
          values.forEach(val => {
            if (!groups.has(val)) groups.set(val, [])
            groups.get(val).push(row)
          })
        }
        return
      
      case COLUMN_TYPES.CHECKBOX:
        groupKey = value ? 'Checked' : 'Unchecked'
        break
      
      case COLUMN_TYPES.DATE:
        if (value) {
          const date = new Date(value)
          groupKey = date.toLocaleDateString()
        } else {
          groupKey = 'No date'
        }
        break
      
      default:
        groupKey = value || 'Empty'
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey).push(row)
  })

  return groups
}

/**
 * Calculate formula value
 * @param {string} formula - Formula expression
 * @param {Object} rowData - Row data
 * @param {Array} columns - Database columns
 * @returns {*} Calculated value
 */
export function calculateFormula(formula, rowData, columns) {
  if (!formula) return null

  try {
    // Simple formula parser - expand this for more complex formulas
    // For now, support basic operations and column references
    
    // Replace column references with values
    let expression = formula
    columns.forEach(column => {
      const value = rowData[column.id]
      const regex = new RegExp(`\\b${column.name}\\b`, 'g')
      
      if (column.type === COLUMN_TYPES.NUMBER) {
        expression = expression.replace(regex, Number(value) || 0)
      } else {
        expression = expression.replace(regex, `"${String(value || '')}"`)
      }
    })

    // Basic safety check - only allow safe operations
    if (!/^[\d\s+\-*/.()]+$/.test(expression.replace(/"[^"]*"/g, '0'))) {
      return 'Error: Invalid formula'
    }

    // Evaluate the expression (in a real app, use a proper formula parser)
    return Function(`"use strict"; return (${expression})`)()
  } catch (error) {
    return `Error: ${error.message}`
  }
}

/**
 * Get cell display value
 * @param {*} value - Raw cell value
 * @param {Object} column - Column definition
 * @returns {string} Display value
 */
export function getCellDisplayValue(value, column) {
  if (value === null || value === undefined) return ''

  switch (column.type) {
    case COLUMN_TYPES.NUMBER:
      if (column.config?.format === 'currency') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value))
      }
      return String(value)
    
    case COLUMN_TYPES.DATE:
      if (value) {
        const date = new Date(value)
        const format = column.config?.format || 'MM/DD/YYYY'
        const includeTime = column.config?.include_time || false
        
        if (includeTime) {
          return date.toLocaleString()
        } else {
          return date.toLocaleDateString()
        }
      }
      return ''
    
    case COLUMN_TYPES.CHECKBOX:
      return value ? '✓' : ''
    
    case COLUMN_TYPES.MULTI_SELECT:
      return Array.isArray(value) ? value.join(', ') : ''
    
    case COLUMN_TYPES.RELATION:
      return Array.isArray(value) ? value.map(v => v.title || v.name || v.id).join(', ') : ''
    
    default:
      return String(value)
  }
}

/**
 * Get column default value
 * @param {Object} column - Column definition
 * @returns {*} Default value
 */
export function getColumnDefaultValue(column) {
  switch (column.type) {
    case COLUMN_TYPES.TEXT:
    case COLUMN_TYPES.URL:
    case COLUMN_TYPES.EMAIL:
    case COLUMN_TYPES.PHONE:
      return ''
    
    case COLUMN_TYPES.NUMBER:
      return 0
    
    case COLUMN_TYPES.SELECT:
      return null
    
    case COLUMN_TYPES.MULTI_SELECT:
    case COLUMN_TYPES.RELATION:
      return []
    
    case COLUMN_TYPES.DATE:
      return null
    
    case COLUMN_TYPES.CHECKBOX:
      return false
    
    case COLUMN_TYPES.CREATED_TIME:
    case COLUMN_TYPES.LAST_EDITED_TIME:
      return new Date().toISOString()
    
    case COLUMN_TYPES.CREATED_BY:
    case COLUMN_TYPES.LAST_EDITED_BY:
      return 'system'
    
    default:
      return null
  }
}

/**
 * Touch database (update modified timestamp)
 * @param {Object} database - Database object
 * @returns {Object} Updated database
 */
export function touchDatabase(database) {
  return {
    ...database,
    modified: new Date().toISOString(),
    last_edited_by: 'system' // TODO: Get from user context
  }
}

/**
 * Touch database row (update modified timestamp)
 * @param {Object} row - Row object
 * @returns {Object} Updated row
 */
export function touchRow(row) {
  return {
    ...row,
    modified: new Date().toISOString(),
    last_edited_by: 'system' // TODO: Get from user context
  }
}