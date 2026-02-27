/**
 * store/workspace.store.ts — Workspace Zustand store
 *
 * Manages the currently open project: its root path, name, and load state.
 * Uses the platform adapter for all filesystem operations.
 * TODO: Implement openProject() using platform.openFolderDialog()
 * TODO: Implement closeProject()
 * TODO: Persist last opened project path via platform localStorage / file
 */
import { create } from 'zustand'
import type { ProjectInfo } from '@advl/shared'

interface WorkspaceState {
  project: ProjectInfo | null
  isLoading: boolean
  error: string | null

  // Actions
  openProject: (rootPath: string) => Promise<void>
  closeProject: () => void
  setError: (error: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  project: null,
  isLoading: false,
  error: null,

  openProject: async (rootPath: string) => {
    set({ isLoading: true, error: null })
    try {
      // TODO: Read project name from package.json or directory name
      // TODO: Verify DCM.yaml exists at rootPath/schema/DCM.yaml
      // TODO: Load DCM into dcm.store
      const projectInfo: ProjectInfo = {
        name: rootPath.split('/').pop() ?? rootPath,
        root: rootPath,
        dcmPath: `${rootPath}/schema/DCM.yaml`,
        rulesPath: `${rootPath}/rules`,
        hasExistingDCM: false, // TODO: check via platform.exists()
      }
      set({ project: projectInfo, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  closeProject: () => {
    set({ project: null, error: null })
  },

  setError: (error) => {
    set({ error })
  },
}))
