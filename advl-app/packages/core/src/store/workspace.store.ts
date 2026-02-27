/**
 * store/workspace.store.ts — Workspace Zustand store
 *
 * Manages the currently open project: its root path, name, and DCM status.
 * openProject() calls projectService which uses the platform adapter for
 * real filesystem checks. loadDCM is triggered after a successful open.
 */
import { create } from 'zustand'
import type { ProjectInfo } from '@advl/shared'
import { projectService } from '../services/project.service'
import { useDCMStore } from './dcm.store'

interface WorkspaceState {
  project: ProjectInfo | null
  isLoading: boolean
  error: string | null

  openProjectDialog: () => Promise<void>
  openProject: (rootPath: string) => Promise<void>
  closeProject: () => void
  setError: (error: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  project: null,
  isLoading: false,
  error: null,

  openProjectDialog: async () => {
    set({ isLoading: true, error: null })
    try {
      const projectInfo = await projectService.openProjectDialog()
      if (!projectInfo) {
        set({ isLoading: false })
        return
      }
      set({ project: projectInfo, isLoading: false })
      if (projectInfo.hasExistingDCM) {
        await useDCMStore.getState().loadDCM(projectInfo.root)
      }
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  openProject: async (rootPath: string) => {
    set({ isLoading: true, error: null })
    try {
      const projectInfo = await projectService.loadProject(rootPath)
      set({ project: projectInfo, isLoading: false })
      if (projectInfo.hasExistingDCM) {
        await useDCMStore.getState().loadDCM(rootPath)
      }
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  closeProject: () => {
    useDCMStore.setState({ dcm: null, error: null })
    set({ project: null, error: null })
  },

  setError: (error) => {
    set({ error })
  },
}))
