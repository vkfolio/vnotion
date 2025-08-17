<template>
  <div class="git-history">
    <!-- Header -->
    <div class="history-header">
      <div class="header-left">
        <i class="pi pi-history" />
        <span class="history-title">Commit History</span>
        <span v-if="totalCommits > 0" class="commit-count">{{ totalCommits }} commits</span>
      </div>
      <div class="header-right">
        <button
          class="btn btn-secondary"
          @click="refreshHistory"
          :disabled="isLoading"
        >
          <i class="pi pi-refresh" :class="{ 'rotate': isLoading }" />
        </button>
        <button
          class="btn btn-primary"
          @click="$emit('createBackup')"
          :disabled="isLoading"
        >
          <i class="pi pi-save" />
          Create Backup
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading commit history...</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
      <button class="btn btn-link" @click="clearError">
        <i class="pi pi-times" />
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="!isLoading && !error && commitHistory.length === 0" class="empty-state">
      <i class="pi pi-history empty-icon" />
      <h3>No Commits Yet</h3>
      <p>No commits have been made to this repository yet. Start making changes and commit them to see the history here.</p>
    </div>

    <!-- Commit list -->
    <div v-if="!isLoading && !error && commitHistory.length > 0" class="commit-list">
      <div
        v-for="commit in commitHistory"
        :key="commit.hash"
        class="commit-item"
        :class="{ 'selected': selectedCommit === commit.hash }"
        @click="selectCommit(commit)"
      >
        <div class="commit-main">
          <div class="commit-info">
            <div class="commit-message">{{ commit.message }}</div>
            <div class="commit-meta">
              <span class="commit-author">
                <i class="pi pi-user" />
                {{ commit.author }}
              </span>
              <span class="commit-date">
                <i class="pi pi-calendar" />
                {{ formatDate(commit.date) }}
              </span>
              <span class="commit-hash">
                <i class="pi pi-code" />
                {{ commit.hash.substring(0, 8) }}
              </span>
            </div>
          </div>
          <div class="commit-actions">
            <button
              class="action-btn"
              @click.stop="viewCommitDetails(commit)"
              title="View details"
            >
              <i class="pi pi-eye" />
            </button>
            <button
              class="action-btn"
              @click.stop="showResetConfirm(commit)"
              title="Reset to this commit"
            >
              <i class="pi pi-refresh" />
            </button>
            <button
              class="action-btn"
              @click.stop="copyCommitHash(commit.hash)"
              title="Copy commit hash"
            >
              <i class="pi pi-copy" />
            </button>
          </div>
        </div>
        
        <!-- Commit details (expanded) -->
        <div v-if="selectedCommit === commit.hash && commitDetails" class="commit-details">
          <div class="details-section">
            <h4>Changes</h4>
            <div v-if="fileChanges.length > 0" class="file-changes">
              <div
                v-for="change in fileChanges"
                :key="change.path"
                class="file-change"
              >
                <span class="change-status" :class="change.status.toLowerCase()">
                  {{ change.statusText }}
                </span>
                <span class="file-path">{{ change.path }}</span>
              </div>
            </div>
            <div v-else class="no-changes">
              No file changes detected
            </div>
          </div>
          
          <div class="details-section">
            <h4>Diff</h4>
            <div class="diff-content">
              <pre v-if="commitDetails.diff"><code>{{ commitDetails.diff }}</code></pre>
              <div v-else class="no-diff">No diff available</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Load more button -->
    <div v-if="canLoadMore" class="load-more-section">
      <button
        class="btn btn-secondary load-more-btn"
        @click="loadMoreCommits"
        :disabled="isLoading"
      >
        <i class="pi pi-plus" />
        Load More Commits
      </button>
    </div>

    <!-- Reset confirmation dialog -->
    <div v-if="showResetDialog" class="dialog-overlay" @click="cancelReset">
      <div class="reset-dialog" @click.stop>
        <div class="dialog-header">
          <h3>Reset to Commit</h3>
          <button class="close-btn" @click="cancelReset">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="dialog-content">
          <p>Are you sure you want to reset to this commit?</p>
          <div class="commit-preview">
            <div class="commit-message">{{ resetTargetCommit?.message }}</div>
            <div class="commit-hash">{{ resetTargetCommit?.hash.substring(0, 8) }}</div>
          </div>
          <div class="reset-options">
            <label>
              <input type="radio" v-model="resetMode" value="soft" />
              <span>Soft reset (keep changes in working directory)</span>
            </label>
            <label>
              <input type="radio" v-model="resetMode" value="mixed" />
              <span>Mixed reset (keep changes, unstage them)</span>
            </label>
            <label>
              <input type="radio" v-model="resetMode" value="hard" />
              <span>Hard reset (discard all changes)</span>
            </label>
          </div>
          <div class="warning" v-if="resetMode === 'hard'">
            <i class="pi pi-exclamation-triangle" />
            Warning: This will permanently discard all uncommitted changes!
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="cancelReset">
            Cancel
          </button>
          <button 
            class="btn btn-danger" 
            @click="confirmReset"
            :disabled="isLoading"
          >
            <i class="pi pi-refresh" />
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Copy success toast -->
    <div v-if="showCopySuccess" class="copy-toast">
      <i class="pi pi-check" />
      <span>Commit hash copied to clipboard</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useGitStore } from '~/stores/git.js'

// Store
const gitStore = useGitStore()

