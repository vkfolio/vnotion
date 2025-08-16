/**
 * UUID utilities for VNotions
 * Provides UUID v4 generation and validation
 */

/**
 * Generate a UUID v4
 * @returns {string} A UUID v4 string
 */
export function generateUUID() {
  // Use crypto.randomUUID if available (Node.js 16.7.0+, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback implementation for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Validate if a string is a valid UUID v4
 * @param {string} uuid - The UUID string to validate
 * @returns {boolean} True if valid UUID v4, false otherwise
 */
export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') {
    return false
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Generate a short UUID (8 characters) for display purposes
 * Note: This is not cryptographically secure and should only be used for display
 * @returns {string} A short UUID string
 */
export function generateShortUUID() {
  return Math.random().toString(36).substring(2, 10)
}

/**
 * Extract short ID from full UUID for display
 * @param {string} uuid - Full UUID
 * @returns {string} First 8 characters of UUID
 */
export function getShortUUID(uuid) {
  if (!isValidUUID(uuid)) {
    return ''
  }
  return uuid.substring(0, 8)
}