<template>
  <div class="git-page">
    <!-- Header -->
    <div class="git-header">
      <div class="header-content">
        <div class="header-left">
          <h1>
            <i class="pi pi-code-branch" />
            Version Control
          </h1>
          <p>Manage Git version control for your VNotions workspace</p>
        </div>
        <div class="header-right">
          <button
            v-if="!isGitRepo"
            @click="initializeGit"
            :disabled="isLoading"
            class="btn btn-primary"
          >
            <i class="pi pi-plus" />
            Initialize Git
          </button>
          <div v-else class="header-actions">
            <button
              @click="refreshAll"
              :disabled="isLoading"
              class="btn btn-secondary"
            >
              <i class="pi pi-refresh" :class="{ 'rotate': isLoading }" />
              Refresh
            </button>
            <button
              @click="showImportExport = true"
              class="btn btn-secondary"
            >
              <i class="pi pi-upload" />
              Import/Export
            </button>
            <button
              @click="openSettings"
              class="btn btn-secondary"
            >
              <i class="pi pi-cog" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="git-content">
      <!-- Not initialized state -->
      <div v-if="!isGitRepo && !isLoading" class="not-initialized">
        <div class="init-content">
          <i class="pi pi-code-branch init-icon" />
          <h2>Git Not Initialized</h2>
          <p>
            Version control helps you track changes, collaborate with others, and maintain a history of your workspace.
          </p>
          
          <div class="benefits">
            <h3>Benefits of Git Integration:</h3>
            <div class="benefits-grid">
              <div class="benefit-item">
                <i class="pi pi-history" />
                <div class="benefit-content">
                  <h4>Change History</h4>
                  <p>Track every change to your pages and databases</p>
                </div>
              </div>
              <div class="benefit-item">
                <i class="pi pi-shield" />
                <div class="benefit-content">
                  <h4>Backup & Recovery</h4>
                  <p>Never lose your work with automatic backups</p>
                </div>
              </div>
              <div class="benefit-item">
                <i class="pi pi-users" />
                <div class="benefit-content">
                  <h4>Collaboration</h4>
                  <p>Work with others using remote repositories</p>
                </div>
              </div>
              <div class="benefit-item">
                <i class="pi pi-code-branch" />
                <div class="benefit-content">
                  <h4>Branching</h4>
                  <p>Create branches for experiments and features</p>
                </div>
              </div>
            </div>
          </div>

          <button
            @click="initializeGit"
            :disabled="isLoading"
            class="btn btn-primary btn-large"
          >
            <i class="pi pi-plus" />
            Initialize Git Repository
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading && !isGitRepo" class="loading-state">
        <i class="pi pi-spin pi-spinner" />
        <span>Initializing Git repository...</span>
      </div>

      <!-- Git interface -->
      <div v-if="isGitRepo" class="git-interface">
        <div class="git-layout">
          <!-- Left sidebar: Navigation -->
          <div class="git-sidebar">
            <nav class="git-nav">
              <button
                v-for="tab in gitTabs"
                :key="tab.id"
                class="nav-item"
                :class="{ 'active': activeTab === tab.id }"
                @click="activeTab = tab.id"
              >
                <i :class="tab.icon" />
                <span>{{ tab.label }}</span>
                <span v-if="tab.count" class="nav-count">{{ tab.count }}</span>
              </button>
            </nav>

            <!-- Quick actions -->
            <div class="quick-actions">
              <h4>Quick Actions</h4>
              <button
                @click="createBackup"
                :disabled="isLoading"
                class="action-btn"
              >
                <i class="pi pi-save" />
                Create Backup
              </button>
              <button
                @click="showBranchManager = true"
                class="action-btn"
              >
                <i class="pi pi-code-branch" />
                Manage Branches
              </button>
              <button
                @click="showRemoteManager = true"
                class="action-btn"
              >
                <i class="pi pi-cloud" />
                Remote Repositories
              </button>
            </div>
          </div>

          <!-- Main content area -->
          <div class="git-main">
            <!-- Status tab -->
            <div v-if="activeTab === 'status'" class="tab-content">
              <GitStatus
                @showConflicts="showConflictsDialog = true"
                @showHistory="activeTab = 'history'"
                @showBranches="showBranchManager = true"
              />
            </div>

            <!-- History tab -->
            <div v-if="activeTab === 'history'" class="tab-content">
              <GitHistory
                @createBackup="createBackup"
                @showBranches="showBranchManager = true"
              />
            </div>

            <!-- Branches tab -->
            <div v-if="activeTab === 'branches'" class="tab-content">
              <BranchManager
                v-if="showBranchContent"
                @close="showBranchContent = false"
              />
              <div v-else class="placeholder-content">
                <i class="pi pi-code-branch placeholder-icon" />
                <h3>Branch Management</h3>
                <p>Create and manage Git branches for your workspace.</p>
                <button
                  @click="showBranchContent = true"
                  class="btn btn-primary"
                >
                  <i class="pi pi-plus" />
                  Manage Branches
                </button>
              </div>
            </div>

            <!-- Settings tab -->
            <div v-if="activeTab === 'settings'" class="tab-content">
              <GitSettings />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals and Dialogs -->
    
    <!-- Branch Manager Modal -->
    <div v-if="showBranchManager" class="modal-overlay" @click="showBranchManager = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <h3>Branch Manager</h3>
          <button @click="showBranchManager = false" class="close-btn">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-content">
          <div class="branch-list">
            <div class="branch-header">
              <h4>Branches</h4>
              <button @click="showCreateBranch = true" class="btn btn-primary btn-small">
                <i class="pi pi-plus" />
                New Branch
              </button>
            </div>
            <div
              v-for="branch in branches"
              :key="branch"
              class="branch-item"
              :class="{ 'current': branch === currentBranch }"
            >
              <div class="branch-info">
                <i class="pi pi-code-branch" />
                <span class="branch-name">{{ branch }}</span>
                <span v-if="branch === currentBranch" class="current-indicator">current</span>
              </div>
              <div class="branch-actions">
                <button
                  v-if="branch !== currentBranch"
                  @click="switchToBranch(branch)"
                  class="action-btn-small"
                >
                  Switch
                </button>
                <button
                  v-if="branch !== 'main' && branch !== currentBranch"
                  @click="deleteBranch(branch)"
                  class="action-btn-small danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- Create branch form -->
          <div v-if="showCreateBranch" class="create-branch-form">
            <h4>Create New Branch</h4>
            <div class="form-group">
              <label>Branch name:</label>
              <input
                v-model="newBranchName"
                type="text"
                placeholder="feature/new-feature"
                class="text-input"
                @keydown.enter="createNewBranch"
              />
            </div>
            <div class="form-actions">
              <button @click="showCreateBranch = false" class="btn btn-secondary">
                Cancel
              </button>
              <button
                @click="createNewBranch"
                :disabled="!newBranchName.trim()"
                class="btn btn-primary"
              >
                Create Branch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Remote Manager Modal -->
    <div v-if="showRemoteManager" class="modal-overlay" @click="showRemoteManager = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <h3>Remote Repositories</h3>
          <button @click="showRemoteManager = false" class="close-btn">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-content">
          <div class="remote-list">
            <div class="remote-header">
              <h4>Configured Remotes</h4>
              <button @click="showAddRemote = true" class="btn btn-primary btn-small">
                <i class="pi pi-plus" />
                Add Remote
              </button>
            </div>
            
            <div v-if="remotes.length === 0" class="empty-remotes">
              <i class="pi pi-cloud" />
              <p>No remote repositories configured</p>
            </div>
            
            <div
              v-for="remote in remotes"
              :key="remote.name"
              class="remote-item"
            >
              <div class="remote-info">
                <h5>{{ remote.name }}</h5>
                <p class="remote-url">{{ remote.fetchUrl }}</p>
              </div>
              <div class="remote-actions">
                <button @click="pullFromRemote(remote.name)" class="action-btn-small">
                  <i class="pi pi-download" />
                  Pull
                </button>
                <button @click="pushToRemote(remote.name)" class="action-btn-small">
                  <i class="pi pi-upload" />
                  Push
                </button>
              </div>
            </div>
          </div>

          <!-- Add remote form -->
          <div v-if="showAddRemote" class="add-remote-form">
            <h4>Add Remote Repository</h4>
            <div class="form-group">
              <label>Remote name:</label>
              <input
                v-model="newRemoteName"
                type="text"
                placeholder="origin"
                class="text-input"
              />
            </div>
            <div class="form-group">
              <label>Repository URL:</label>
              <input
                v-model="newRemoteUrl"
                type="text"
                placeholder="https://github.com/user/repo.git"
                class="text-input"
              />
            </div>
            <div class="form-actions">
              <button @click="showAddRemote = false" class="btn btn-secondary">
                Cancel
              </button>
              <button
                @click="addNewRemote"
                :disabled="!newRemoteName.trim() || !newRemoteUrl.trim()"
                class="btn btn-primary"
              >
                Add Remote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import/Export Modal -->
    <div v-if="showImportExport" class="modal-overlay" @click="showImportExport = false">
      <div class="modal-dialog large" @click.stop>
        <div class="modal-header">
          <h3>Import/Export</h3>
          <button @click="showImportExport = false" class="close-btn">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-content">
          <div class="import-export-options">
            <div class="option-card" @click="showImportDialog = true">
              <i class="pi pi-download" />
              <h4>Import Data</h4>
              <p>Import pages and databases from external sources</p>
            </div>
            <div class="option-card" @click="showExportDialog = true">
              <i class="pi pi-upload" />
              <h4>Export Data</h4>
              <p>Export your workspace to various formats</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Conflicts Dialog -->
    <div v-if="showConflictsDialog" class="modal-overlay" @click="showConflictsDialog = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <h3>Merge Conflicts</h3>
          <button @click="showConflictsDialog = false" class="close-btn">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-content">
          <div class="conflicts-content">
            <p>Resolve merge conflicts before continuing:</p>
            <div class="conflict-files">
              <div
                v-for="file in conflictFiles"
                :key="file"
                class="conflict-file"
              >
                <i class="pi pi-exclamation-triangle" />
                <span>{{ file }}</span>
                <div class="conflict-actions">
                  <button class="action-btn-small">Accept Ours</button>
                  <button class="action-btn-small">Accept Theirs</button>
                  <button class="action-btn-small">Edit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import/Export Dialogs -->
    <ImportDialog
      v-if="showImportDialog"
      :visible="showImportDialog"
      :workspace-path="workspacePath"
      @close="showImportDialog = false"
      @imported="handleImported"
    />

    <ExportDialog
      v-if="showExportDialog"
      :visible="showExportDialog"
      :workspace-path="workspacePath"
      @close="showExportDialog = false"
      @exported="handleExported"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useGitStore } from '~/stores/git.js'
