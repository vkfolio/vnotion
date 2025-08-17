<template>
  <div class="search-box" :class="{ 'focused': isFocused, 'has-results': hasResults }">
    <!-- Search input -->
    <div class="search-input-container">
      <div class="search-input-wrapper">
        <i class="pi pi-search search-icon" />
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="placeholder"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
          @input="handleInput"
        />
        <div v-if="searchQuery" class="search-actions">
          <button
            class="clear-btn"
            @click="clearSearch"
            title="Clear search"
          >
            <i class="pi pi-times" />
          </button>
        </div>
      </div>
      
      <!-- Search type filter -->
      <div v-if="showTypeFilter" class="search-type-filter">
        <select v-model="selectedType" @change="handleTypeChange">
          <option value="all">All</option>
          <option value="pages">Pages</option>
          <option value="databases">Databases</option>
          <option value="titles">Titles</option>
        </select>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="search-loading">
      <i class="pi pi-spin pi-spinner" />
      <span>Searching...</span>
    </div>

    <!-- Search suggestions -->
    <div
      v-if="showSuggestions && suggestions.length > 0 && isFocused"
      class="search-suggestions"
    >
      <div class="suggestions-header">
        <i class="pi pi-lightbulb" />
        <span>Suggestions</span>
      </div>
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="suggestion-item"
        :class="{ 'highlighted': selectedSuggestionIndex === index }"
        @click="selectSuggestion(suggestion)"
        @mouseenter="selectedSuggestionIndex = index"
      >
        <i class="pi pi-search" />
        <span>{{ suggestion }}</span>
      </div>
    </div>

    <!-- Recent searches -->
    <div
      v-if="showRecentSearches && recentSearches.length > 0 && isFocused && !searchQuery"
      class="recent-searches"
    >
      <div class="recent-header">
        <i class="pi pi-history" />
        <span>Recent Searches</span>
        <button class="clear-history-btn" @click="clearSearchHistory" title="Clear history">
          <i class="pi pi-trash" />
        </button>
      </div>
      <div
        v-for="(search, index) in recentSearches"
        :key="index"
        class="recent-item"
        @click="selectRecentSearch(search.query)"
      >
        <i class="pi pi-history" />
        <div class="recent-content">
          <span class="recent-query">{{ search.query }}</span>
          <span class="recent-meta">{{ search.resultCount }} results</span>
        </div>
        <span class="recent-time">{{ formatTime(search.timestamp) }}</span>
      </div>
    </div>

    <!-- Quick results preview -->
    <div
      v-if="showQuickResults && quickResults.length > 0 && searchQuery && isFocused"
      class="quick-results"
    >
      <div class="results-header">
        <i class="pi pi-list" />
        <span>Quick Results</span>
        <span class="result-count">{{ totalResults }} total</span>
      </div>
      <div
        v-for="result in quickResults"
        :key="result.id"
        class="quick-result-item"
        @click="selectResult(result)"
      >
        <div class="result-icon">
          <i :class="getResultIcon(result.type)" />
        </div>
        <div class="result-content">
          <div class="result-title" v-html="highlightMatch(result.title)"></div>
          <div v-if="result.excerpt" class="result-excerpt" v-html="highlightMatch(result.excerpt)"></div>
          <div class="result-meta">
            <span class="result-type">{{ result.type }}</span>
            <span v-if="result.lastModified" class="result-date">
              {{ formatDate(result.lastModified) }}
            </span>
          </div>
        </div>
      </div>
      
      <div v-if="totalResults > quickResults.length" class="view-all-results">
        <button class="view-all-btn" @click="viewAllResults">
          <i class="pi pi-arrow-right" />
          View all {{ totalResults }} results
        </button>
      </div>
    </div>

    <!-- No results message -->
    <div
      v-if="searchQuery && !isLoading && !hasResults && isFocused"
      class="no-results"
    >
      <i class="pi pi-info-circle" />
      <span>No results found for "{{ searchQuery }}"</span>
      <div class="no-results-suggestions">
        <p>Try:</p>
        <ul>
          <li>Checking your spelling</li>
          <li>Using different keywords</li>
          <li>Using broader search terms</li>
        </ul>
      </div>
    </div>

    <!-- Search shortcuts info -->
    <div
      v-if="showShortcuts && isFocused && !searchQuery"
      class="search-shortcuts"
    >
      <div class="shortcuts-header">
        <i class="pi pi-info" />
        <span>Search Tips</span>
      </div>
      <div class="shortcut-list">
        <div class="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>K</kbd>
          <span>Quick search anywhere</span>
        </div>
        <div class="shortcut-item">
          <kbd>↑</kbd> <kbd>↓</kbd>
          <span>Navigate suggestions</span>
        </div>
        <div class="shortcut-item">
          <kbd>Enter</kbd>
          <span>Select suggestion or search</span>
        </div>
        <div class="shortcut-item">
          <kbd>Esc</kbd>
          <span>Close search</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSearchStore } from '~/stores/search.js'
