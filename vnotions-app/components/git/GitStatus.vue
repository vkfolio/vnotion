<template>
  <div class="git-status">
    <!-- Header -->
    <div class="git-status-header">
      <div class="header-left">
        <i class="pi pi-code-branch" />
        <span class="git-title">Git Status</span>
        <span v-if="!isGitRepo" class="not-initialized">Not initialized</span>
      </div>
      <div class="header-right">
        <button
          v-if="!isGitRepo"
          class="btn btn-primary"
          @click="initializeRepository"
          :disabled="isLoading"
        >
          <i class="pi pi-plus" />
          Initialize Git
        </button>
        <button
          v-else
          class="btn btn-secondary"
          @click="refreshStatus"
          :disabled="isLoading"
        >
          <i class="pi pi-refresh" :class="{ 'rotate': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading...</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
      <button class="btn btn-link" @click="clearError">
        <i class="pi pi-times" />
      </button>
    </div>

    <!-- Git not initialized -->
    <div v-if="!isGitRepo && !isLoading" class="empty-state">
      <i class="pi pi-code-branch empty-icon" />
      <h3>Git Not Initialized</h3>
      <p>Version control is not set up for this workspace. Initialize Git to track changes and collaborate.</p>
      <button class="btn btn-primary" @click="initializeRepository">
        <i class="pi pi-plus" />
        Initialize Git Repository
      </button>
    </div>

    <!-- Main content -->
    <div v-if="isGitRepo && !isLoading" class="git-content">
      <!-- Branch info -->
      <div class="branch-section">
        <div class="section-header">
          <i class="pi pi-code-branch" />
          <span>Branch Information</span>
        </div>
        <div class="branch-info">
          <div class="current-branch">
            <i class="pi pi-code-branch" />
            <span class="branch-name">{{ status.branch || 'main' }}</span>
            <span v-if="status.ahead > 0" class="ahead-count">
              ↑{{ status.ahead }}
            </span>
            <span v-if="status.behind > 0" class="behind-count">
              ↓{{ status.behind }}
            </span>
          </div>
          <div v-if="hasRemotes" class="sync-status">
            <button class="btn btn-link" @click="pullChanges" :disabled="isLoading">
              <i class="pi pi-download" />
              Pull
            </button>
            <button class="btn btn-link" @click="pushChanges" :disabled="isLoading">
              <i class="pi pi-upload" />
              Push
            </button>
          </div>
        </div>
      </div>

      <!-- Status overview -->
      <div class="status-overview">
        <div class="status-item" :class="{ 'has-changes': stagedCount > 0 }">
          <i class="pi pi-plus-circle" />
          <span class="count">{{ stagedCount }}</span>
          <span class="label">Staged</span>
        </div>
        <div class="status-item" :class="{ 'has-changes': modifiedCount > 0 }">
          <i class="pi pi-pencil" />
          <span class="count">{{ modifiedCount }}</span>
          <span class="label">Modified</span>
        </div>
        <div class="status-item" :class="{ 'has-changes': untrackedCount > 0 }">
          <i class="pi pi-question-circle" />
          <span class="count">{{ untrackedCount }}</span>
          <span class="label">Untracked</span>
        </div>
      </div>

      <!-- Conflicts warning -->
      <div v-if="hasConflicts" class="conflicts-warning">
        <i class="pi pi-exclamation-triangle" />
        <span>{{ conflicts.length }} conflicts need resolution</span>
        <button class="btn btn-warning" @click="$emit('showConflicts')">
          Resolve Conflicts
        </button>
      </div>

      <!-- File changes -->
      <div class="changes-section">
        <!-- Staged files -->
        <div v-if="status.staged.length > 0" class="file-group">
          <div class="group-header">
            <i class="pi pi-plus-circle staged-icon" />
            <span>Staged Changes ({{ status.staged.length }})</span>
            <button class="btn btn-link" @click="unstageAll">
              <i class="pi pi-minus" />
              Unstage All
            </button>
          </div>
          <div class="file-list">
            <div
              v-for="file in status.staged"
              :key="file"
              class="file-item staged"
            >
              <i class="pi pi-file" />
              <span class="file-path">{{ file }}</span>
              <button
                class="file-action"
                @click="unstageFile(file)"
                title="Unstage file"
              >
                <i class="pi pi-minus" />
              </button>
            </div>
          </div>
        </div>

        <!-- Modified files -->
        <div v-if="status.modified.length > 0" class="file-group">
          <div class="group-header">
            <i class="pi pi-pencil modified-icon" />
            <span>Modified Files ({{ status.modified.length }})</span>
            <button class="btn btn-link" @click="stageAll">
              <i class="pi pi-plus" />
              Stage All
            </button>
          </div>
          <div class="file-list">
            <div
              v-for="file in status.modified"
              :key="file"
              class="file-item modified"
            >
              <i class="pi pi-file" />
              <span class="file-path">{{ file }}</span>
              <button
                class="file-action"
                @click="stageFile(file)"
                title="Stage file"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>
        </div>

        <!-- Untracked files -->
        <div v-if="status.untracked.length > 0" class="file-group">
          <div class="group-header">
            <i class="pi pi-question-circle untracked-icon" />
            <span>Untracked Files ({{ status.untracked.length }})</span>
            <button class="btn btn-link" @click="stageAll">
              <i class="pi pi-plus" />
              Stage All
            </button>
          </div>
          <div class="file-list">
            <div
              v-for="file in status.untracked"
              :key="file"
              class="file-item untracked"
            >
              <i class="pi pi-file" />
              <span class="file-path">{{ file }}</span>
              <button
                class="file-action"
                @click="stageFile(file)"
                title="Stage file"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>
        </div>

        <!-- Clean state -->
        <div v-if="status.clean" class="clean-state">
          <i class="pi pi-check-circle" />
          <span>Working tree is clean</span>
        </div>
      </div>

      <!-- Commit section -->
      <div v-if="hasChanges && stagedCount > 0" class="commit-section">
        <div class="commit-form">
          <div class="commit-header">
            <i class="pi pi-bookmark" />
            <span>Commit Changes</span>
          </div>
          <textarea
            v-model="commitMessage"
            class="commit-message"
            placeholder="Enter commit message..."
            rows="3"
            @keydown.ctrl.enter="commitChanges"
            @keydown.meta.enter="commitChanges"
          />
          <div class="commit-actions">
            <div class="commit-info">
              <span>{{ stagedCount }} files staged</span>
            </div>
            <button
              class="btn btn-primary"
              @click="commitChanges"
              :disabled="!commitMessage.trim() || isLoading"
            >
              <i class="pi pi-bookmark" />
              Commit
            </button>
          </div>
        </div>
      </div>

      <!-- Auto-commit settings -->
      <div class="auto-commit-section">
        <div class="setting-header">
          <i class="pi pi-clock" />
          <span>Auto-commit Settings</span>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="autoCommitEnabled"
              @change="updateAutoCommitSetting"
            />
            <span class="checkmark"></span>
            Enable auto-commit on page changes
          </label>
        </div>
        <div v-if="autoCommitEnabled" class="setting-item">
          <label>
            Auto-commit frequency:
            <select v-model="autoCommitFrequency" @change="updateAutoCommitSetting">
              <option value="1">Every minute</option>
              <option value="5">Every 5 minutes</option>
              <option value="10">Every 10 minutes</option>
              <option value="30">Every 30 minutes</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGitStore } from '~/stores/git.js'

