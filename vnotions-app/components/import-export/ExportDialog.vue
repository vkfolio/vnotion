<template>
  <div v-if="visible" class="dialog-overlay" @click="close">
    <div class="export-dialog" @click.stop>
      <!-- Header -->
      <div class="dialog-header">
        <h2>Export Data</h2>
        <button class="close-btn" @click="close">
          <i class="pi pi-times" />
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <!-- Export type selection -->
        <div class="section">
          <h3>Export Format</h3>
          <p>Choose the format you want to export your data to.</p>
          
          <div class="export-formats">
            <div
              v-for="format in exportFormats"
              :key="format.type"
              class="format-card"
              :class="{ 'selected': selectedFormat === format.type }"
              @click="selectFormat(format.type)"
            >
              <div class="format-icon">
                <i :class="format.icon" />
              </div>
              <div class="format-info">
                <h4>{{ format.title }}</h4>
                <p>{{ format.description }}</p>
                <div class="format-features">
                  <span
                    v-for="feature in format.features"
                    :key="feature"
                    class="feature-tag"
                  >
                    {{ feature }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content selection -->
        <div v-if="selectedFormat" class="section">
          <h3>Select Content</h3>
          <p>Choose what content you want to include in the export.</p>
          
          <div class="content-selection">
            <!-- Selection mode -->
            <div class="selection-mode">
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="selectionMode"
                  value="all"
                  @change="updateSelection"
                />
                <span class="radio-mark"></span>
                Export all content
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="selectionMode"
                  value="selected"
                  @change="updateSelection"
                />
                <span class="radio-mark"></span>
                Select specific items
              </label>
            </div>

            <!-- Content tree -->
            <div v-if="selectionMode === 'selected'" class="content-tree">
              <div class="tree-header">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="allPagesSelected"
                    :indeterminate="somePagesSelected"
                    @change="toggleAllPages"
                  />
                  <span class="checkmark"></span>
                  Pages ({{ selectedPages.length }}/{{ availablePages.length }})
                </label>
              </div>
              <div class="tree-items">
                <div
                  v-for="page in availablePages"
                  :key="page.id"
                  class="tree-item"
                >
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      :value="page.id"
                      v-model="selectedPages"
                    />
                    <span class="checkmark"></span>
                    <i :class="getPageIcon(page.type)" />
                    <span class="item-title">{{ page.title }}</span>
                    <span class="item-meta">{{ formatDate(page.lastModified) }}</span>
                  </label>
                </div>
              </div>

              <div class="tree-header">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="allDatabasesSelected"
                    :indeterminate="someDatabasesSelected"
                    @change="toggleAllDatabases"
                  />
                  <span class="checkmark"></span>
                  Databases ({{ selectedDatabases.length }}/{{ availableDatabases.length }})
                </label>
              </div>
              <div class="tree-items">
                <div
                  v-for="database in availableDatabases"
                  :key="database.id"
                  class="tree-item"
                >
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      :value="database.id"
                      v-model="selectedDatabases"
                    />
                    <span class="checkmark"></span>
                    <i class="pi pi-table" />
                    <span class="item-title">{{ database.title }}</span>
                    <span class="item-meta">{{ database.rows.length }} rows</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Export options -->
        <div v-if="selectedFormat" class="section">
          <h3>Export Options</h3>
          
          <!-- Markdown options -->
          <div v-if="selectedFormat === 'markdown'" class="option-group">
            <h4>Markdown Options</h4>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.includeMetadata" />
              <span class="checkmark"></span>
              Include metadata as frontmatter
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.preserveFormatting" />
              <span class="checkmark"></span>
              Preserve rich text formatting
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.createZip" />
              <span class="checkmark"></span>
              Create ZIP archive
            </label>
          </div>

          <!-- HTML options -->
          <div v-if="selectedFormat === 'html'" class="option-group">
            <h4>HTML Options</h4>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.includeCSS" />
              <span class="checkmark"></span>
              Include CSS styling
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.standalone" />
              <span class="checkmark"></span>
              Create standalone HTML files
            </label>
            <label class="field-label">
              Theme:
              <select v-model="exportOptions.theme" class="select-input">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>

          <!-- JSON options -->
          <div v-if="selectedFormat === 'json'" class="option-group">
            <h4>JSON Options</h4>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.includeMetadata" />
              <span class="checkmark"></span>
              Include metadata
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.minify" />
              <span class="checkmark"></span>
              Minify JSON output
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.singleFile" />
              <span class="checkmark"></span>
              Export as single file
            </label>
          </div>

          <!-- CSV options (for databases) -->
          <div v-if="selectedFormat === 'csv' && selectedDatabases.length > 0" class="option-group">
            <h4>CSV Options</h4>
            <label class="checkbox-label">
              <input type="checkbox" v-model="exportOptions.includeHeaders" />
              <span class="checkmark"></span>
              Include column headers
            </label>
            <label class="field-label">
              Delimiter:
              <select v-model="exportOptions.delimiter" class="select-input">
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="\t">Tab</option>
                <option value="|">Pipe (|)</option>
              </select>
            </label>
            <label class="field-label">
              Date format:
              <select v-model="exportOptions.dateFormat" class="select-input">
                <option value="ISO">ISO (2023-12-25)</option>
                <option value="US">US (12/25/2023)</option>
                <option value="EU">EU (25/12/2023)</option>
              </select>
            </label>
          </div>

          <!-- Output directory -->
          <div class="option-group">
            <h4>Output</h4>
            <label class="field-label">
              Output directory:
              <div class="file-input-group">
                <input
                  type="text"
                  v-model="outputPath"
                  readonly
                  class="text-input"
                  placeholder="Select output directory..."
                />
                <button @click="selectOutputDirectory" class="browse-btn">
                  <i class="pi pi-folder-open" />
                  Browse
                </button>
              </div>
            </label>
          </div>
        </div>

        <!-- Export summary -->
        <div v-if="selectedFormat && canExport" class="section">
          <h3>Export Summary</h3>
          <div class="export-summary">
            <div class="summary-item">
              <span class="label">Format:</span>
              <span class="value">{{ getFormatLabel(selectedFormat) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Content:</span>
              <span class="value">{{ getContentSummary() }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Output:</span>
              <span class="value">{{ outputPath || 'Not selected' }}</span>
            </div>
            <div v-if="estimatedSize" class="summary-item">
              <span class="label">Estimated size:</span>
              <span class="value">{{ estimatedSize }}</span>
            </div>
          </div>
        </div>

        <!-- Export progress -->
        <div v-if="isExporting" class="export-progress">
          <div class="progress-header">
            <h3>Exporting...</h3>
            <span class="progress-percentage">{{ Math.round(exportProgress) }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${exportProgress}%` }"></div>
          </div>
          <div class="progress-details">
            <span>{{ currentOperation }}</span>
          </div>
          <div class="progress-items">
            <div
              v-for="(item, index) in progressItems"
              :key="index"
              class="progress-item"
              :class="item.status"
            >
              <i :class="getProgressIcon(item.status)" />
              <span class="item-name">{{ item.name }}</span>
              <span v-if="item.status === 'error'" class="item-error">{{ item.error }}</span>
            </div>
          </div>
        </div>

        <!-- Export complete -->
        <div v-if="exportComplete" class="export-complete">
          <div class="completion-status">
            <i v-if="exportSuccess" class="pi pi-check-circle success-icon" />
            <i v-else class="pi pi-exclamation-triangle error-icon" />
            <h3>{{ exportSuccess ? 'Export Complete!' : 'Export Failed' }}</h3>
            <p v-if="exportSuccess">
              Successfully exported {{ successCount }} of {{ totalItems }} items.
            </p>
            <p v-else>
              {{ errorCount }} of {{ totalItems }} items failed to export.
            </p>
          </div>
          
          <div v-if="exportResults" class="export-results">
            <div class="results-summary">
              <div class="result-item">
                <span class="result-label">Export path:</span>
                <span class="result-value">{{ exportResults.path }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Files created:</span>
                <span class="result-value">{{ exportResults.files || 0 }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Format:</span>
                <span class="result-value">{{ exportResults.format }}</span>
              </div>
            </div>
            
            <div class="result-actions">
              <button @click="openExportFolder" class="btn btn-secondary">
                <i class="pi pi-folder-open" />
                Open Folder
              </button>
              <button v-if="exportResults.path" @click="copyExportPath" class="btn btn-secondary">
                <i class="pi pi-copy" />
                Copy Path
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <div class="footer-left">
          <span v-if="selectedFormat && !isExporting && !exportComplete" class="selection-info">
            {{ getSelectionInfo() }}
          </span>
        </div>
        <div class="footer-right">
          <button @click="close" class="btn btn-secondary">
            {{ exportComplete ? 'Close' : 'Cancel' }}
          </button>
          <button
            v-if="!isExporting && !exportComplete"
            @click="startExport"
            :disabled="!canExport"
            class="btn btn-primary"
          >
            <i class="pi pi-download" />
            Start Export
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import ImportExportManager from '~/utils/import-export.js'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  workspacePath: {
    type: String,
    required: true
  },
  preselectedItems: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['close', 'exported'])

// Local state
const selectedFormat = ref('')
const selectionMode = ref('all')
const selectedPages = ref([])
const selectedDatabases = ref([])
const outputPath = ref('')

// Export options
const exportOptions = ref({
  // Markdown options
  includeMetadata: true,
  preserveFormatting: true,
  createZip: false,
  
  // HTML options
  includeCSS: true,
  standalone: true,
  theme: 'light',
  
  // JSON options
  minify: false,
  singleFile: true,
  
  // CSV options
  includeHeaders: true,
  delimiter: ',',
  dateFormat: 'ISO'
})

// Export progress
const isExporting = ref(false)
const exportComplete = ref(false)
const exportSuccess = ref(false)
const exportProgress = ref(0)
const currentOperation = ref('')
const progressItems = ref([])
const exportResults = ref(null)

// Available content (mock data - would come from workspace)
const availablePages = ref([
  {
    id: '1',
    title: 'Getting Started',
    type: 'page',
    lastModified: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Project Notes',
    type: 'page',
    lastModified: new Date().toISOString()
  }
])

const availableDatabases = ref([
  {
    id: 'db1',
    title: 'Tasks',
    rows: new Array(25).fill(null),
    lastModified: new Date().toISOString()
  }
])

// Export formats configuration
const exportFormats = [
  {
    type: 'markdown',
    title: 'Markdown',
    description: 'Export pages as Markdown files with frontmatter',
    icon: 'pi pi-file-edit',
    features: ['Text formatting', 'Metadata', 'Portable']
  },
  {
    type: 'html',
    title: 'HTML',
    description: 'Export as styled HTML files for web viewing',
    icon: 'pi pi-globe',
    features: ['Rich formatting', 'CSS styling', 'Web ready']
  },
  {
    type: 'json',
    title: 'JSON',
    description: 'Export raw data as JSON for backup or migration',
    icon: 'pi pi-code',
    features: ['Complete data', 'Machine readable', 'Backup']
  },
  {
    type: 'csv',
    title: 'CSV',
    description: 'Export databases as CSV spreadsheet files',
    icon: 'pi pi-table',
    features: ['Spreadsheet compatible', 'Data analysis', 'Simple format']
  }
]

// Import/Export manager
let exportManager = null

// Computed
const canExport = computed(() => {
  return selectedFormat.value && 
         outputPath.value && 
         (selectionMode.value === 'all' || 
          selectedPages.value.length > 0 || 
          selectedDatabases.value.length > 0)
})

const allPagesSelected = computed(() => {
  return availablePages.value.length > 0 && 
         selectedPages.value.length === availablePages.value.length
})

const somePagesSelected = computed(() => {
  return selectedPages.value.length > 0 && 
         selectedPages.value.length < availablePages.value.length
})

const allDatabasesSelected = computed(() => {
  return availableDatabases.value.length > 0 && 
         selectedDatabases.value.length === availableDatabases.value.length
})

const someDatabasesSelected = computed(() => {
  return selectedDatabases.value.length > 0 && 
         selectedDatabases.value.length < availableDatabases.value.length
})

const totalItems = computed(() => {
  if (selectionMode.value === 'all') {
    return availablePages.value.length + availableDatabases.value.length
  }
  return selectedPages.value.length + selectedDatabases.value.length
})

const successCount = computed(() => {
  return progressItems.value.filter(item => item.status === 'success').length
})

const errorCount = computed(() => {
  return progressItems.value.filter(item => item.status === 'error').length
})

const estimatedSize = computed(() => {
  // Mock calculation - would be based on actual content size
  const baseSize = totalItems.value * 50 // 50KB per item estimate
  return formatFileSize(baseSize * 1024)
})

// Methods
function selectFormat(format) {
  selectedFormat.value = format
  
  // Reset options for different formats
  if (format === 'csv') {
    // For CSV, only select databases by default
    if (selectionMode.value === 'selected') {
      selectedPages.value = []
    }
  }
}

function updateSelection() {
  if (selectionMode.value === 'all') {
    selectedPages.value = availablePages.value.map(p => p.id)
    selectedDatabases.value = availableDatabases.value.map(d => d.id)
  } else {
    selectedPages.value = []
    selectedDatabases.value = []
  }
}

function toggleAllPages() {
  if (allPagesSelected.value) {
    selectedPages.value = []
  } else {
    selectedPages.value = availablePages.value.map(p => p.id)
  }
}

function toggleAllDatabases() {
  if (allDatabasesSelected.value) {
    selectedDatabases.value = []
  } else {
    selectedDatabases.value = availableDatabases.value.map(d => d.id)
  }
}

async function selectOutputDirectory() {
  // In a real implementation, this would open a directory picker
  // For now, just set a mock path
  outputPath.value = '/Users/username/Desktop/VNotions Export'
}

async function startExport() {
  isExporting.value = true
  exportProgress.value = 0
  currentOperation.value = 'Preparing export...'
  
  try {
    // Initialize export manager
    exportManager = new ImportExportManager(props.workspacePath)
    
    // Prepare items to export
    const itemsToExport = getItemsToExport()
    progressItems.value = itemsToExport.map(item => ({
      name: item.title,
      status: 'pending'
    }))
    
    let result
    
    switch (selectedFormat.value) {
      case 'markdown':
        result = await exportToMarkdown(itemsToExport)
        break
      case 'html':
        result = await exportToHTML(itemsToExport)
        break
      case 'json':
        result = await exportToJSON(itemsToExport)
        break
      case 'csv':
        result = await exportToCSV(itemsToExport)
        break
      default:
        throw new Error(`Unsupported export format: ${selectedFormat.value}`)
    }
    
    exportResults.value = result.data
    exportComplete.value = true
    exportSuccess.value = result.success
    currentOperation.value = result.success ? 'Export completed!' : 'Export failed'
    
  } catch (error) {
    exportComplete.value = true
    exportSuccess.value = false
    currentOperation.value = `Export failed: ${error.message}`
  } finally {
    isExporting.value = false
  }
}

function getItemsToExport() {
  if (selectionMode.value === 'all') {
    return [
      ...availablePages.value,
      ...availableDatabases.value
    ]
  }
  
  const pages = availablePages.value.filter(p => selectedPages.value.includes(p.id))
  const databases = availableDatabases.value.filter(d => selectedDatabases.value.includes(d.id))
  
  return [...pages, ...databases]
}

async function exportToMarkdown(items) {
  const pages = items.filter(item => item.type === 'page')
  const pageIds = pages.map(p => p.id)
  
  updateProgressItems(pages, 'processing')
  
  const result = await exportManager.exportToMarkdown(
    pageIds,
    outputPath.value,
    exportOptions.value
  )
  
  updateProgressItems(pages, result.success ? 'success' : 'error')
  exportProgress.value = 100
  
  return result
}

async function exportToHTML(items) {
  const pages = items.filter(item => item.type === 'page')
  const pageIds = pages.map(p => p.id)
  
  updateProgressItems(pages, 'processing')
  
  const result = await exportManager.exportToHTML(
    pageIds,
    outputPath.value,
    exportOptions.value
  )
  
  updateProgressItems(pages, result.success ? 'success' : 'error')
  exportProgress.value = 100
  
  return result
}

async function exportToJSON(items) {
  const pageIds = items.filter(item => item.type === 'page').map(p => p.id)
  
  updateProgressItems(items, 'processing')
  
  const result = await exportManager.exportToJSON(
    pageIds,
    outputPath.value,
    exportOptions.value
  )
  
  updateProgressItems(items, result.success ? 'success' : 'error')
  exportProgress.value = 100
  
  return result
}

async function exportToCSV(items) {
  const databases = items.filter(item => item.type !== 'page')
  
  // Export each database separately
  for (const database of databases) {
    updateProgressItems([database], 'processing')
    
    const result = await exportManager.exportDatabaseToCSV(
      database.id,
      outputPath.value,
      exportOptions.value
    )
    
    updateProgressItems([database], result.success ? 'success' : 'error')
  }
  
  exportProgress.value = 100
  
  return {
    success: true,
    data: {
      format: 'csv',
      path: outputPath.value,
      files: databases.length
    }
  }
}

function updateProgressItems(items, status) {
  items.forEach(item => {
    const progressItem = progressItems.value.find(p => p.name === item.title)
    if (progressItem) {
      progressItem.status = status
    }
  })
}

function getFormatLabel(format) {
  const formatConfig = exportFormats.find(f => f.type === format)
  return formatConfig ? formatConfig.title : format
}

function getContentSummary() {
  if (selectionMode.value === 'all') {
    return 'All content'
  }
  
  const parts = []
  if (selectedPages.value.length > 0) {
    parts.push(`${selectedPages.value.length} page${selectedPages.value.length === 1 ? '' : 's'}`)
  }
  if (selectedDatabases.value.length > 0) {
    parts.push(`${selectedDatabases.value.length} database${selectedDatabases.value.length === 1 ? '' : 's'}`)
  }
  
  return parts.join(', ') || 'No content selected'
}

function getSelectionInfo() {
  return `${totalItems.value} item${totalItems.value === 1 ? '' : 's'} selected`
}

function getPageIcon(type) {
  return type === 'database' ? 'pi pi-table' : 'pi pi-file'
}

function getProgressIcon(status) {
  switch (status) {
    case 'success':
      return 'pi pi-check-circle'
    case 'error':
      return 'pi pi-exclamation-circle'
    case 'processing':
      return 'pi pi-spin pi-spinner'
    default:
      return 'pi pi-clock'
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

async function openExportFolder() {
  // In a real implementation, this would open the file explorer
  console.log('Opening export folder:', exportResults.value?.path)
}

async function copyExportPath() {
  try {
    await navigator.clipboard.writeText(exportResults.value.path)
  } catch (error) {
    console.error('Failed to copy path:', error)
  }
}

function close() {
  // Reset state
  selectedFormat.value = ''
  selectionMode.value = 'all'
  selectedPages.value = []
  selectedDatabases.value = []
  outputPath.value = ''
  isExporting.value = false
  exportComplete.value = false
  exportSuccess.value = false
  exportProgress.value = 0
  progressItems.value = []
  exportResults.value = null
  
  emit('close')
}

// Watch for dialog visibility
watch(() => props.visible, (visible) => {
  if (visible) {
    // Set preselected items if provided
    if (props.preselectedItems.length > 0) {
      selectionMode.value = 'selected'
      
      props.preselectedItems.forEach(item => {
        if (item.type === 'page') {
          selectedPages.value.push(item.id)
        } else {
          selectedDatabases.value.push(item.id)
        }
      })
    } else {
      updateSelection()
    }
  } else {
    close()
  }
})

// Lifecycle
onMounted(() => {
  exportManager = new ImportExportManager(props.workspacePath)
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-dialog {
  background: var(--surface-ground);
  border-radius: 0.5rem;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.dialog-header h2 {
  margin: 0;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.section {
  margin-bottom: 2rem;
}

.section:last-child {
  margin-bottom: 0;
}

.section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.section p {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
}

.export-formats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.format-card {
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.format-card.selected {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.format-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-100);
  border-radius: 0.5rem;
  color: var(--text-color-secondary);
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.format-card.selected .format-icon {
  background: var(--primary-color);
  color: white;
}

.format-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.format-info p {
  margin: 0 0 1rem 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

.format-features {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.feature-tag {
  background: var(--surface-100);
  color: var(--text-color-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.format-card.selected .feature-tag {
  background: var(--primary-100);
  color: var(--primary-700);
}

.content-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.selection-mode {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.content-tree {
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.tree-header {
  padding: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-50);
  font-weight: 500;
}

.tree-items {
  max-height: 200px;
  overflow-y: auto;
}

.tree-item {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.tree-item:last-child {
  border-bottom: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  width: 100%;
}

.item-title {
  flex: 1;
  color: var(--text-color);
}

.item-meta {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.option-group {
  margin-bottom: 1.5rem;
}

.option-group h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.option-group .checkbox-label {
  margin-bottom: 0.5rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-color);
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.text-input,
.select-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  background: var(--surface-ground);
  color: var(--text-color);
}

.text-input:focus,
.select-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.file-input-group {
  display: flex;
  gap: 0.5rem;
}

.file-input-group .text-input {
  flex: 1;
}

.browse-btn {
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
  color: var(--text-color);
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.browse-btn:hover {
  background: var(--surface-200);
}

.export-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
}

.summary-item .label {
  color: var(--text-color-secondary);
}

.summary-item .value {
  color: var(--text-color);
  font-weight: 500;
}

.export-progress {
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
  background: var(--surface-50);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-header h3 {
  margin: 0;
  color: var(--text-color);
}

.progress-percentage {
  font-weight: 600;
  color: var(--primary-color);
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: var(--surface-200);
  border-radius: 0.25rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 0.25rem;
  transition: width 0.3s ease;
}

.progress-details {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.progress-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.progress-item.success {
  color: var(--green-600);
}

.progress-item.error {
  color: var(--red-600);
}

.progress-item.processing {
  color: var(--blue-600);
}

.item-name {
  flex: 1;
}

.item-error {
  font-size: 0.75rem;
  color: var(--red-600);
}

.export-complete {
  text-align: center;
}

.completion-status {
  margin-bottom: 1.5rem;
}

.success-icon {
  font-size: 3rem;
  color: var(--green-500);
  margin-bottom: 0.5rem;
}

.error-icon {
  font-size: 3rem;
  color: var(--red-500);
  margin-bottom: 0.5rem;
}

.completion-status h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.export-results {
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

.results-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
}

.result-label {
  color: var(--text-color-secondary);
}

.result-value {
  color: var(--text-color);
  font-weight: 500;
  word-break: break-all;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-50);
}

.footer-left {
  flex: 1;
}

.selection-info {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.footer-right {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-secondary {
  background: var(--surface-ground);
  color: var(--text-color);
  border-color: var(--surface-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-100);
}
</style>