import GitStatus from '~/components/git/GitStatus.vue'
import GitHistory from '~/components/git/GitHistory.vue'
import ImportDialog from '~/components/import-export/ImportDialog.vue'
import ExportDialog from '~/components/import-export/ExportDialog.vue'

// Meta
definePageMeta({
  title: 'Git - Version Control',
  layout: 'default'
})

// Store
const gitStore = useGitStore()

// Local state
const activeTab = ref('status')
const showBranchManager = ref(false)
const showRemoteManager = ref(false)
const showImportExport = ref(false)
const showConflictsDialog = ref(false)
const showImportDialog = ref(false)
const showExportDialog = ref(false)
const showBranchContent = ref(false)
const showCreateBranch = ref(false)
const showAddRemote = ref(false)

// Branch management
const newBranchName = ref('')
const branches = ref(['main', 'develop', 'feature/new-ui'])
const currentBranch = ref('main')

// Remote management
const newRemoteName = ref('')
const newRemoteUrl = ref('')
const remotes = ref([
  {
    name: 'origin',
    fetchUrl: 'https://github.com/user/vnotions-workspace.git',
    pushUrl: 'https://github.com/user/vnotions-workspace.git'
  }
])

// Mock conflict files
const conflictFiles = ref(['pages/project-notes.json', 'databases/tasks.json'])