import { useRouter } from 'vue-router'

// Props
const props = defineProps({
  placeholder: {
    type: String,
    default: 'Search pages, databases, and content...'
  },
  showTypeFilter: {
    type: Boolean,
    default: true
  },
  showSuggestions: {
    type: Boolean,
    default: true
  },
  showRecentSearches: {
    type: Boolean,
    default: true
  },
  showQuickResults: {
    type: Boolean,
    default: true
  },
  showShortcuts: {
    type: Boolean,
    default: true
  },
  maxQuickResults: {
    type: Number,
    default: 5
  },
  autofocus: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['search', 'select', 'focus', 'blur'])

// Store and router
const searchStore = useSearchStore()
const router = useRouter()

// Local state
const searchInput = ref(null)
const searchQuery = ref('')
const selectedType = ref('all')
const isFocused = ref(false)
const selectedSuggestionIndex = ref(-1)

// Computed
const isLoading = computed(() => searchStore.isLoading)
const suggestions = computed(() => searchStore.suggestions)
const recentSearches = computed(() => searchStore.recentSearches.slice(0, 5))
const hasResults = computed(() => searchStore.hasResults)
const totalResults = computed(() => searchStore.totalResults)

const quickResults = computed(() => {
  return searchStore.searchResults.slice(0, props.maxQuickResults).map(result => ({
    ...result,
    title: result.content?.title || `${result.type} ${result.id}`,
    excerpt: result.content?.excerpt || '',
    lastModified: result.content?.lastModified
  }))
})

// Methods
function handleFocus() {
  isFocused.value = true
  emit('focus')
  
  if (!searchQuery.value && props.showRecentSearches) {
    searchStore.updateSearchHistory()
  }
}

function handleBlur() {
  // Delay blur to allow click events on suggestions
  setTimeout(() => {
    isFocused.value = false
    emit('blur')
  }, 200)
}

function handleInput() {
  selectedSuggestionIndex.value = -1
  
  if (searchQuery.value.trim()) {
    if (props.showSuggestions) {
      searchStore.debouncedSuggestions(searchQuery.value)
    }
    
    if (props.showQuickResults) {
      searchStore.debouncedSearch(searchQuery.value)
    }
  } else {
    searchStore.clearSuggestions()
    searchStore.clearSearch()
  }
  
  emit('search', searchQuery.value)
}

function handleKeydown(event) {
  const totalSuggestions = suggestions.value.length
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (totalSuggestions > 0) {
        selectedSuggestionIndex.value = Math.min(
          selectedSuggestionIndex.value + 1,
          totalSuggestions - 1
        )
      }
      break
      
    case 'ArrowUp':
      event.preventDefault()
      if (totalSuggestions > 0) {
        selectedSuggestionIndex.value = Math.max(
          selectedSuggestionIndex.value - 1,
          -1
        )
      }
      break
      
    case 'Enter':
      event.preventDefault()
      if (selectedSuggestionIndex.value >= 0 && suggestions.value[selectedSuggestionIndex.value]) {
        selectSuggestion(suggestions.value[selectedSuggestionIndex.value])
      } else if (searchQuery.value.trim()) {
        performSearch()
      }
      break
      
    case 'Escape':
      event.preventDefault()
      if (searchQuery.value) {
        clearSearch()
      } else {
        searchInput.value?.blur()
      }
      break
  }
}

function handleTypeChange() {
  searchStore.setSearchType(selectedType.value)
  if (searchQuery.value.trim()) {
    searchStore.search(searchQuery.value)
  }
}

async function performSearch() {
  if (!searchQuery.value.trim()) return
  
  await searchStore.search(searchQuery.value, {
    includeContent: true
  })
  
  if (props.showQuickResults) {
    // Don't navigate, just show results in dropdown
    return
  }
  
  // Navigate to search page for full results
  viewAllResults()
}

