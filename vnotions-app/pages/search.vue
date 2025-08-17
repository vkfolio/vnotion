<template>
  <div class="search-page">
    <!-- Search header -->
    <div class="search-header">
      <div class="search-container">
        <SearchBox
          ref="searchBox"
          :placeholder="'Search across all pages and databases...'"
          :show-type-filter="true"
          :show-suggestions="true"
          :show-recent-searches="true"
          :show-quick-results="false"
          :autofocus="shouldAutofocus"
          @search="handleSearch"
          @select="handleResultSelect"
        />
      </div>
      
      <!-- Quick switcher shortcut info -->
      <div class="quick-switcher-info">
        <span>Press</span>
        <kbd>Ctrl</kbd>
        <span>+</span>
        <kbd>K</kbd>
        <span>for quick search anywhere</span>
      </div>
    </div>

    <!-- Search content -->
    <div class="search-content">
      <!-- Search state: empty -->
      <div v-if="!hasSearched" class="search-empty">
        <div class="empty-content">
          <i class="pi pi-search empty-icon" />
          <h2>Search VNotions</h2>
          <p>Find pages, databases, and content across your entire workspace.</p>
          
          <!-- Search tips -->
          <div class="search-tips">
            <h3>Search Tips</h3>
            <div class="tips-grid">
              <div class="tip-item">
                <i class="pi pi-lightbulb" />
                <div class="tip-content">
                  <h4>Use keywords</h4>
                  <p>Search for specific words in page titles or content</p>
                </div>
              </div>
              <div class="tip-item">
                <i class="pi pi-filter" />
                <div class="tip-content">
                  <h4>Filter by type</h4>
                  <p>Narrow results to pages or databases only</p>
                </div>
              </div>
              <div class="tip-item">
                <i class="pi pi-history" />
                <div class="tip-content">
                  <h4>Recent searches</h4>
                  <p>Access your recent searches for quick access</p>
                </div>
              </div>
              <div class="tip-item">
                <i class="pi pi-bolt" />
                <div class="tip-content">
                  <h4>Quick search</h4>
                  <p>Use Ctrl+K to search from anywhere</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Popular searches -->
          <div v-if="popularSearches.length > 0" class="popular-searches">
            <h3>Popular Searches</h3>
            <div class="popular-items">
              <button
                v-for="search in popularSearches"
                :key="search"
                class="popular-item"
                @click="performSearch(search)"
              >
                <i class="pi pi-search" />
                <span>{{ search }}</span>
              </button>
            </div>
          </div>

          <!-- Recent pages -->
          <div v-if="recentPages.length > 0" class="recent-pages">
            <h3>Recently Viewed</h3>
            <div class="recent-items">
              <div
                v-for="page in recentPages"
                :key="page.id"
                class="recent-item"
                @click="navigateToPage(page)"
              >
                <div class="recent-icon">
                  <i :class="getPageIcon(page.type)" />
                </div>
                <div class="recent-content">
                  <h4>{{ page.title }}</h4>
                  <p>{{ formatDate(page.lastViewed) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search results -->
      <div v-else class="search-results-container">
        <SearchResults
          :query="currentQuery"
          :auto-search="false"
          @select="handleResultSelect"
          @open="handleResultOpen"
        />
      </div>
    </div>

    <!-- Quick switcher -->
    <div
      v-if="quickSwitcherVisible"
      class="quick-switcher-overlay"
      @click="closeQuickSwitcher"
    >
      <div class="quick-switcher" @click.stop>
        <div class="quick-switcher-header">
          <i class="pi pi-search" />
          <input
            ref="quickSwitcherInput"
            v-model="quickSwitcherQuery"
            type="text"
            placeholder="Quick search..."
            @keydown="handleQuickSwitcherKeydown"
            @input="handleQuickSwitcherInput"
          />
          <button @click="closeQuickSwitcher" class="close-quick-switcher">
            <i class="pi pi-times" />
          </button>
        </div>
        
        <div class="quick-switcher-results">
          <div v-if="quickSwitcherResults.length === 0 && quickSwitcherQuery" class="no-quick-results">
            <i class="pi pi-info-circle" />
            <span>No results found</span>
          </div>
          <div v-else-if="quickSwitcherResults.length === 0" class="quick-suggestions">
            <div class="suggestion-section">
              <h4>Recent</h4>
              <div
                v-for="page in recentPages.slice(0, 5)"
                :key="page.id"
                class="quick-result-item"
                @click="selectQuickResult(page)"
              >
                <i :class="getPageIcon(page.type)" />
                <span>{{ page.title }}</span>
              </div>
            </div>
          </div>
          <div v-else>
            <div
              v-for="(result, index) in quickSwitcherResults"
              :key="result.id"
              class="quick-result-item"
              :class="{ 'highlighted': selectedQuickIndex === index }"
              @click="selectQuickResult(result)"
              @mouseenter="selectedQuickIndex = index"
            >
              <i :class="getPageIcon(result.type)" />
              <span v-html="highlightMatch(result.title, quickSwitcherQuery)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '~/stores/search.js'
import SearchBox from '~/components/search/SearchBox.vue'
import SearchResults from '~/components/search/SearchResults.vue'

// Meta
definePageMeta({
  title: 'Search',
  layout: 'default'
})

// Store and router
const searchStore = useSearchStore()
const route = useRoute()
const router = useRouter()

// Refs
const searchBox = ref(null)
const quickSwitcherInput = ref(null)

// Local state
const currentQuery = ref('')
const hasSearched = ref(false)
const shouldAutofocus = ref(false)

// Quick switcher
const quickSwitcherVisible = ref(false)
const quickSwitcherQuery = ref('')
const quickSwitcherResults = ref([])
const selectedQuickIndex = ref(-1)

// Mock data (would come from stores in real implementation)
const popularSearches = ref([
  'project notes',
  'meeting minutes',
  'tasks',
  'ideas'
])

const recentPages = ref([
  {
    id: '1',
    title: 'Getting Started Guide',
    type: 'page',
    lastViewed: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Project Tasks',
    type: 'database',
    lastViewed: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  }
])

// Computed
const isInitialized = computed(() => searchStore.isInitialized)

// Methods
async function handleSearch(query) {
  currentQuery.value = query
  hasSearched.value = !!query
  
  if (query) {
    await searchStore.search(query, {
      includeContent: true
    })
  }
}

function handleResultSelect(result) {
  // Add to recent pages
  addToRecentPages(result)
}

function handleResultOpen(result) {
  // Navigate to result and add to recent
  navigateToPage(result)
  addToRecentPages(result)
}

function navigateToPage(page) {
  if (page.type === 'page') {
    router.push(`/page/${page.id}`)
  } else if (page.type === 'database') {
    router.push(`/database/${page.id}`)
  }
}

function addToRecentPages(page) {
  // Remove if already exists
  const existingIndex = recentPages.value.findIndex(p => p.id === page.id)
  if (existingIndex !== -1) {
    recentPages.value.splice(existingIndex, 1)
  }
  
  // Add to beginning
  recentPages.value.unshift({
    ...page,
    lastViewed: new Date().toISOString()
  })
  
  // Keep only last 10
  recentPages.value = recentPages.value.slice(0, 10)
}

function performSearch(query) {
  if (searchBox.value) {
    searchBox.value.search(query)
  }
  currentQuery.value = query
  hasSearched.value = true
}

function getPageIcon(type) {
  switch (type) {
    case 'page':
      return 'pi pi-file'
    case 'database':
      return 'pi pi-table'
    default:
      return 'pi pi-file'
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  }
}

// Quick switcher functions
function openQuickSwitcher() {
  quickSwitcherVisible.value = true
  quickSwitcherQuery.value = ''
  quickSwitcherResults.value = []
  selectedQuickIndex.value = -1
  
  nextTick(() => {
    quickSwitcherInput.value?.focus()
  })
}

function closeQuickSwitcher() {
  quickSwitcherVisible.value = false
  quickSwitcherQuery.value = ''
  quickSwitcherResults.value = []
  selectedQuickIndex.value = -1
}

async function handleQuickSwitcherInput() {
  selectedQuickIndex.value = -1
  
  if (quickSwitcherQuery.value.trim()) {
    await searchStore.quickSwitcherSearch(quickSwitcherQuery.value)
    quickSwitcherResults.value = searchStore.quickSwitcherResults
  } else {
    quickSwitcherResults.value = []
  }
}

function handleQuickSwitcherKeydown(event) {
  const totalResults = quickSwitcherResults.value.length
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (totalResults > 0) {
        selectedQuickIndex.value = Math.min(
          selectedQuickIndex.value + 1,
          totalResults - 1
        )
      }
      break
      
    case 'ArrowUp':
      event.preventDefault()
      if (totalResults > 0) {
        selectedQuickIndex.value = Math.max(
          selectedQuickIndex.value - 1,
          -1
        )
      }
      break
      
    case 'Enter':
      event.preventDefault()
      if (selectedQuickIndex.value >= 0 && quickSwitcherResults.value[selectedQuickIndex.value]) {
        selectQuickResult(quickSwitcherResults.value[selectedQuickIndex.value])
      } else if (quickSwitcherQuery.value.trim()) {
        // Perform full search
        performSearch(quickSwitcherQuery.value)
        closeQuickSwitcher()
      }
      break
      
    case 'Escape':
      event.preventDefault()
      closeQuickSwitcher()
      break
  }
}

function selectQuickResult(result) {
  navigateToPage(result)
  addToRecentPages(result)
  closeQuickSwitcher()
}

function highlightMatch(text, query) {
  if (!query) return text
  return searchStore.highlightSearchTerm(text, query)
}

// Keyboard shortcut handler
function handleGlobalKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    openQuickSwitcher()
  }
}

