/**
 * Pinia store for Git state management
 * Handles Git operations and state for VNotions workspace
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import GitManager from '~/utils/git.js'

export const useGitStore = defineStore('git', () => {
  // State
  const gitManager = ref(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  
  // Git status
  const status = ref({
    branch: null,
    ahead: 0,
    behind: 0,
    staged: [],
    modified: [],
    deleted: [],
    untracked: [],
    clean: true
  })
  
  // Commit history
  const commitHistory = ref([])
  const selectedCommit = ref(null)
  const commitDetails = ref(null)
  
  // Branches
  const branches = ref({
    current: null,
    all: [],
    local: []
  })
  
  // Remotes
  const remotes = ref([])
  
  // Auto-commit settings
  const autoCommitEnabled = ref(true)
  const autoCommitFrequency = ref(5) // minutes
  
  // Conflicts
  const conflicts = ref([])
  const hasConflicts = ref(false)

  // Computed
  const isGitRepo = computed(() => isInitialized.value)
  const hasChanges = computed(() => !status.value.clean)
  const stagedCount = computed(() => status.value.staged.length)
  const modifiedCount = computed(() => status.value.modified.length)
  const untrackedCount = computed(() => status.value.untracked.length)
  const totalChanges = computed(() => 
    stagedCount.value + modifiedCount.value + untrackedCount.value
  )

  // Actions
  async function initializeGit(workspacePath) {
    try {
      isLoading.value = true
      error.value = null
      
      gitManager.value = new GitManager(workspacePath)
      
      // Check if already a Git repo
      const isRepo = await gitManager.value.isGitRepo()
      isInitialized.value = isRepo
      
      if (isRepo) {
        await refreshStatus()
        await loadBranches()
        await loadRemotes()
      }
      
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function initRepository() {
    try {
      isLoading.value = true
      error.value = null
      
      if (!gitManager.value) {
        throw new Error('Git manager not initialized')
      }
      
      const result = await gitManager.value.initRepository()
      
      if (result.success) {
        isInitialized.value = true
        await refreshStatus()
        await loadBranches()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function refreshStatus() {
    try {
      if (!gitManager.value || !isInitialized.value) return
      
      const result = await gitManager.value.getStatus()
      
      if (result.success) {
        status.value = result.data
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function stageAll() {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.stageAll()
      
      if (result.success) {
        await refreshStatus()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function stageFiles(files) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.stageFiles(files)
      
      if (result.success) {
        await refreshStatus()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function unstageFiles(files) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.unstageFiles(files)
      
      if (result.success) {
        await refreshStatus()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function commit(message, author) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.commit(message, author)
      
      if (result.success) {
        await refreshStatus()
        await loadCommitHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function autoCommit(pageId, pageTitle, action = 'update') {
    try {
      if (!autoCommitEnabled.value) return { success: false, message: 'Auto-commit disabled' }
      
      const result = await gitManager.value.autoCommit(pageId, pageTitle, action)
      
      if (result.success) {
        await refreshStatus()
        await loadCommitHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function loadCommitHistory(limit = 50) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.getHistory(limit)
      
      if (result.success) {
        commitHistory.value = result.data
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadCommitDetails(hash) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.getCommitDetails(hash)
      
      if (result.success) {
        commitDetails.value = result.data
        selectedCommit.value = hash
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function resetToCommit(hash, mode = 'hard') {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.resetToCommit(hash, mode)
      
      if (result.success) {
        await refreshStatus()
        await loadCommitHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadBranches() {
    try {
      const result = await gitManager.value.getBranches()
      
      if (result.success) {
        branches.value = result.data
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function createBranch(branchName) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.createBranch(branchName)
      
      if (result.success) {
        await loadBranches()
        await refreshStatus()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function switchBranch(branchName) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.switchBranch(branchName)
      
      if (result.success) {
        await loadBranches()
        await refreshStatus()
        await loadCommitHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadRemotes() {
    try {
      const result = await gitManager.value.getRemotes()
      
      if (result.success) {
        remotes.value = result.data
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function addRemote(name, url) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.addRemote(name, url)
      
      if (result.success) {
        await loadRemotes()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function push(remote = 'origin', branch = null) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.push(remote, branch)
      
      if (result.success) {
        await refreshStatus()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function pull(remote = 'origin', branch = null) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.pull(remote, branch)
      
      if (result.success) {
        await refreshStatus()
        await loadCommitHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function createBackup() {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.createBackup()
      
      if (result.success) {
        await loadBranches()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function restoreFromBackup(backupBranch) {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.restoreFromBackup(backupBranch)
      
      if (result.success) {
        await refreshStatus()
        await loadBranches()
        await loadCommitHistory()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function checkForConflicts() {
    try {
      const result = await gitManager.value.hasConflicts()
      
      if (result.success) {
        hasConflicts.value = result.data.hasConflicts
        conflicts.value = result.data.conflicts
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  async function resolveConflicts(files, strategy = 'ours') {
    try {
      isLoading.value = true
      error.value = null
      
      const result = await gitManager.value.resolveConflicts(files, strategy)
      
      if (result.success) {
        await checkForConflicts()
        await refreshStatus()
      }
      
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  function setAutoCommit(enabled) {
    autoCommitEnabled.value = enabled
  }

  function setAutoCommitFrequency(frequency) {
    autoCommitFrequency.value = frequency
  }

  function clearError() {
    error.value = null
  }

  function clearSelection() {
    selectedCommit.value = null
    commitDetails.value = null
  }

  // Auto-refresh status periodically
  let statusInterval = null

  function startAutoRefresh(intervalMs = 30000) { // 30 seconds
    if (statusInterval) clearInterval(statusInterval)
    
    statusInterval = setInterval(async () => {
      if (isInitialized.value && !isLoading.value) {
        await refreshStatus()
        await checkForConflicts()
      }
    }, intervalMs)
  }

  function stopAutoRefresh() {
    if (statusInterval) {
      clearInterval(statusInterval)
      statusInterval = null
    }
  }

  // Auto-commit functionality
  let autoCommitInterval = null

  function startAutoCommit() {
    if (!autoCommitEnabled.value) return
    
    if (autoCommitInterval) clearInterval(autoCommitInterval)
    
    const intervalMs = autoCommitFrequency.value * 60 * 1000 // Convert minutes to milliseconds
    
    autoCommitInterval = setInterval(async () => {
      if (isInitialized.value && hasChanges.value && !isLoading.value) {
        await autoCommit('auto', 'Auto-commit', 'auto-save')
      }
    }, intervalMs)
  }

  function stopAutoCommit() {
    if (autoCommitInterval) {
      clearInterval(autoCommitInterval)
      autoCommitInterval = null
    }
  }

  // Watch for auto-commit setting changes
  function updateAutoCommit() {
    if (autoCommitEnabled.value) {
      startAutoCommit()
    } else {
      stopAutoCommit()
    }
  }

  return {
    // State
    gitManager,
    isInitialized,
    isLoading,
    error,
    status,
    commitHistory,
    selectedCommit,
    commitDetails,
    branches,
    remotes,
    autoCommitEnabled,
    autoCommitFrequency,
    conflicts,
    hasConflicts,
    
    // Computed
    isGitRepo,
    hasChanges,
    stagedCount,
    modifiedCount,
    untrackedCount,
    totalChanges,
    
    // Actions
    initializeGit,
    initRepository,
    refreshStatus,
    stageAll,
    stageFiles,
    unstageFiles,
    commit,
    autoCommit,
    loadCommitHistory,
    loadCommitDetails,
    resetToCommit,
    loadBranches,
    createBranch,
    switchBranch,
    loadRemotes,
    addRemote,
    push,
    pull,
    createBackup,
    restoreFromBackup,
    checkForConflicts,
    resolveConflicts,
    setAutoCommit,
    setAutoCommitFrequency,
    clearError,
    clearSelection,
    startAutoRefresh,
    stopAutoRefresh,
    startAutoCommit,
    stopAutoCommit,
    updateAutoCommit
  }
})