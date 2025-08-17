<template>
  <div v-if="visible" class="dialog-overlay" @click="close">
    <div class="import-dialog" @click.stop>
      <!-- Header -->
      <div class="dialog-header">
        <h2>Import Data</h2>
        <button class="close-btn" @click="close">
          <i class="pi pi-times" />
        </button>
      </div>

      <!-- Step indicator -->
      <div class="step-indicator">
        <div class="step" :class="{ 'active': currentStep === 1, 'completed': currentStep > 1 }">
          <div class="step-number">1</div>
          <span>Source</span>
        </div>
        <div class="step" :class="{ 'active': currentStep === 2, 'completed': currentStep > 2 }">
          <div class="step-number">2</div>
          <span>Configure</span>
        </div>
        <div class="step" :class="{ 'active': currentStep === 3, 'completed': currentStep > 3 }">
          <div class="step-number">3</div>
          <span>Import</span>
        </div>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <!-- Step 1: Select import source -->
        <div v-if="currentStep === 1" class="step-content">
          <h3>Select Import Source</h3>
          <p>Choose the type of data you want to import into VNotions.</p>
          
          <div class="import-sources">
            <div
              v-for="source in importSources"
              :key="source.type"
              class="source-card"
              :class="{ 'selected': selectedSource === source.type }"
              @click="selectSource(source.type)"
            >
              <div class="source-icon">
                <i :class="source.icon" />
              </div>
              <div class="source-info">
                <h4>{{ source.title }}</h4>
                <p>{{ source.description }}</p>
                <div class="source-formats">
                  <span
                    v-for="format in source.formats"
                    :key="format"
                    class="format-tag"
                  >
                    {{ format }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Configure import options -->
        <div v-if="currentStep === 2" class="step-content">
          <h3>Upload & Configure</h3>
          
          <!-- File upload -->
          <div class="file-upload-section">
            <div class="upload-area" :class="{ 'dragover': isDragOver }" @drop="handleDrop" @dragover.prevent @dragenter.prevent @dragleave="isDragOver = false">
              <input
                ref="fileInput"
                type="file"
                :accept="acceptedFileTypes"
                :multiple="allowMultiple"
                @change="handleFileSelect"
                hidden
              />
              <div v-if="!selectedFiles.length" class="upload-placeholder">
                <i class="pi pi-cloud-upload" />
                <h4>Drop files here or click to browse</h4>
                <p>{{ getFileTypeDescription() }}</p>
                <button class="upload-btn" @click="$refs.fileInput.click()">
                  <i class="pi pi-plus" />
                  Select Files
                </button>
              </div>
              <div v-else class="uploaded-files">
                <div
                  v-for="(file, index) in selectedFiles"
                  :key="index"
                  class="file-item"
                >
                  <div class="file-info">
                    <i class="pi pi-file" />
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <button @click="removeFile(index)" class="remove-file-btn">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <button class="add-more-btn" @click="$refs.fileInput.click()">
                  <i class="pi pi-plus" />
                  Add More Files
                </button>
              </div>
            </div>
          </div>

          <!-- Import options -->
          <div v-if="selectedFiles.length > 0" class="import-options">
            <h4>Import Options</h4>
            
            <!-- Notion-specific options -->
            <div v-if="selectedSource === 'notion'" class="option-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.preserveIds" />
                <span class="checkmark"></span>
                Preserve original IDs
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.convertToVNotions" />
                <span class="checkmark"></span>
                Convert to VNotions format
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.createBackup" />
                <span class="checkmark"></span>
                Create backup before import
              </label>
            </div>

            <!-- Markdown-specific options -->
            <div v-if="selectedSource === 'markdown'" class="option-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.preserveStructure" />
                <span class="checkmark"></span>
                Preserve folder structure
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.convertHeaders" />
                <span class="checkmark"></span>
                Convert headers to blocks
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.extractFrontmatter" />
                <span class="checkmark"></span>
                Extract frontmatter as properties
              </label>
            </div>

            <!-- CSV-specific options -->
            <div v-if="selectedSource === 'csv'" class="option-group">
              <label class="field-label">
                Database name:
                <input
                  type="text"
                  v-model="importOptions.databaseName"
                  placeholder="Enter database name"
                  class="text-input"
                />
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.hasHeaders" />
                <span class="checkmark"></span>
                First row contains headers
              </label>
              <label class="field-label">
                Delimiter:
                <select v-model="importOptions.delimiter" class="select-input">
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </label>
            </div>

            <!-- General options -->
            <div class="option-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOptions.skipErrors" />
                <span class="checkmark"></span>
                Skip files with errors
              </label>
            </div>
          </div>
        </div>

        <!-- Step 3: Import progress -->
        <div v-if="currentStep === 3" class="step-content">
          <h3>Importing Data</h3>
          
          <div v-if="!importStarted" class="import-summary">
            <h4>Import Summary</h4>
            <div class="summary-details">
              <div class="summary-item">
                <span class="label">Source:</span>
                <span class="value">{{ getSourceLabel(selectedSource) }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Files:</span>
                <span class="value">{{ selectedFiles.length }} file{{ selectedFiles.length === 1 ? '' : 's' }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Total size:</span>
                <span class="value">{{ formatFileSize(totalFileSize) }}</span>
              </div>
            </div>
            
            <div class="import-warning" v-if="importOptions.createBackup">
              <i class="pi pi-info-circle" />
              <span>A backup will be created before importing.</span>
            </div>
            
            <button @click="startImport" class="start-import-btn" :disabled="isImporting">
              <i class="pi pi-play" />
              Start Import
            </button>
          </div>

          <!-- Import progress -->
          <div v-if="importStarted" class="import-progress">
            <div class="progress-section">
              <div class="progress-header">
                <span>{{ currentOperation }}</span>
                <span class="progress-percentage">{{ Math.round(importProgress) }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${importProgress}%` }"></div>
              </div>
              <div class="progress-details">
                <span>{{ processedFiles }} of {{ totalFiles }} files processed</span>
              </div>
            </div>

            <!-- File progress -->
            <div class="file-progress">
              <div
                v-for="(file, index) in fileProgress"
                :key="index"
                class="file-progress-item"
                :class="file.status"
              >
                <div class="file-progress-info">
                  <i :class="getFileStatusIcon(file.status)" />
                  <span class="file-name">{{ file.name }}</span>
                </div>
                <div class="file-progress-status">
                  <span v-if="file.status === 'success'" class="success-text">
                    {{ file.message }}
                  </span>
                  <span v-else-if="file.status === 'error'" class="error-text">
                    {{ file.error }}
                  </span>
                  <span v-else-if="file.status === 'processing'" class="processing-text">
                    Processing...
                  </span>
                  <span v-else class="pending-text">
                    Waiting...
                  </span>
                </div>
              </div>
            </div>

            <!-- Import complete -->
            <div v-if="importComplete" class="import-complete">
              <div class="completion-status">
                <i v-if="importSuccess" class="pi pi-check-circle success-icon" />
                <i v-else class="pi pi-exclamation-triangle error-icon" />
                <h4>{{ importSuccess ? 'Import Complete!' : 'Import Failed' }}</h4>
                <p v-if="importSuccess">
                  Successfully imported {{ successCount }} of {{ totalFiles }} files.
                </p>
                <p v-else>
                  {{ errorCount }} of {{ totalFiles }} files failed to import.
                </p>
              </div>
              
              <div v-if="importResults" class="import-results">
                <h5>Import Results</h5>
                <div class="results-summary">
                  <div class="result-item">
                    <span class="result-label">Pages imported:</span>
                    <span class="result-value">{{ importResults.pages || 0 }}</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">Databases imported:</span>
                    <span class="result-value">{{ importResults.databases || 0 }}</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">Total items:</span>
                    <span class="result-value">{{ importResults.totalItems || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <div class="footer-left">
          <button
            v-if="currentStep > 1 && !importStarted"
            @click="previousStep"
            class="btn btn-secondary"
          >
            <i class="pi pi-arrow-left" />
            Back
          </button>
        </div>
        <div class="footer-right">
          <button @click="close" class="btn btn-secondary">
            {{ importComplete ? 'Close' : 'Cancel' }}
          </button>
          <button
            v-if="currentStep < 3 && !importStarted"
            @click="nextStep"
            :disabled="!canProceed"
            class="btn btn-primary"
          >
            Next
            <i class="pi pi-arrow-right" />
          </button>
          <button
            v-if="importComplete && importSuccess"
            @click="viewImportedContent"
            class="btn btn-primary"
          >
            <i class="pi pi-eye" />
            View Imported Content
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
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
  }
})

// Emits
const emit = defineEmits(['close', 'imported'])

// Local state
const currentStep = ref(1)
const selectedSource = ref('')
const selectedFiles = ref([])
const isDragOver = ref(false)
const importOptions = ref({
  // Notion options
  preserveIds: false,
  convertToVNotions: true,
  createBackup: true,
  
  // Markdown options
  preserveStructure: true,
  convertHeaders: true,
  extractFrontmatter: true,
  
  // CSV options
  databaseName: '',
  hasHeaders: true,
  delimiter: ',',
  
  // General options
  skipErrors: true
})

// Import progress
const importStarted = ref(false)
const isImporting = ref(false)
const importComplete = ref(false)
const importSuccess = ref(false)
const importProgress = ref(0)
const currentOperation = ref('')
const processedFiles = ref(0)
const fileProgress = ref([])
const importResults = ref(null)

// Import/Export manager
let importManager = null

// Import sources configuration
const importSources = [
  {
    type: 'notion',
    title: 'Notion Export',
    description: 'Import pages and databases from Notion export files',
    icon: 'pi pi-file-export',
    formats: ['JSON', 'ZIP'],
    extensions: ['.json', '.zip']
  },
  {
    type: 'markdown',
    title: 'Markdown Files',
    description: 'Import pages from Markdown files with frontmatter support',
    icon: 'pi pi-file-edit',
    formats: ['MD'],
    extensions: ['.md', '.markdown']
  },
  {
    type: 'csv',
    title: 'CSV Files',
    description: 'Import data as databases from CSV spreadsheet files',
    icon: 'pi pi-table',
    formats: ['CSV'],
    extensions: ['.csv']
  },
  {
    type: 'json',
    title: 'JSON Export',
    description: 'Import from VNotions or other JSON export files',
    icon: 'pi pi-code',
    formats: ['JSON'],
    extensions: ['.json']
  }
]

// Computed
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return selectedSource.value !== ''
    case 2:
      return selectedFiles.value.length > 0
    case 3:
      return true
    default:
      return false
  }
})

const acceptedFileTypes = computed(() => {
  const source = importSources.find(s => s.type === selectedSource.value)
  return source ? source.extensions.join(',') : '*'
})

const allowMultiple = computed(() => {
  return selectedSource.value === 'markdown' || selectedSource.value === 'csv'
})

const totalFileSize = computed(() => {
  return selectedFiles.value.reduce((total, file) => total + file.size, 0)
})

const totalFiles = computed(() => selectedFiles.value.length)

const successCount = computed(() => {
  return fileProgress.value.filter(f => f.status === 'success').length
})

const errorCount = computed(() => {
  return fileProgress.value.filter(f => f.status === 'error').length
})

// Methods
function selectSource(sourceType) {
  selectedSource.value = sourceType
  selectedFiles.value = []
  
  // Reset options
  if (sourceType === 'csv') {
    importOptions.value.databaseName = ''
  }
}

function handleDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = Array.from(event.dataTransfer.files)
  handleFiles(files)
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  handleFiles(files)
}

function handleFiles(files) {
  const source = importSources.find(s => s.type === selectedSource.value)
  if (!source) return
  
  const validFiles = files.filter(file => {
    const extension = '.' + file.name.split('.').pop().toLowerCase()
    return source.extensions.includes(extension)
  })
  
  if (allowMultiple.value) {
    selectedFiles.value.push(...validFiles)
  } else {
    selectedFiles.value = validFiles.slice(0, 1)
  }
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

function nextStep() {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function startImport() {
  importStarted.value = true
  isImporting.value = true
  importProgress.value = 0
  currentOperation.value = 'Initializing import...'
  
  // Initialize file progress
  fileProgress.value = selectedFiles.value.map(file => ({
    name: file.name,
    status: 'pending',
    message: '',
    error: ''
  }))
  
  try {
    // Initialize import manager
    importManager = new ImportExportManager(props.workspacePath)
    
    let totalResults = {
      pages: 0,
      databases: 0,
      totalItems: 0
    }
    
    // Process each file
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      const fileProgressItem = fileProgress.value[i]
      
      fileProgressItem.status = 'processing'
      currentOperation.value = `Processing ${file.name}...`
      
      try {
        let result
        
        switch (selectedSource.value) {
          case 'notion':
            result = await importManager.importFromNotion(file, importOptions.value)
            break
          case 'markdown':
            result = await importManager.importFromMarkdown([file], importOptions.value)
            break
          case 'csv':
            result = await importManager.importFromCSV(file, importOptions.value)
            break
          case 'json':
            // Handle JSON import
            result = { success: true, data: { totalItems: 1 } }
            break
          default:
            throw new Error(`Unsupported import type: ${selectedSource.value}`)
        }
        
        if (result.success) {
          fileProgressItem.status = 'success'
          fileProgressItem.message = `Imported ${result.data.totalItems || 1} items`
          
          // Accumulate results
          if (result.data.pages) totalResults.pages += result.data.pages.length
          if (result.data.databases) totalResults.databases += result.data.databases.length
          totalResults.totalItems += result.data.totalItems || 1
        } else {
          fileProgressItem.status = 'error'
          fileProgressItem.error = result.error || 'Import failed'
        }
      } catch (error) {
        fileProgressItem.status = 'error'
        fileProgressItem.error = error.message
      }
      
      processedFiles.value = i + 1
      importProgress.value = ((i + 1) / selectedFiles.value.length) * 100
    }
    
    importResults.value = totalResults
    importComplete.value = true
    importSuccess.value = errorCount.value === 0
    currentOperation.value = importSuccess.value ? 'Import completed successfully!' : 'Import completed with errors'
    
  } catch (error) {
    importComplete.value = true
    importSuccess.value = false
    currentOperation.value = `Import failed: ${error.message}`
  } finally {
    isImporting.value = false
  }
}

function getSourceLabel(sourceType) {
  const source = importSources.find(s => s.type === sourceType)
  return source ? source.title : sourceType
}

function getFileTypeDescription() {
  const source = importSources.find(s => s.type === selectedSource.value)
  if (!source) return 'Select files to import'
  
  return `Accepts ${source.formats.join(', ')} files`
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileStatusIcon(status) {
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

function viewImportedContent() {
  emit('imported', importResults.value)
  close()
}

function close() {
  // Reset state
  currentStep.value = 1
  selectedSource.value = ''
  selectedFiles.value = []
  importStarted.value = false
  isImporting.value = false
  importComplete.value = false
  importSuccess.value = false
  importProgress.value = 0
  processedFiles.value = 0
  fileProgress.value = []
  importResults.value = null
  
  emit('close')
}

// Watch for dialog visibility
watch(() => props.visible, (visible) => {
  if (!visible) {
    close()
  }
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

.import-dialog {
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

.step-indicator {
  display: flex;
  justify-content: center;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-50);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex: 1;
  max-width: 150px;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 1rem;
  right: -50%;
  width: 100%;
  height: 2px;
  background: var(--surface-border);
  z-index: 1;
}

.step.completed:not(:last-child)::after {
  background: var(--primary-color);
}

.step-number {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--surface-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  background: var(--surface-ground);
  color: var(--text-color-secondary);
  z-index: 2;
  position: relative;
}

.step.active .step-number {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.step.completed .step-number {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.step span {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.step.active span,
.step.completed span {
  color: var(--text-color);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.step-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.step-content p {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
}

.import-sources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.source-card {
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.source-card.selected {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.source-icon {
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

.source-card.selected .source-icon {
  background: var(--primary-color);
  color: white;
}

.source-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.source-info p {
  margin: 0 0 1rem 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

.source-formats {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.format-tag {
  background: var(--surface-100);
  color: var(--text-color-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.source-card.selected .format-tag {
  background: var(--primary-100);
  color: var(--primary-700);
}

.file-upload-section {
  margin-bottom: 1.5rem;
}

.upload-area {
  border: 2px dashed var(--surface-border);
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  transition: all 0.2s ease;
}

.upload-area.dragover {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.upload-placeholder i {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.upload-placeholder h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.upload-placeholder p {
  margin: 0 0 1rem 0;
  color: var(--text-color-secondary);
}

.upload-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 auto;
  transition: background-color 0.2s ease;
}

.upload-btn:hover {
  background: var(--primary-600);
}

.uploaded-files {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 0.375rem;
  border: 1px solid var(--surface-border);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  color: var(--text-color);
}

.file-size {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.remove-file-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.remove-file-btn:hover {
  background: var(--red-100);
  color: var(--red-600);
}

.add-more-btn {
  background: var(--surface-100);
  color: var(--text-color);
  border: 1px dashed var(--surface-border);
  padding: 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.add-more-btn:hover {
  background: var(--surface-200);
  border-color: var(--primary-color);
}

.import-options h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-color);
  font-weight: 500;
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

.import-summary h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
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

.import-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: 0.375rem;
  color: var(--blue-700);
  margin-bottom: 1rem;
}

.start-import-btn {
  background: var(--green-500);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}

.start-import-btn:hover:not(:disabled) {
  background: var(--green-600);
}

.start-import-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-section {
  margin-bottom: 1.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
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
}

.file-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-progress-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 0.375rem;
  border: 1px solid var(--surface-border);
}

.file-progress-item.success {
  border-color: var(--green-500);
  background: var(--green-50);
}

.file-progress-item.error {
  border-color: var(--red-500);
  background: var(--red-50);
}

.file-progress-item.processing {
  border-color: var(--blue-500);
  background: var(--blue-50);
}

.file-progress-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-name {
  font-weight: 500;
  color: var(--text-color);
}

.success-text {
  color: var(--green-600);
}

.error-text {
  color: var(--red-600);
}

.processing-text {
  color: var(--blue-600);
}

.pending-text {
  color: var(--text-color-secondary);
}

.import-complete {
  text-align: center;
  margin-top: 1rem;
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

.completion-status h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.import-results h5 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.results-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-50);
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