// Store
const gitStore = useGitStore()

// Local state
const commitMessage = ref('')

// Computed
const isGitRepo = computed(() => gitStore.isGitRepo)
const isLoading = computed(() => gitStore.isLoading)
const error = computed(() => gitStore.error)
const status = computed(() => gitStore.status)
const hasChanges = computed(() => gitStore.hasChanges)
const stagedCount = computed(() => gitStore.stagedCount)
const modifiedCount = computed(() => gitStore.modifiedCount)
const untrackedCount = computed(() => gitStore.untrackedCount)
const hasConflicts = computed(() => gitStore.hasConflicts)
const conflicts = computed(() => gitStore.conflicts)

const autoCommitEnabled = computed({
  get: () => gitStore.autoCommitEnabled,
  set: (value) => gitStore.setAutoCommit(value)
})

const autoCommitFrequency = computed({
  get: () => gitStore.autoCommitFrequency,
  set: (value) => gitStore.setAutoCommitFrequency(value)
})

const hasRemotes = computed(() => gitStore.remotes.length > 0)

// Emits
const emit = defineEmits(['showConflicts', 'showHistory', 'showBranches'])

// Methods
async function initializeRepository() {
  const result = await gitStore.initRepository()
  if (result.success) {
    commitMessage.value = ''
  }
}

