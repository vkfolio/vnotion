/**
 * Git operations wrapper using simple-git
 * Provides version control functionality for VNotions workspace
 */

import simpleGit from 'simple-git'
import { promises as fs } from 'fs'
import path from 'path'

class GitManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath
    this.git = simpleGit(workspacePath)
    this.gitDir = path.join(workspacePath, '.git')
  }

  /**
   * Check if Git repository is initialized
   */
  async isGitRepo() {
    try {
      await fs.access(this.gitDir)
      return await this.git.checkIsRepo()
    } catch (error) {
      return false
    }
  }

  /**
   * Initialize Git repository
   */
  async initRepository() {
    try {
      await this.git.init()
      
      // Create .gitignore for VNotions
      const gitignore = `# VNotions specific
.vnotions/cache/
.vnotions/temp/
*.tmp
*.log

# System files
.DS_Store
Thumbs.db
desktop.ini

# Node modules (if any)
node_modules/
`
      await fs.writeFile(path.join(this.workspacePath, '.gitignore'), gitignore)
      
      // Initial commit
      await this.git.add('.')
      await this.git.commit('Initial VNotions workspace commit', undefined, {
        '--author': 'VNotions <vnotions@local>'
      })

      return { success: true, message: 'Git repository initialized' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current Git status
   */
  async getStatus() {
    try {
      const status = await this.git.status()
      return {
        success: true,
        data: {
          branch: status.current,
          ahead: status.ahead,
          behind: status.behind,
          staged: status.staged,
          modified: status.modified,
          deleted: status.deleted,
          untracked: status.not_added,
          clean: status.isClean()
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Stage all changes
   */
  async stageAll() {
    try {
      await this.git.add('.')
      return { success: true, message: 'All changes staged' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Stage specific files
   */
  async stageFiles(files) {
    try {
      await this.git.add(files)
      return { success: true, message: `Staged ${files.length} files` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Unstage files
   */
  async unstageFiles(files) {
    try {
      await this.git.reset(['HEAD', ...files])
      return { success: true, message: `Unstaged ${files.length} files` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Create commit
   */
  async commit(message, author = 'VNotions <vnotions@local>') {
    try {
      const result = await this.git.commit(message, undefined, {
        '--author': author
      })
      return {
        success: true,
        data: {
          commit: result.commit,
          summary: result.summary
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Auto-commit changes with generated message
   */
  async autoCommit(pageId, pageTitle, action = 'update') {
    try {
      await this.git.add('.')
      const timestamp = new Date().toISOString()
      const message = `Auto-${action}: ${pageTitle} (${pageId}) - ${timestamp}`
      
      const result = await this.git.commit(message, undefined, {
        '--author': 'VNotions Auto <auto@vnotions.local>'
      })
      
      return {
        success: true,
        data: {
          commit: result.commit,
          message
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get commit history
   */
  async getHistory(limit = 50) {
    try {
      const log = await this.git.log({ maxCount: limit })
      return {
        success: true,
        data: log.all.map(commit => ({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          email: commit.author_email,
          date: commit.date,
          refs: commit.refs
        }))
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get commit details
   */
  async getCommitDetails(hash) {
    try {
      const show = await this.git.show([hash])
      const diff = await this.git.diff([`${hash}^`, hash])
      
      return {
        success: true,
        data: {
          content: show,
          diff: diff
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Reset to specific commit
   */
  async resetToCommit(hash, mode = 'hard') {
    try {
      await this.git.reset([`--${mode}`, hash])
      return { success: true, message: `Reset to commit ${hash}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get file changes for a commit
   */
  async getFileChanges(hash) {
    try {
      const diff = await this.git.diff([`${hash}^`, hash, '--name-status'])
      const lines = diff.split('\n').filter(line => line.trim())
      
      const changes = lines.map(line => {
        const [status, ...pathParts] = line.split('\t')
        return {
          status: status.charAt(0),
          path: pathParts.join('\t'),
          statusText: this.getStatusText(status.charAt(0))
        }
      })
      
      return { success: true, data: changes }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Create and switch to new branch
   */
  async createBranch(branchName) {
    try {
      await this.git.checkoutLocalBranch(branchName)
      return { success: true, message: `Created and switched to branch ${branchName}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Switch to existing branch
   */
  async switchBranch(branchName) {
    try {
      await this.git.checkout(branchName)
      return { success: true, message: `Switched to branch ${branchName}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all branches
   */
  async getBranches() {
    try {
      const branches = await this.git.branch()
      return {
        success: true,
        data: {
          current: branches.current,
          all: branches.all,
          local: branches.all.filter(b => !b.startsWith('remotes/'))
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Add remote repository
   */
  async addRemote(name, url) {
    try {
      await this.git.addRemote(name, url)
      return { success: true, message: `Added remote ${name}: ${url}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Push to remote
   */
  async push(remote = 'origin', branch = null) {
    try {
      const currentBranch = branch || (await this.git.branch()).current
      await this.git.push(remote, currentBranch)
      return { success: true, message: `Pushed to ${remote}/${currentBranch}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Pull from remote
   */
  async pull(remote = 'origin', branch = null) {
    try {
      const currentBranch = branch || (await this.git.branch()).current
      await this.git.pull(remote, currentBranch)
      return { success: true, message: `Pulled from ${remote}/${currentBranch}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get remote repositories
   */
  async getRemotes() {
    try {
      const remotes = await this.git.getRemotes(true)
      return {
        success: true,
        data: remotes.map(remote => ({
          name: remote.name,
          fetchUrl: remote.refs.fetch,
          pushUrl: remote.refs.push
        }))
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Create backup of current state
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupBranch = `backup-${timestamp}`
      
      await this.git.checkoutLocalBranch(backupBranch)
      await this.git.checkout('main')
      
      return { success: true, message: `Backup created: ${backupBranch}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupBranch) {
    try {
      await this.git.checkout(backupBranch)
      await this.git.checkoutLocalBranch('main-temp')
      await this.git.checkout('main')
      await this.git.merge(['main-temp'])
      await this.git.branch(['-D', 'main-temp'])
      
      return { success: true, message: `Restored from backup: ${backupBranch}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get status text for file change status
   */
  getStatusText(status) {
    const statusMap = {
      'A': 'Added',
      'M': 'Modified',
      'D': 'Deleted',
      'R': 'Renamed',
      'C': 'Copied',
      'U': 'Unmerged'
    }
    return statusMap[status] || 'Unknown'
  }

  /**
   * Check for conflicts
   */
  async hasConflicts() {
    try {
      const status = await this.git.status()
      return {
        success: true,
        data: {
          hasConflicts: status.conflicted.length > 0,
          conflicts: status.conflicted
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Resolve conflicts by accepting current version
   */
  async resolveConflicts(files, strategy = 'ours') {
    try {
      for (const file of files) {
        await this.git.checkout([`--${strategy}`, file])
        await this.git.add(file)
      }
      return { success: true, message: `Resolved ${files.length} conflicts` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default GitManager