<template>
  <div class="calendar-view h-full flex flex-col">
    <!-- Calendar Header -->
    <div class="calendar-header border-b border-gray-200 dark:border-gray-700 p-4">
      <div v-if="!dateColumn" class="text-center">
        <Icon name="heroicons:calendar-days" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-900 dark:text-white">Configure Calendar View</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Select a date property to display events on the calendar
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
        <div class="flex items-center space-x-4">
          <button @click="previousMonth" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          </button>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ currentMonthYear }}
          </h2>
          <button @click="nextMonth" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="heroicons:chevron-right" class="w-4 h-4" />
          </button>
        </div>
        <button @click="goToToday" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          Today
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div v-if="dateColumn" class="calendar-grid flex-1 p-4">
      <div class="grid grid-cols-7 gap-1 h-full">
        <!-- Day Headers -->
        <div v-for="day in dayHeaders" :key="day" class="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ day }}
        </div>
        
        <!-- Calendar Days -->
        <div
          v-for="day in calendarDays"
          :key="day.key"
          :class="[
            'border border-gray-200 dark:border-gray-700 p-2 min-h-[120px]',
            day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900',
            day.isToday ? 'ring-2 ring-blue-500' : ''
          ]"
        >
          <div class="flex items-center justify-between mb-2">
            <span :class="[
              'text-sm',
              day.isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600',
              day.isToday ? 'font-bold text-blue-600 dark:text-blue-400' : ''
            ]">
              {{ day.date.getDate() }}
            </span>
          </div>
          
          <!-- Events for this day -->
          <div class="space-y-1">
            <div
              v-for="event in day.events"
              :key="event.id"
              class="text-xs p-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800"
              @click="handleEventClick(event)"
            >
              {{ event.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES } from '~/utils/database'

export default {
  name: 'CalendarView',
  
  props: {
    database: Object,
    view: Object,
    columns: Array,
    rows: Array,
    groupedRows: Map,
    editingRow: String,
    editingCell: Object,
    selectedRows: Set
  },

  emits: ['row-updated', 'cell-clicked', 'date-column-changed'],

  data() {
    return {
      currentDate: new Date(),
      dayHeaders: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }
  },

  computed: {
    dateColumn() {
      const dateColumnId = this.view.config?.date_column
      return this.database.columns.find(col => col.id === dateColumnId)
    },

    dateColumns() {
      return this.database.columns.filter(col => col.type === COLUMN_TYPES.DATE)
    },

    currentMonthYear() {
      return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },

    calendarDays() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days = []
      const today = new Date()
      
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        
        const events = this.getEventsForDate(date)
        
        days.push({
          key: date.toISOString(),
          date,
          isCurrentMonth: date.getMonth() === month,
          isToday: date.toDateString() === today.toDateString(),
          events
        })
      }
      
      return days
    }
  },

  methods: {
    handleDateColumnChange(columnId) {
      this.$emit('date-column-changed', columnId)
    },

    previousMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
    },

    nextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
    },

    goToToday() {
      this.currentDate = new Date()
    },

    getEventsForDate(date) {
      if (!this.dateColumn) return []
      
      return this.rows.filter(row => {
        const rowDate = row.data[this.dateColumn.id]
        if (!rowDate) return false
        
        const eventDate = new Date(rowDate)
        return eventDate.toDateString() === date.toDateString()
      }).map(row => {
        const primaryColumn = this.database.columns.find(col => col.primary)
        return {
          id: row.id,
          title: row.data[primaryColumn?.id] || 'Untitled',
          row
        }
      })
    },

    handleEventClick(event) {
      this.$emit('cell-clicked', event.row.id, this.dateColumn.id)
    }
  }
}
</script>