// Mock workspace path
const workspacePath = ref('/Users/username/VNotions Workspace')

// Computed
const isGitRepo = computed(() => gitStore.isGitRepo)
const isLoading = computed(() => gitStore.isLoading)
const hasChanges = computed(() => gitStore.hasChanges)
const stagedCount = computed(() => gitStore.stagedCount)
const modifiedCount = computed(() => gitStore.modifiedCount)
const untrackedCount = computed(() => gitStore.untrackedCount)

const gitTabs = computed(() => [
  {
    id: 'status',
    label: 'Status',
    icon: 'pi pi-info-circle',
    count: hasChanges.value ? stagedCount.value + modifiedCount.value + untrackedCount.value : null
  },
  {
    id: 'history',
    label: 'History',
    icon: 'pi pi-history',
    count: null
  },
  {
    id: 'branches',
    label: 'Branches',
    icon: 'pi pi-code-branch',
    count: branches.value.length
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'pi pi-cog',
    count: null
  }
])

// Methods
async function initializeGit() {
  await gitStore.initializeGit(workspacePath.value)
  if (isGitRepo.value) {
    await refreshAll()
  }
}

async function refreshAll() {
  await Promise.all([
    gitStore.refreshStatus(),
    gitStore.loadCommitHistory(),
    gitStore.loadBranches(),
    gitStore.loadRemotes()
  ])
}