// Initialize search from URL query
function initializeFromQuery() {
  const query = route.query.q
  if (query) {
    currentQuery.value = query
    hasSearched.value = true
    shouldAutofocus.value = false
    
    nextTick(() => {
      if (searchBox.value) {
        searchBox.value.search(query)
      }
    })
  } else {
    shouldAutofocus.value = true
  }
}

// Watch for query changes in URL
watch(() => route.query.q, (newQuery) => {
  if (newQuery && newQuery !== currentQuery.value) {
    currentQuery.value = newQuery
    hasSearched.value = true
    
    if (searchBox.value) {
      searchBox.value.search(newQuery)
    }
  }
})

// Lifecycle
onMounted(async () => {
  // Initialize search store if needed
  if (!isInitialized.value) {
    await searchStore.initializeSearch('/workspace/path') // Would get from workspace store
  }
  
  // Set up keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeydown)
  
  // Initialize from URL query
  initializeFromQuery()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.search-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.search-header {
  padding: 2rem 1rem 1rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-50);
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
}

.quick-switcher-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.quick-switcher-info kbd {
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-family: inherit;
  color: var(--text-color);
}

.search-content {
  flex: 1;
  overflow-y: auto;
}

.search-empty {
  padding: 3rem 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.empty-content {
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.empty-content h2 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 2rem;
}

.empty-content > p {
  margin: 0 0 3rem 0;
  color: var(--text-color-secondary);
  font-size: 1.125rem;
}

.search-tips {
  margin-bottom: 3rem;
  text-align: left;
}

.search-tips h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-color);
  text-align: center;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.tip-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
}

