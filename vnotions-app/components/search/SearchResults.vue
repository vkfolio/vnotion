<template>
  <div class="search-results">
    <!-- Results header -->
    <div class="results-header">
      <div class="header-content">
        <div class="results-info">
          <h2 v-if="query" class="search-query">
            Results for "<span class="query-text">{{ query }}</span>"
          </h2>
          <h2 v-else class="search-query">Search Results</h2>
          <div class="results-meta">
            <span class="result-count">
              {{ totalResults }} result{{ totalResults === 1 ? '' : 's' }}
            </span>
            <span v-if="searchTime" class="search-time">
              ({{ searchTime }}ms)
            </span>
          </div>
        </div>
        
        <div class="results-actions">
          <!-- View mode toggle -->
          <div class="view-mode-toggle">
            <button
              class="view-btn"
              :class="{ 'active': viewMode === 'list' }"
              @click="setViewMode('list')"
              title="List view"
            >
              <i class="pi pi-list" />
            </button>
            <button
              class="view-btn"
              :class="{ 'active': viewMode === 'grid' }"
              @click="setViewMode('grid')"
              title="Grid view"
            >
              <i class="pi pi-th-large" />
            </button>
          </div>
          
          <!-- Sort options -->
          <select v-model="sortBy" @change="handleSortChange" class="sort-select">
            <option value="relevance">Sort by Relevance</option>
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="filters-section">
        <div class="active-filters">
          <span v-if="Object.keys(activeFilters).length === 0" class="no-filters">
            No filters applied
          </span>
          <div v-else class="filter-tags">
            <div
              v-for="(value, key) in activeFilters"
              :key="key"
              v-if="value"
              class="filter-tag"
            >
              <span>{{ formatFilterLabel(key, value) }}</span>
              <button @click="removeFilter(key)" class="remove-filter">
                <i class="pi pi-times" />
              </button>
            </div>
          </div>
        </div>
        
        <div class="filter-controls">
          <!-- Type filter -->
          <select v-model="typeFilter" @change="applyTypeFilter" class="filter-select">
            <option value="">All Types</option>
            <option value="page">Pages</option>
            <option value="database">Databases</option>
          </select>
          
          <!-- Date filter -->
          <select v-model="dateFilter" @change="applyDateFilter" class="filter-select">
            <option value="">Any Date</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <!-- Clear filters -->
          <button
            v-if="Object.keys(activeFilters).length > 0"
            @click="clearAllFilters"
            class="clear-filters-btn"
            title="Clear all filters"
          >
            <i class="pi pi-filter-slash" />
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Searching...</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
      <div class="error-content">
        <h3>Search Error</h3>
        <p>{{ error }}</p>
        <button @click="retrySearch" class="retry-btn">
          <i class="pi pi-refresh" />
          Try Again
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!isLoading && !error && !hasResults" class="empty-state">
      <i class="pi pi-search empty-icon" />
      <h3>No Results Found</h3>
      <p v-if="query">
        No results found for "<strong>{{ query }}</strong>".
      </p>
      <p v-else>
        Try searching for pages, databases, or content.
      </p>
      <div class="suggestions">
        <h4>Try:</h4>
        <ul>
          <li>Checking your spelling</li>
          <li>Using different keywords</li>
          <li>Using broader search terms</li>
          <li>Removing some filters</li>
        </ul>
      </div>
    </div>

    <!-- Results list -->
    <div v-if="!isLoading && !error && hasResults" class="results-container">
      <div 
        class="results-list"
        :class="{
          'list-view': viewMode === 'list',
          'grid-view': viewMode === 'grid'
        }"
      >
        <div
          v-for="result in results"
          :key="result.id"
          class="result-item"
          @click="selectResult(result)"
        >
          <!-- Result header -->
          <div class="result-header">
            <div class="result-icon">
              <i :class="getResultIcon(result.type)" />
            </div>
            <div class="result-meta">
              <span class="result-type">{{ formatResultType(result.type) }}</span>
              <span v-if="result.lastModified" class="result-date">
                {{ formatDate(result.lastModified) }}
              </span>
            </div>
            <div class="result-actions">
              <button
                @click.stop="openResult(result)"
                class="action-btn"
                title="Open"
              >
                <i class="pi pi-external-link" />
              </button>
              <button
                @click.stop="copyResultLink(result)"
                class="action-btn"
                title="Copy link"
              >
                <i class="pi pi-copy" />
              </button>
            </div>
          </div>
          
          <!-- Result content -->
          <div class="result-content">
            <h3 class="result-title" v-html="highlightMatch(result.title)"></h3>
            <p v-if="result.excerpt" class="result-excerpt" v-html="highlightMatch(result.excerpt)"></p>
            
            <!-- Result tags/properties -->
            <div v-if="result.tags && result.tags.length > 0" class="result-tags">
              <span
                v-for="tag in result.tags.slice(0, 3)"
                :key="tag"
                class="result-tag"
              >
                {{ tag }}
              </span>
              <span v-if="result.tags.length > 3" class="more-tags">
                +{{ result.tags.length - 3 }} more
              </span>
            </div>
            
            <!-- Result path/breadcrumb -->
            <div v-if="result.path" class="result-path">
              <i class="pi pi-map-marker" />
              <span>{{ result.path }}</span>
            </div>
            
            <!-- Match info -->
            <div class="match-info">
              <span class="match-source">Match in {{ formatMatchSource(result.source) }}</span>
              <span v-if="result.score" class="match-score">
                Relevance: {{ Math.round(result.score * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Load more -->
      <div v-if="canLoadMore" class="load-more-section">
        <button
          @click="loadMore"
          :disabled="isLoading"
          class="load-more-btn"
        >
          <i class="pi pi-plus" />
          Load More Results
        </button>
      </div>
      
      <!-- Pagination info -->
      <div class="pagination-info">
        <span>
          Showing {{ results.length }} of {{ totalResults }} results
        </span>
      </div>
    </div>

    <!-- Copy success toast -->
    <div v-if="showCopySuccess" class="copy-toast">
      <i class="pi pi-check" />
      <span>Link copied to clipboard</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useSearchStore } from '~/stores/search.js'
import { useRouter } from 'vue-router'

// Props
const props = defineProps({
  query: {
    type: String,
    default: ''
  },
  autoSearch: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['select', 'open'])

// Store and router
const searchStore = useSearchStore()
const router = useRouter()

// Local state
const viewMode = ref('list')
const sortBy = ref('relevance')
const typeFilter = ref('')
const dateFilter = ref('')
const showCopySuccess = ref(false)
const searchTime = ref(0)

// Computed
const isLoading = computed(() => searchStore.isLoading)
const error = computed(() => searchStore.error)
const results = computed(() => searchStore.searchResults)
const totalResults = computed(() => searchStore.totalResults)
const hasResults = computed(() => searchStore.hasResults)
const canLoadMore = computed(() => searchStore.canLoadMore)
const activeFilters = computed(() => searchStore.activeFilters)

// Methods
function setViewMode(mode) {
  viewMode.value = mode
}

async function handleSortChange() {
  // Re-sort existing results or search again with new sort
  if (props.query) {
    await performSearch()
  }
}

function applyTypeFilter() {
  searchStore.applyFilter('type', typeFilter.value)
  if (props.query) {
    performSearch()
  }
}

function applyDateFilter() {
  searchStore.applyFilter('dateRange', dateFilter.value)
  if (props.query) {
    performSearch()
  }
}

function removeFilter(filterType) {
  searchStore.removeFilter(filterType)
  
  // Update local filter states
  if (filterType === 'type') {
    typeFilter.value = ''
  } else if (filterType === 'dateRange') {
    dateFilter.value = ''
  }
  
  if (props.query) {
    performSearch()
  }
}

function clearAllFilters() {
  searchStore.clearAllFilters()
  typeFilter.value = ''
  dateFilter.value = ''
  
  if (props.query) {
    performSearch()
  }
}

async function performSearch() {
  if (!props.query) return
  
  const startTime = Date.now()
  
  await searchStore.search(props.query, {
    includeContent: true
  })
  
  searchTime.value = Date.now() - startTime
}

async function loadMore() {
  await searchStore.loadMore()
}

function selectResult(result) {
  emit('select', result)
  searchStore.selectSearchResult(result)
}

function openResult(result) {
  emit('open', result)
  
  // Navigate to the result
  if (result.type === 'page') {
    router.push(`/page/${result.id}`)
  } else if (result.type === 'database') {
    router.push(`/database/${result.id}`)
  }
}

async function copyResultLink(result) {
  try {
    const baseUrl = window.location.origin
    let url = baseUrl
    
    if (result.type === 'page') {
      url += `/page/${result.id}`
    } else if (result.type === 'database') {
      url += `/database/${result.id}`
    }
    
    await navigator.clipboard.writeText(url)
    showCopySuccess.value = true
    
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy link:', error)
  }
}

function retrySearch() {
  searchStore.clearError()
  if (props.query) {
    performSearch()
  }
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

function formatResultType(type) {
  switch (type) {
    case 'page':
      return 'Page'
    case 'database':
      return 'Database'
    default:
      return type
  }
}

function formatMatchSource(source) {
  switch (source) {
    case 'title':
      return 'title'
    case 'content':
      return 'content'
    case 'properties':
      return 'properties'
    case 'row':
      return 'database row'
    case 'schema':
      return 'database schema'
    default:
      return source || 'content'
  }
}

function formatFilterLabel(key, value) {
  switch (key) {
    case 'type':
      return `Type: ${formatResultType(value)}`
    case 'dateRange':
      return `Date: ${formatDateRange(value)}`
    default:
      return `${key}: ${value}`
  }
}

function formatDateRange(value) {
  switch (value) {
    case 'today':
      return 'Today'
    case 'week':
      return 'This Week'
    case 'month':
      return 'This Month'
    case 'year':
      return 'This Year'
    default:
      return value
  }
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

function highlightMatch(text) {
  if (!text || !props.query) return text
  return searchStore.highlightSearchTerm(text, props.query)
}

// Watch for query changes
watch(() => props.query, (newQuery) => {
  if (newQuery && props.autoSearch) {
    performSearch()
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  if (props.query && props.autoSearch) {
    performSearch()
  }
})
</script>

<style scoped>
.search-results {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.results-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-50);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.results-info h2 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: 600;
}

.query-text {
  color: var(--primary-color);
}

.results-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.result-count {
  font-weight: 500;
}

.search-time {
  color: var(--text-color-tertiary);
}

.results-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.view-mode-toggle {
  display: flex;
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  overflow: hidden;
}

.view-btn {
  background: var(--surface-ground);
  border: none;
  padding: 0.5rem 0.75rem;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.view-btn.active {
  background: var(--primary-color);
  color: white;
}

.sort-select,
.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  background: var(--surface-ground);
  color: var(--text-color);
  font-size: 0.875rem;
}

.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.active-filters {
  flex: 1;
}

.no-filters {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.filter-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--primary-100);
  color: var(--primary-700);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.remove-filter {
  background: none;
  border: none;
  color: var(--primary-700);
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 0.125rem;
  transition: background-color 0.2s ease;
}

.remove-filter:hover {
  background: var(--primary-200);
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: 1px solid var(--surface-border);
  color: var(--text-color-secondary);
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-state {
  gap: 1rem;
  color: var(--text-color-secondary);
}

.error-state {
  gap: 1rem;
  color: var(--red-700);
}

.error-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
  margin-top: 1rem;
}

.retry-btn:hover {
  background: var(--primary-600);
}

.empty-icon {
  font-size: 4rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.suggestions {
  margin-top: 2rem;
  text-align: left;
  max-width: 300px;
}

.suggestions h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.suggestions ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--text-color-secondary);
}

.results-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.results-list.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.result-item {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
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

.result-meta {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.result-type {
  background: var(--surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
  font-weight: 500;
}

.result-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.4;
  word-break: break-word;
}

.result-excerpt {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  line-height: 1.5;
  word-break: break-word;
}

.result-tags {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.result-tag {
  background: var(--surface-100);
  color: var(--text-color-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.more-tags {
  color: var(--text-color-tertiary);
  font-size: 0.75rem;
}

.result-path {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-color-tertiary);
}

.match-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-color-tertiary);
}

.match-source {
  font-style: italic;
}

.match-score {
  font-weight: 500;
}

.load-more-section {
  padding: 1rem;
  text-align: center;
  border-top: 1px solid var(--surface-border);
  margin-top: 1rem;
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  color: var(--text-color);
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  margin: 0 auto;
}

.load-more-btn:hover:not(:disabled) {
  background: var(--surface-100);
  border-color: var(--primary-color);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pagination-info {
  text-align: center;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  border-top: 1px solid var(--surface-border);
}

.copy-toast {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--green-600);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Highlight styles */
:deep(mark) {
  background: var(--yellow-200);
  color: var(--text-color);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
</style>