async function createBackup() {
  await gitStore.createBackup()
}

async function createNewBranch() {
  if (!newBranchName.value.trim()) return
  
  await gitStore.createBranch(newBranchName.value.trim())
  branches.value.push(newBranchName.value.trim())
  newBranchName.value = ''
  showCreateBranch.value = false
}

async function switchToBranch(branchName) {
  await gitStore.switchBranch(branchName)
  currentBranch.value = branchName
}

async function deleteBranch(branchName) {
  if (confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
    // In real implementation, would call gitStore.deleteBranch(branchName)
    const index = branches.value.indexOf(branchName)
    if (index > -1) {
      branches.value.splice(index, 1)
    }
  }
}

async function addNewRemote() {
  if (!newRemoteName.value.trim() || !newRemoteUrl.value.trim()) return
  
  await gitStore.addRemote(newRemoteName.value.trim(), newRemoteUrl.value.trim())
  
  remotes.value.push({
    name: newRemoteName.value.trim(),
    fetchUrl: newRemoteUrl.value.trim(),
    pushUrl: newRemoteUrl.value.trim()
  })
  
  newRemoteName.value = ''
  newRemoteUrl.value = ''
  showAddRemote.value = false
}

async function pullFromRemote(remoteName) {
  await gitStore.pull(remoteName)
}

async function pushToRemote(remoteName) {
  await gitStore.push(remoteName)
}

function openSettings() {
  activeTab.value = 'settings'
}

function handleImported(results) {
  console.log('Import completed:', results)
  showImportDialog.value = false
  showImportExport.value = false
}

function handleExported(results) {
  console.log('Export completed:', results)
  showExportDialog.value = false
  showImportExport.value = false
}

// Lifecycle
onMounted(async () => {
  await gitStore.initializeGit(workspacePath.value)
  
  if (isGitRepo.value) {
    await refreshAll()
  }
})
</script>