function selectSuggestion(suggestion) {
  searchQuery.value = suggestion
  selectedSuggestionIndex.value = -1
  searchStore.clearSuggestions()
  performSearch()
}

function selectRecentSearch(query) {
  searchQuery.value = query
  performSearch()
}

function selectResult(result) {
  emit('select', result)
  
  // Navigate to the result
  if (result.type === 'page') {
    router.push(`/page/${result.id}`)
  } else if (result.type === 'database') {
    router.push(`/database/${result.id}`)
  }
  
  // Clear focus
  searchInput.value?.blur()
}

function viewAllResults() {
  router.push({
    path: '/search',
    query: {
      q: searchQuery.value,
      type: selectedType.value
    }
  })
  searchInput.value?.blur()
}

function clearSearch() {
  searchQuery.value = ''
  selectedSuggestionIndex.value = -1
  searchStore.clearSearch()
  searchStore.clearSuggestions()
  searchInput.value?.focus()
}

function clearSearchHistory() {
  searchStore.clearSearchHistory()
}

function getResultIcon(type) {
  switch (type) {
    case 'page':
      return 'pi pi-file'
    case 'database':
      return 'pi pi-table'
    default:
      return 'pi pi-file'
  }
}

function highlightMatch(text) {
  if (!text || !searchQuery.value) return text
  return searchStore.highlightSearchTerm(text, searchQuery.value)
}

function formatDate(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'Today'
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))
  
  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

function focusInput() {
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// Watch for external query changes
watch(() => props.autofocus, (autofocus) => {
  if (autofocus) {
    focusInput()
  }
})

// Expose methods
defineExpose({
  focus: focusInput,
  clear: clearSearch,
  search: performSearch
})

// Lifecycle
onMounted(() => {
  if (props.autofocus) {
    focusInput()
  }
})
</script>

<style scoped>
.search-box {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.search-input-container {
  display: flex;
  gap: 0.5rem;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-color-secondary);
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--surface-ground);
  color: var(--text-color);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-alpha);
}

.search-actions {
  position: absolute;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.search-type-filter select {
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  background: var(--surface-ground);
  color: var(--text-color);
  font-size: 0.875rem;
  min-width: 100px;
}

.search-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

/* Dropdown styles */
.search-suggestions,
.recent-searches,
.quick-results,
.no-results,
.search-shortcuts {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.suggestions-header,
.recent-header,
.results-header,
.shortcuts-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-header {
  justify-content: space-between;
}

.clear-history-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.clear-history-btn:hover {
  background: var(--surface-100);
  color: var(--red-500);
}

.result-count {
  margin-left: auto;
  background: var(--primary-100);
  color: var(--primary-700);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.suggestion-item,
.recent-item,
.quick-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--surface-border);
}

.suggestion-item:last-child,
.recent-item:last-child,
.quick-result-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.recent-item:hover,
.quick-result-item:hover,
.suggestion-item.highlighted {
  background: var(--surface-50);
}

.suggestion-item i,
.recent-item i {
  color: var(--text-color-secondary);
  width: 1rem;
}

.recent-content {
  flex: 1;
  min-width: 0;
}

.recent-query {
  display: block;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.25rem;
}

.recent-meta {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.recent-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  white-space: nowrap;
}

.result-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-100);
  border-radius: 0.375rem;
  color: var(--text-color-secondary);
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.25rem;
  word-break: break-word;
}

.result-excerpt {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
  line-height: 1.4;
  word-break: break-word;
}

.result-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.result-type {
  background: var(--surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: capitalize;
}

.view-all-results {
  border-top: 1px solid var(--surface-border);
  padding: 0.75rem;
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.view-all-btn:hover {
  background: var(--primary-50);
}

.no-results {
  padding: 2rem;
  text-align: center;
}

.no-results i {
  font-size: 2rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
}

.no-results-suggestions {
  margin-top: 1rem;
  text-align: left;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.no-results-suggestions ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

.shortcut-list {
  padding: 0.5rem;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.shortcut-item kbd {
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-family: inherit;
  color: var(--text-color);
}

.shortcut-item span {
  color: var(--text-color-secondary);
}

/* Highlight styles */
:deep(mark) {
  background: var(--yellow-200);
  color: var(--text-color);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* Focus states */
.search-box.focused .search-input {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-alpha);
}

.search-box.has-results .search-input {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>