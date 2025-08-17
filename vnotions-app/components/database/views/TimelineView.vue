<template>
  <div class="timeline-view h-full flex flex-col">
    <!-- Timeline Header -->
    <div class="timeline-header border-b border-gray-200 dark:border-gray-700 p-4">
      <div v-if="!dateColumn" class="text-center">
        <Icon name="heroicons:clock" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-900 dark:text-white">Configure Timeline View</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Select a date property to display items on the timeline
        </p>
        <select
          :value="view.config?.date_column || ''"
          @change="handleDateColumnChange($event.target.value)"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
        >
          <option value="">Select date property...</option>
          <option v-for="column in dateColumns" :key="column.id" :value="column.id">
            {{ column.name }}
          </option>
        </select>
      </div>
      <div v-else class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Timeline - {{ dateColumn.name }}
        </h2>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-500 dark:text-gray-400">View:</span>
          <select
            :value="view.config?.timeline_view || 'months'"
            @change="handleTimelineViewChange($event.target.value)"
            class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Timeline Content -->
    <div v-if="dateColumn" class="timeline-content flex-1 overflow-auto p-4">
      <div v-if="timelineGroups.length === 0" class="empty-state text-center py-12">
        <Icon name="heroicons:clock" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-sm font-medium text-gray-900 dark:text-white">No timeline items</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Add items with dates to see them on the timeline</p>
        <button @click="$emit('row-added')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add item
        </button>
      </div>
      
      <div v-else class="space-y-6">
        <div
          v-for="group in timelineGroups"
          :key="group.period"
          class="timeline-group"
        >
          <!-- Time Period Header -->
          <div class="flex items-center mb-4">
            <div class="flex-shrink-0 w-20 text-right">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ group.period }}
              </span>
            </div>
            <div class="flex-1 ml-4 border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          
          <!-- Timeline Items -->
          <div class="ml-24 space-y-3">
            <div
              v-for="item in group.items"
              :key="item.id"
              :class="[
                'timeline-item flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-sm transition-all',
                selectedRows.has(item.id) ? 'ring-2 ring-blue-500' : ''
              ]"
              @click="handleItemClick(item)"
            >
              <!-- Timeline Dot -->
              <div class="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
              
              <!-- Item Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ getPrimaryValue(item) || 'Untitled' }}
                  </h3>
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(item.data[dateColumn.id]) }}
                    </span>
                    <input
                      type="checkbox"
                      :checked="selectedRows.has(item.id)"
                      @change="handleSelectionChange(item.id, $event.target.checked)"
                      @click.stop
                      class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <!-- Additional Fields -->
                <div v-if="visibleColumns.length > 0" class="mt-1 flex flex-wrap gap-3">
                  <div
                    v-for="column in visibleColumns.slice(0, 3)"
                    :key="column.id"
                    class="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <Icon :name="getColumnIcon(column.type)" class="w-3 h-3" />
                    <span>{{ formatValue(item.data[column.id], column) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES, getCellDisplayValue } from '~/utils/database'

export default {
  name: 'TimelineView',
  
  props: {
    database: Object,
    view: Object,
    columns: Array,
    rows: Array,
    selectedRows: Set
  },

  emits: ['cell-clicked', 'row-selection-changed', 'row-added', 'date-column-changed', 'timeline-view-changed'],

  computed: {
    dateColumn() {
      const dateColumnId = this.view.config?.date_column
      return this.database.columns.find(col => col.id === dateColumnId)
    },
    
    dateColumns() {
      return this.database.columns.filter(col => col.type === COLUMN_TYPES.DATE)
    },
    
    primaryColumn() {
      return this.database.columns.find(col => col.primary)
    },
    
    visibleColumns() {
      return this.columns.filter(col => !col.primary && col.id !== this.dateColumn?.id)
    },
    
    timelineView() {
      return this.view.config?.timeline_view || 'months'
    },
    
    timelineGroups() {
      if (!this.dateColumn) return []
      
      const groups = new Map()
      
      this.rows.forEach(row => {
        const dateValue = row.data[this.dateColumn.id]
        if (!dateValue) return
        
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) return
        
        const period = this.getPeriod(date)
        
        if (!groups.has(period)) {
          groups.set(period, {
            period,
            items: [],
            sortDate: date
          })
        }
        
        groups.get(period).items.push(row)
      })
      
      // Sort groups by date and items within groups
      return Array.from(groups.values())
        .sort((a, b) => b.sortDate - a.sortDate)
        .map(group => ({
          ...group,
          items: group.items.sort((a, b) => {
            const dateA = new Date(a.data[this.dateColumn.id])
            const dateB = new Date(b.data[this.dateColumn.id])
            return dateB - dateA
          })
        }))
    }
  },

  methods: {
    handleDateColumnChange(columnId) {
      this.$emit('date-column-changed', columnId)
    },
    
    handleTimelineViewChange(viewType) {
      this.$emit('timeline-view-changed', viewType)
    },
    
    getPeriod(date) {
      switch (this.timelineView) {
        case 'days':
          return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        case 'weeks':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        case 'months':
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        case 'years':
          return date.getFullYear().toString()
        default:
          return date.toLocaleDateString()
      }
    },
    
    getPrimaryValue(row) {
      return this.primaryColumn ? row.data[this.primaryColumn.id] : null
    },
    
    formatValue(value, column) {
      return getCellDisplayValue(value, column) || 'Empty'
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    },
    
    getColumnIcon(type) {
      const iconMap = {
        [COLUMN_TYPES.TEXT]: 'heroicons:document-text',
        [COLUMN_TYPES.NUMBER]: 'heroicons:hashtag',
        [COLUMN_TYPES.DATE]: 'heroicons:calendar-days',
        [COLUMN_TYPES.SELECT]: 'heroicons:chevron-down'
      }
      return iconMap[type] || 'heroicons:document-text'
    },
    
    handleItemClick(item) {
      this.$emit('cell-clicked', item.id, this.primaryColumn?.id)
    },
    
    handleSelectionChange(rowId, selected) {
      this.$emit('row-selection-changed', rowId, selected)
    }
  }
}
</script>

<style scoped>
.timeline-item {
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: -12px;
  bottom: -12px;
  width: 2px;
  background-color: theme('colors.gray.200');
}

.dark .timeline-item::before {
  background-color: theme('colors.gray.700');
}

.timeline-item:first-child::before {
  top: 12px;
}

.timeline-item:last-child::before {
  bottom: auto;
  height: 12px;
}
</style>