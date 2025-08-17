<template>
  <div class="database-toolbar border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
    <div class="flex items-center justify-between">
      <!-- Left side - Views and actions -->
      <div class="flex items-center space-x-4">
        <!-- View Selector -->
        <div class="flex items-center space-x-1">
          <select
            :value="currentView?.id"
            @change="handleViewChange($event.target.value)"
            class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option v-for="view in views" :key="view.id" :value="view.id">
              {{ view.name }}
            </option>
          </select>
          
          <!-- View Type Icons -->
          <div class="flex items-center border border-gray-300 dark:border-gray-600 rounded">
            <button
              v-for="viewType in availableViewTypes"
              :key="viewType.type"
              @click="handleViewTypeChange(viewType.type)"
              :class="[
                'p-1.5 transition-colors',
                currentView?.type === viewType.type
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              ]"
              :title="viewType.label"
            >
              <Icon :name="viewType.icon" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex items-center space-x-1">
          <button
            @click="showFilters = !showFilters"
            :class="[
              'flex items-center space-x-1 px-2 py-1 text-sm rounded transition-colors',
              activeFilters.length > 0 || showFilters
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            ]"
          >
            <Icon name="heroicons:funnel" class="w-4 h-4" />
            <span>Filter</span>
            <span v-if="activeFilters.length > 0" class="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {{ activeFilters.length }}
            </span>
          </button>

          <!-- Sort -->
          <button
            @click="showSorts = !showSorts"
            :class="[
              'flex items-center space-x-1 px-2 py-1 text-sm rounded transition-colors',
              activeSorts.length > 0 || showSorts
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            ]"
          >
            <Icon name="heroicons:bars-arrow-up" class="w-4 h-4" />
            <span>Sort</span>
            <span v-if="activeSorts.length > 0" class="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {{ activeSorts.length }}
            </span>
          </button>

          <!-- Group -->
          <button
            @click="showGrouping = !showGrouping"
            :class="[
              'flex items-center space-x-1 px-2 py-1 text-sm rounded transition-colors',
              groupBy || showGrouping
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            ]"
          >
            <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
            <span>Group</span>
          </button>
        </div>
      </div>

      <!-- Right side - Search and actions -->
      <div class="flex items-center space-x-3">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="localSearchQuery"
            @input="handleSearchInput"
            type="text"
            placeholder="Search..."
            class="w-64 pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Icon name="heroicons:magnifying-glass" class="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          
          <!-- Clear search -->
          <button
            v-if="localSearchQuery"
            @click="clearSearch"
            class="absolute right-2 top-1.5 w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Add Row -->
        <button
          @click="$emit('add-row')"
          class="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          <span>New</span>
        </button>

        <!-- More Options -->
        <div class="relative">
          <button
            @click="showOptionsMenu = !showOptionsMenu"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon name="heroicons:ellipsis-horizontal" class="w-4 h-4" />
          </button>
          
          <!-- Options Menu -->
          <div
            v-if="showOptionsMenu"
            v-click-outside="() => showOptionsMenu = false"
            class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10"
          >
            <div class="py-1">
              <button
                @click="handleCreateView"
                class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icon name="heroicons:plus" class="w-4 h-4" />
                <span>New View</span>
              </button>
              
              <button
                v-if="currentView && !currentView.is_default"
                @click="handleDeleteView"
                class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icon name="heroicons:trash" class="w-4 h-4" />
                <span>Delete View</span>
              </button>
              
              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              
              <button
                @click="handleExportData"
                class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilters" class="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white">Filters</h4>
          <button
            @click="handleAddFilter"
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Add filter
          </button>
        </div>
        
        <!-- Active Filters -->
        <div v-if="activeFilters.length > 0" class="space-y-2">
          <div
            v-for="(filter, index) in activeFilters"
            :key="index"
            class="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
          >
            <!-- Column -->
            <select
              :value="filter.column"
              @change="updateFilter(index, { column: $event.target.value })"
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option v-for="column in database?.columns" :key="column.id" :value="column.id">
                {{ column.name }}
              </option>
            </select>
            
            <!-- Operator -->
            <select
              :value="filter.operator"
              @change="updateFilter(index, { operator: $event.target.value })"
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option v-for="operator in getFilterOperators(filter.column)" :key="operator" :value="operator">
                {{ formatOperator(operator) }}
              </option>
            </select>
            
            <!-- Condition Value -->
            <input
              v-if="needsConditionValue(filter.operator)"
              :value="filter.condition"
              @input="updateFilter(index, { condition: $event.target.value })"
              type="text"
              placeholder="Value"
              class="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            />
            
            <!-- Remove Filter -->
            <button
              @click="removeFilter(index)"
              class="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
            >
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No filters applied
        </div>
      </div>
    </div>

    <!-- Sort Panel -->
    <div v-if="showSorts" class="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white">Sort</h4>
          <button
            @click="handleAddSort"
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Add sort
          </button>
        </div>
        
        <!-- Active Sorts -->
        <div v-if="activeSorts.length > 0" class="space-y-2">
          <div
            v-for="(sort, index) in activeSorts"
            :key="index"
            class="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
          >
            <!-- Column -->
            <select
              :value="sort.column"
              @change="updateSort(index, { column: $event.target.value })"
              class="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option v-for="column in database?.columns" :key="column.id" :value="column.id">
                {{ column.name }}
              </option>
            </select>
            
            <!-- Direction -->
            <select
              :value="sort.direction"
              @change="updateSort(index, { direction: $event.target.value })"
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="ascending">A → Z</option>
              <option value="descending">Z → A</option>
            </select>
            
            <!-- Remove Sort -->
            <button
              @click="removeSort(sort.column)"
              class="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
            >
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No sorting applied
        </div>
      </div>
    </div>

    <!-- Group Panel -->
    <div v-if="showGrouping" class="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-gray-900 dark:text-white">Group by</h4>
        
        <select
          :value="groupBy || ''"
          @change="handleGroupByChange($event.target.value)"
          class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
        >
          <option value="">No grouping</option>
          <option v-for="column in database?.columns" :key="column.id" :value="column.id">
            {{ column.name }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import { VIEW_TYPES, FILTER_OPERATORS } from '~/utils/database'

export default {
  name: 'DatabaseToolbar',

  props: {
    database: {
      type: Object,
      default: null
    },
    currentView: {
      type: Object,
      default: null
    },
    views: {
      type: Array,
      default: () => []
    },
    filters: {
      type: Array,
      default: () => []
    },
    sorts: {
      type: Array,
      default: () => []
    },
    groupBy: {
      type: String,
      default: null
    },
    searchQuery: {
      type: String,
      default: ''
    }
  },

  emits: [
    'view-changed',
    'filter-added',
    'filter-updated',
    'filter-removed',
    'sort-added',
    'sort-removed',
    'group-by-changed',
    'search-changed',
    'add-row'
  ],

  data() {
    return {
      showFilters: false,
      showSorts: false,
      showGrouping: false,
      showOptionsMenu: false,
      localSearchQuery: '',
      searchTimeout: null,

      availableViewTypes: [
        { type: VIEW_TYPES.TABLE, label: 'Table', icon: 'heroicons:table-cells' },
        { type: VIEW_TYPES.BOARD, label: 'Board', icon: 'heroicons:view-columns' },
        { type: VIEW_TYPES.CALENDAR, label: 'Calendar', icon: 'heroicons:calendar-days' },
        { type: VIEW_TYPES.LIST, label: 'List', icon: 'heroicons:list-bullet' },
        { type: VIEW_TYPES.GALLERY, label: 'Gallery', icon: 'heroicons:photo' },
        { type: VIEW_TYPES.TIMELINE, label: 'Timeline', icon: 'heroicons:clock' }
      ]
    }
  },

  computed: {
    activeFilters() {
      return this.filters || []
    },

    activeSorts() {
      return this.sorts || []
    }
  },

  watch: {
    searchQuery: {
      handler(newQuery) {
        this.localSearchQuery = newQuery
      },
      immediate: true
    },

    filters: {
      handler(newFilters) {
        this.showFilters = newFilters && newFilters.length > 0
      },
      immediate: true
    },

    sorts: {
      handler(newSorts) {
        this.showSorts = newSorts && newSorts.length > 0
      },
      immediate: true
    },

    groupBy: {
      handler(newGroupBy) {
        this.showGrouping = !!newGroupBy
      },
      immediate: true
    }
  },

  methods: {
    handleViewChange(viewId) {
      this.$emit('view-changed', viewId)
    },

    async handleViewTypeChange(viewType) {
      if (!this.currentView || this.currentView.type === viewType) return

      // Create a new view with the selected type
      const newViewName = `${viewType.charAt(0).toUpperCase() + viewType.slice(1)} View`
      
      // Emit view creation event (this should be handled by the parent component)
      this.$emit('view-created', {
        name: newViewName,
        type: viewType
      })
    },

    handleSearchInput() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout)
      }

      this.searchTimeout = setTimeout(() => {
        this.$emit('search-changed', this.localSearchQuery)
      }, 300)
    },

    clearSearch() {
      this.localSearchQuery = ''
      this.$emit('search-changed', '')
    },

    handleAddFilter() {
      if (!this.database?.columns?.length) return

      const firstColumn = this.database.columns[0]
      const operators = this.getFilterOperators(firstColumn.id)
      
      const newFilter = {
        column: firstColumn.id,
        operator: operators[0],
        condition: ''
      }

      this.$emit('filter-added', newFilter)
    },

    updateFilter(index, updates) {
      this.$emit('filter-updated', index, updates)
    },

    removeFilter(index) {
      this.$emit('filter-removed', index)
    },

    handleAddSort() {
      if (!this.database?.columns?.length) return

      const firstColumn = this.database.columns[0]
      
      const newSort = {
        column: firstColumn.id,
        direction: 'ascending'
      }

      this.$emit('sort-added', newSort)
    },

    updateSort(index, updates) {
      // Remove old sort and add new one
      const sort = this.activeSorts[index]
      this.$emit('sort-removed', sort.column)
      this.$emit('sort-added', { ...sort, ...updates })
    },

    removeSort(columnId) {
      this.$emit('sort-removed', columnId)
    },

    handleGroupByChange(columnId) {
      this.$emit('group-by-changed', columnId || null)
    },

    getFilterOperators(columnId) {
      if (!this.database?.columns) return []

      const column = this.database.columns.find(col => col.id === columnId)
      if (!column) return []

      return FILTER_OPERATORS[column.type] || []
    },

    formatOperator(operator) {
      const operatorLabels = {
        'equals': 'Equals',
        'does_not_equal': 'Does not equal',
        'contains': 'Contains',
        'does_not_contain': 'Does not contain',
        'starts_with': 'Starts with',
        'ends_with': 'Ends with',
        'is_empty': 'Is empty',
        'is_not_empty': 'Is not empty',
        'greater_than': 'Greater than',
        'less_than': 'Less than',
        'greater_than_or_equal_to': 'Greater than or equal to',
        'less_than_or_equal_to': 'Less than or equal to',
        'before': 'Before',
        'after': 'After',
        'on_or_before': 'On or before',
        'on_or_after': 'On or after',
        'past_week': 'Past week',
        'past_month': 'Past month',
        'past_year': 'Past year',
        'next_week': 'Next week',
        'next_month': 'Next month',
        'next_year': 'Next year',
        'checked': 'Checked',
        'unchecked': 'Unchecked'
      }

      return operatorLabels[operator] || operator
    },

    needsConditionValue(operator) {
      const noValueOperators = [
        'is_empty',
        'is_not_empty',
        'checked',
        'unchecked',
        'past_week',
        'past_month',
        'past_year',
        'next_week',
        'next_month',
        'next_year'
      ]

      return !noValueOperators.includes(operator)
    },

    handleCreateView() {
      this.showOptionsMenu = false
      // Emit event to create new view
      this.$emit('view-create-requested')
    },

    handleDeleteView() {
      this.showOptionsMenu = false
      if (this.currentView && !this.currentView.is_default) {
        // Emit event to delete view
        this.$emit('view-delete-requested', this.currentView.id)
      }
    },

    handleExportData() {
      this.showOptionsMenu = false
      // Emit event to export data
      this.$emit('export-requested')
    }
  }
}
</script>

<style scoped>
.database-toolbar {
  /* Toolbar-specific styles */
}
</style>