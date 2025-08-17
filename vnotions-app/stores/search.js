/**
 * Pinia store for search state management
 * Handles search operations and state for VNotions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import SearchManager from '~/utils/search.js'

export const useSearchStore = defineStore('search', () => {
  // State
  const searchManager = ref(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const isIndexing = ref(false)
  const error = ref(null)
  
  // Current search
  const query = ref('')
  const searchResults = ref([])
  const totalResults = ref(0)
  const searchType = ref('all') // 'all', 'pages', 'databases', 'titles'
  
  // Search options
  const searchOptions = ref({
    limit: 50,
    offset: 0,
    includeContent: false
  })
  
  // Search suggestions
  const suggestions = ref([])
  const showSuggestions = ref(false)
  
  // Search history
  const searchHistory = ref([])
  const recentSearches = ref([])
  
  // Quick switcher
  const quickSwitcherVisible = ref(false)
  const quickSwitcherQuery = ref('')
  const quickSwitcherResults = ref([])
  
  // Search filters
  const activeFilters = ref({
    type: null, // 'page', 'database'
    dateRange: null,
    tags: [],
    author: null
  })
  
  // Index statistics
  const indexStats = ref({
    totalQueries: 0,
    indexedPages: 0,
    indexedDatabases: 0,
    lastIndexed: null,
    isInitialized: false
  })

  // Computed
  const hasResults = computed(() => searchResults.value.length > 0)
  const hasQuery = computed(() => query.value.trim().length > 0)
  const canLoadMore = computed(() => 
    searchResults.value.length < totalResults.value &&
    searchOptions.value.offset + searchOptions.value.limit < totalResults.value
  )
  const isEmptyState = computed(() => !hasQuery.value && searchResults.value.length === 0)

  // Actions
  async function initializeSearch(workspacePath) {
    try {
      isLoading.value = true
      error.value = null
      
      searchManager.value = new SearchManager(workspacePath)
      isInitialized.value = true
      
      // Load search history
      searchHistory.value = searchManager.value.getRecentSearches()
      
      // Get index statistics
      indexStats.value = searchManager.value.getStatistics()
      
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function indexWorkspace() {
    try {
      isIndexing.value = true
      error.value = null
      
      if (!searchManager.value) {
        throw new Error('Search manager not initialized')
      }
      
      const result = await searchManager.value.indexWorkspace()
      
      if (result.success) {
        indexStats.value = searchManager.value.getStatistics()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isIndexing.value = false
    }
  }

  async function search(searchQuery = null, options = {}) {
    try {
      isLoading.value = true
      error.value = null
      
      const queryToSearch = searchQuery || query.value
      if (!queryToSearch || queryToSearch.trim().length < 2) {
        searchResults.value = []
        totalResults.value = 0
        return { success: true, results: [], totalCount: 0 }
      }
      
      const searchOpts = {
        ...searchOptions.value,
        ...options,
        type: searchType.value
      }
      
      const result = await searchManager.value.search(queryToSearch, searchOpts)
      
      if (result.success) {
        if (searchOpts.offset === 0) {
          // New search
          searchResults.value = result.results
        } else {
          // Load more results
          searchResults.value.push(...result.results)
        }
        
        totalResults.value = result.totalCount
        query.value = queryToSearch
        
        // Update search history
        await updateSearchHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (!canLoadMore.value || isLoading.value) return
    
    searchOptions.value.offset += searchOptions.value.limit
    return await search()
  }

  async function getSuggestions(searchQuery) {
    try {
      const result = await searchManager.value.getSuggestions(searchQuery)
      
      if (result.success) {
        suggestions.value = result.suggestions
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function quickSwitcherSearch(searchQuery) {
    try {
      const result = await searchManager.value.search(searchQuery, {
        type: 'titles',
        limit: 10,
        includeContent: true
      })
      
      if (result.success) {
        quickSwitcherResults.value = result.results
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function indexPage(pageData) {
    try {
      if (!searchManager.value) return
      
      const result = await searchManager.value.indexPage(pageData)
      
      if (result.success) {
        indexStats.value = searchManager.value.getStatistics()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function indexDatabase(dbData) {
    try {
      if (!searchManager.value) return
      
      const result = await searchManager.value.indexDatabase(dbData)
      
      if (result.success) {
        indexStats.value = searchManager.value.getStatistics()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function removePageFromIndex(pageId) {
    try {
      if (!searchManager.value) return
      
      const result = await searchManager.value.removePageFromIndex(pageId)
      
      if (result.success) {
        indexStats.value = searchManager.value.getStatistics()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function removeDatabaseFromIndex(dbId) {
    try {
      if (!searchManager.value) return
      
      const result = await searchManager.value.removeDatabaseFromIndex(dbId)
      
      if (result.success) {
        indexStats.value = searchManager.value.getStatistics()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function exportSearchIndex() {
    try {
      if (!searchManager.value) {
        throw new Error('Search manager not initialized')
      }
      
      return await searchManager.value.exportIndex()
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function importSearchIndex(indexData) {
    try {
      if (!searchManager.value) {
        throw new Error('Search manager not initialized')
      }
      
      const result = await searchManager.value.importIndex(indexData)
      
      if (result.success) {
        indexStats.value = searchManager.value.getStatistics()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  function setSearchType(type) {
    searchType.value = type
    searchOptions.value.offset = 0 // Reset pagination
  }

  function setSearchOptions(options) {
    Object.assign(searchOptions.value, options)
  }

  function clearSearch() {
    query.value = ''
    searchResults.value = []
    totalResults.value = 0
    searchOptions.value.offset = 0
    error.value = null
  }

  function clearSuggestions() {
    suggestions.value = []
    showSuggestions.value = false
  }

  function toggleSuggestions(show = null) {
    showSuggestions.value = show !== null ? show : !showSuggestions.value
  }

  function openQuickSwitcher() {
    quickSwitcherVisible.value = true
    quickSwitcherQuery.value = ''
    quickSwitcherResults.value = []
  }

  function closeQuickSwitcher() {
    quickSwitcherVisible.value = false
    quickSwitcherQuery.value = ''
    quickSwitcherResults.value = []
  }

  async function updateSearchHistory() {
    if (searchManager.value) {
      recentSearches.value = searchManager.value.getRecentSearches(10)
    }
  }

  function clearSearchHistory() {
    if (searchManager.value) {
      const result = searchManager.value.clearHistory()
      recentSearches.value = []
      return result
    }
  }

  function applyFilter(filterType, value) {
    activeFilters.value[filterType] = value
    searchOptions.value.offset = 0 // Reset pagination
  }

  function removeFilter(filterType) {
    activeFilters.value[filterType] = null
    searchOptions.value.offset = 0 // Reset pagination
  }

  function clearAllFilters() {
    activeFilters.value = {
      type: null,
      dateRange: null,
      tags: [],
      author: null
    }
    searchOptions.value.offset = 0 // Reset pagination
  }

  function selectSearchResult(result) {
    // Navigate to the selected result
    // This would be handled by the router in a real implementation
    return result
  }

  function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  function clearError() {
    error.value = null
  }

  // Keyboard shortcuts
  function handleKeyboardShortcut(event) {
    // Cmd/Ctrl + K for quick switcher
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      openQuickSwitcher()
      return true
    }
    
    // Escape to close quick switcher
    if (event.key === 'Escape' && quickSwitcherVisible.value) {
      event.preventDefault()
      closeQuickSwitcher()
      return true
    }
    
    return false
  }

  // Debounced search for live results
  let searchTimeout = null
  
  function debouncedSearch(searchQuery, delay = 300) {
    clearTimeout(searchTimeout)
    
    searchTimeout = setTimeout(async () => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        await search(searchQuery)
      } else {
        clearSearch()
      }
    }, delay)
  }

  function debouncedSuggestions(searchQuery, delay = 200) {
    clearTimeout(searchTimeout)
    
    searchTimeout = setTimeout(async () => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        await getSuggestions(searchQuery)
        showSuggestions.value = true
      } else {
        clearSuggestions()
      }
    }, delay)
  }

  return {
    // State
    searchManager,
    isInitialized,
    isLoading,
    isIndexing,
    error,
    query,
    searchResults,
    totalResults,
    searchType,
    searchOptions,
    suggestions,
    showSuggestions,
    searchHistory,
    recentSearches,
    quickSwitcherVisible,
    quickSwitcherQuery,
    quickSwitcherResults,
    activeFilters,
    indexStats,
    
    // Computed
    hasResults,
    hasQuery,
    canLoadMore,
    isEmptyState,
    
    // Actions
    initializeSearch,
    indexWorkspace,
    search,
    loadMore,
    getSuggestions,
    quickSwitcherSearch,
    indexPage,
    indexDatabase,
    removePageFromIndex,
    removeDatabaseFromIndex,
    exportSearchIndex,
    importSearchIndex,
    setSearchType,
    setSearchOptions,
    clearSearch,
    clearSuggestions,
    toggleSuggestions,
    openQuickSwitcher,
    closeQuickSwitcher,
    updateSearchHistory,
    clearSearchHistory,
    applyFilter,
    removeFilter,
    clearAllFilters,
    selectSearchResult,
    highlightSearchTerm,
    clearError,
    handleKeyboardShortcut,
    debouncedSearch,
    debouncedSuggestions
  }
})