.tip-item i {
  font-size: 1.5rem;
  color: var(--primary-color);
  margin-top: 0.25rem;
}

.tip-content h4 {
  margin: 0 0 0.25rem 0;
  color: var(--text-color);
}

.tip-content p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

.popular-searches,
.recent-pages {
  margin-bottom: 2rem;
  text-align: left;
}

.popular-searches h3,
.recent-pages h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  text-align: center;
}

.popular-items {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.popular-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  color: var(--text-color);
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popular-item:hover {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.recent-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.recent-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recent-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-100);
  border-radius: 0.375rem;
  color: var(--text-color-secondary);
}

.recent-content {
  flex: 1;
}

.recent-content h4 {
  margin: 0 0 0.25rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.recent-content p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.search-results-container {
  height: 100%;
}

/* Quick switcher styles */
.quick-switcher-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 2000;
}

.quick-switcher {
  background: var(--surface-ground);
  border-radius: 0.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.quick-switcher-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.quick-switcher-header i {
  color: var(--text-color-secondary);
}

.quick-switcher-header input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1rem;
  outline: none;
}

.close-quick-switcher {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-quick-switcher:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.quick-switcher-results {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.no-quick-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.quick-suggestions {
  padding: 1rem;
}

.suggestion-section h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quick-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 0.375rem;
  margin: 0.125rem 0;
}

.quick-result-item:hover,
.quick-result-item.highlighted {
  background: var(--surface-50);
}

.quick-result-item i {
  color: var(--text-color-secondary);
  width: 1rem;
}

.quick-result-item span {
  color: var(--text-color);
  font-weight: 500;
}

/* Highlight styles */
:deep(mark) {
  background: var(--yellow-200);
  color: var(--text-color);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
</style>