async function refreshStatus() {
  await gitStore.refreshStatus()
}

async function stageAll() {
  await gitStore.stageAll()
}

async function stageFile(file) {
  await gitStore.stageFiles([file])
}

async function unstageAll() {
  const stagedFiles = status.value.staged
  if (stagedFiles.length > 0) {
    await gitStore.unstageFiles(stagedFiles)
  }
}

async function unstageFile(file) {
  await gitStore.unstageFiles([file])
}

async function commitChanges() {
  if (!commitMessage.value.trim()) return
  
  const result = await gitStore.commit(commitMessage.value.trim())
  if (result.success) {
    commitMessage.value = ''
  }
}

async function pullChanges() {
  await gitStore.pull()
}

async function pushChanges() {
  await gitStore.push()
}

function updateAutoCommitSetting() {
  gitStore.updateAutoCommit()
}

function clearError() {
  gitStore.clearError()
}

// Lifecycle
onMounted(() => {
  // Start auto-refresh
  gitStore.startAutoRefresh()
})

onUnmounted(() => {
  // Stop auto-refresh
  gitStore.stopAutoRefresh()
})
</script>

<style scoped>
.git-status {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.git-status-header {
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

.git-title {
  font-weight: 600;
  color: var(--text-color);
}

.not-initialized {
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

.git-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.branch-section,
.changes-section,
.commit-section,
.auto-commit-section {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--text-color);
}

.branch-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 0.375rem;
  border: 1px solid var(--surface-border);
}

.current-branch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.branch-name {
  font-family: monospace;
  font-weight: 600;
}

.ahead-count {
  background: var(--green-100);
  color: var(--green-700);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.behind-count {
  background: var(--orange-100);
  color: var(--orange-700);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.sync-status {
  display: flex;
  gap: 0.5rem;
}

.status-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 0.375rem;
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease;
}

.status-item.has-changes {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.status-item .count {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

.status-item .label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conflicts-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 0.375rem;
  color: var(--orange-700);
  margin-bottom: 1rem;
}

.file-group {
  margin-bottom: 1rem;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 0.5rem;
}

.group-header span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.staged-icon {
  color: var(--green-600);
}

.modified-icon {
  color: var(--orange-600);
}

.untracked-icon {
  color: var(--blue-600);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background: var(--surface-100);
}

.file-path {
  flex: 1;
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--text-color);
}

.file-action {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.file-action:hover {
  background: var(--surface-200);
  color: var(--text-color);
}

.clean-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--green-50);
  border: 1px solid var(--green-200);
  border-radius: 0.375rem;
  color: var(--green-700);
  text-align: center;
  justify-content: center;
}

.commit-section {
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  background: var(--surface-50);
}

.commit-form {
  padding: 1rem;
}

.commit-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.commit-message {
  width: 100%;
  min-height: 4rem;
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.commit-message:focus {
  outline: none;
  border-color: var(--primary-color);
}

.commit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.commit-info {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.setting-item {
  margin-bottom: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkmark {
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.25rem;
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

.btn-warning {
  background: var(--orange-500);
  color: white;
  border-color: var(--orange-500);
}

.btn-warning:hover:not(:disabled) {
  background: var(--orange-600);
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