<style scoped>
.git-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.git-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-50);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
}

.header-left h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-left p {
  margin: 0;
  color: var(--text-color-secondary);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.git-content {
  flex: 1;
  overflow: hidden;
}

.not-initialized {
  padding: 3rem 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.init-content {
  text-align: center;
}

.init-icon {
  font-size: 4rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.init-content h2 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 2rem;
}

.init-content > p {
  margin: 0 0 3rem 0;
  color: var(--text-color-secondary);
  font-size: 1.125rem;
  line-height: 1.6;
}

.benefits {
  margin-bottom: 3rem;
  text-align: left;
}

.benefits h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-color);
  text-align: center;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.benefit-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
}

.benefit-item i {
  font-size: 1.5rem;
  color: var(--primary-color);
  margin-top: 0.25rem;
}

.benefit-content h4 {
  margin: 0 0 0.25rem 0;
  color: var(--text-color);
}

.benefit-content p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-color-secondary);
}

.git-interface {
  height: 100%;
  overflow: hidden;
}

.git-layout {
  height: 100%;
  display: flex;
}

.git-sidebar {
  width: 250px;
  background: var(--surface-50);
  border-right: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
}

.git-nav {
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.nav-item:hover {
  background: var(--surface-100);
  color: var(--text-color);
}

.nav-item.active {
  background: var(--primary-color);
  color: white;
}

.nav-item i {
  width: 1rem;
}

.nav-item span {
  flex: 1;
  text-align: left;
}

.nav-count {
  background: var(--surface-200);
  color: var(--text-color);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.nav-item.active .nav-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.quick-actions {
  padding: 1rem;
  flex: 1;
}

.quick-actions h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  color: var(--text-color);
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
}

.action-btn:hover:not(:disabled) {
  background: var(--surface-100);
  border-color: var(--primary-color);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.git-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.placeholder-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.placeholder-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.placeholder-content p {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
}

/* Modal styles */
.modal-overlay {
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

.modal-dialog {
  background: var(--surface-ground);
  border-radius: 0.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-dialog.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.modal-header h3 {
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

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.branch-list,
.remote-list {
  margin-bottom: 1.5rem;
}

.branch-header,
.remote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.branch-header h4,
.remote-header h4 {
  margin: 0;
  color: var(--text-color);
}

.branch-item,
.remote-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
}

.branch-item.current {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.branch-info,
.remote-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.branch-name {
  font-family: monospace;
  font-weight: 500;
}

.current-indicator {
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.remote-info h5 {
  margin: 0 0 0.25rem 0;
  color: var(--text-color);
}

.remote-url {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  font-family: monospace;
}

.branch-actions,
.remote-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn-small {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  color: var(--text-color);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.action-btn-small:hover {
  background: var(--surface-100);
}

.action-btn-small.danger {
  color: var(--red-600);
  border-color: var(--red-300);
}

.action-btn-small.danger:hover {
  background: var(--red-50);
}

.empty-remotes {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty-remotes i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.create-branch-form,
.add-remote-form {
  border-top: 1px solid var(--surface-border);
  padding-top: 1.5rem;
}

.create-branch-form h4,
.add-remote-form h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--text-color);
  font-weight: 500;
}

.text-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.375rem;
  background: var(--surface-ground);
  color: var(--text-color);
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.import-export-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.option-card {
  padding: 2rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.option-card i {
  font-size: 2rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.option-card h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.option-card p {
  margin: 0;
  color: var(--text-color-secondary);
}

.conflicts-content {
  margin-bottom: 1rem;
}

.conflict-files {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.conflict-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 0.375rem;
  color: var(--orange-700);
}

.conflict-file i {
  color: var(--orange-600);
}

.conflict-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
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
  background: var(--surface-ground);
  color: var(--text-color);
  border-color: var(--surface-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-100);
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.rotate {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>