// Local state
const selectedCommit = ref(null)
const fileChanges = ref([])
const showResetDialog = ref(false)
const resetTargetCommit = ref(null)
const resetMode = ref('mixed')
const showCopySuccess = ref(false)
const historyLimit = ref(50)

// Computed
const isLoading = computed(() => gitStore.isLoading)
const error = computed(() => gitStore.error)
const commitHistory = computed(() => gitStore.commitHistory)
const commitDetails = computed(() => gitStore.commitDetails)
const totalCommits = computed(() => commitHistory.value.length)
const canLoadMore = computed(() => totalCommits.value >= historyLimit.value)

// Emits
const emit = defineEmits(['createBackup', 'showBranches'])

// Methods
async function refreshHistory() {
  await gitStore.loadCommitHistory(historyLimit.value)
}

async function loadMoreCommits() {
  historyLimit.value += 50
  await gitStore.loadCommitHistory(historyLimit.value)
}

async function selectCommit(commit) {
  if (selectedCommit.value === commit.hash) {
    // Collapse if already selected
    selectedCommit.value = null
    gitStore.clearSelection()
    fileChanges.value = []
  } else {
    selectedCommit.value = commit.hash
    await viewCommitDetails(commit)
  }
}

async function viewCommitDetails(commit) {
  selectedCommit.value = commit.hash
  await gitStore.loadCommitDetails(commit.hash)
  
  // Load file changes
  const changesResult = await gitStore.gitManager.getFileChanges(commit.hash)
  if (changesResult.success) {
    fileChanges.value = changesResult.data
  }
}

function showResetConfirm(commit) {
  resetTargetCommit.value = commit
  resetMode.value = 'mixed'
  showResetDialog.value = true
}

function cancelReset() {
  showResetDialog.value = false
  resetTargetCommit.value = null
}

async function confirmReset() {
  if (!resetTargetCommit.value) return
  
  const result = await gitStore.resetToCommit(
    resetTargetCommit.value.hash,
    resetMode.value
  )
  
  if (result.success) {
    showResetDialog.value = false
    resetTargetCommit.value = null
    selectedCommit.value = null
    gitStore.clearSelection()
  }
}

async function copyCommitHash(hash) {
  try {
    await navigator.clipboard.writeText(hash)
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy commit hash:', error)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days === 1 ? '' : 's'} ago`
  } else {
    return date.toLocaleDateString()
  }
}

function clearError() {
  gitStore.clearError()
}

// Lifecycle
onMounted(() => {
  refreshHistory()
})
</script>

<style scoped>
.git-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-title {
  font-weight: 600;
  color: var(--text-color);
}

.commit-count {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  background: var(--surface-100);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.loading-indicator,
.error-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.error-state {
  background: var(--red-50);
  color: var(--red-700);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.commit-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.commit-item {
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  background: var(--surface-50);
  transition: all 0.2s ease;
  cursor: pointer;
}

.commit-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.commit-item.selected {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.commit-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.commit-info {
  flex: 1;
  min-width: 0;
}

.commit-message {
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.commit-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  flex-wrap: wrap;
}

.commit-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.commit-author,
.commit-date,
.commit-hash {
  white-space: nowrap;
}

.commit-hash {
  font-family: monospace;
  background: var(--surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.commit-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--surface-200);
  color: var(--text-color);
}

.commit-details {
  border-top: 1px solid var(--surface-border);
  padding: 1rem;
  background: var(--surface-ground);
}

.details-section {
  margin-bottom: 1rem;
}

.details-section:last-child {
  margin-bottom: 0;
}

.details-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.file-changes {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-change {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.change-status {
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  min-width: 4rem;
  text-align: center;
}

.change-status.a {
  background: var(--green-100);
  color: var(--green-700);
}

.change-status.m {
  background: var(--orange-100);
  color: var(--orange-700);
}

.change-status.d {
  background: var(--red-100);
  color: var(--red-700);
}

.file-path {
  font-family: monospace;
  color: var(--text-color);
}

.no-changes,
.no-diff {
  color: var(--text-color-secondary);
  font-style: italic;
}

.diff-content {
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  max-height: 400px;
  overflow-y: auto;
}

.diff-content pre {
  margin: 0;
  padding: 1rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.load-more-section {
  padding: 1rem;
  text-align: center;
  border-top: 1px solid var(--surface-border);
}

.load-more-btn {
  width: 100%;
}

/* Dialog styles */
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

.reset-dialog {
  background: var(--surface-ground);
  border-radius: 0.5rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.dialog-header h3 {
  margin: 0;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.close-btn:hover {
  background: var(--surface-100);
}

.dialog-content {
  padding: 1rem;
}

.commit-preview {
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 1rem 0;
}

.commit-preview .commit-message {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.commit-preview .commit-hash {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.reset-options {
  margin: 1rem 0;
}

.reset-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 0.375rem;
  color: var(--orange-700);
  margin-top: 1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
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

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
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
  background: var(--surface-50);
  color: var(--text-color);
  border-color: var(--surface-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-100);
}

.btn-danger {
  background: var(--red-500);
  color: white;
  border-color: var(--red-500);
}

.btn-danger:hover:not(:disabled) {
  background: var(--red-600);
}

.btn-link {
  background: none;
  color: var(--primary-color);
  border: none;
  padding: 0.25rem 0.5rem;
}

.btn-link:hover:not(:disabled) {
  background: var(--primary-50);
  color: var(--primary-600);
}

.rotate {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>