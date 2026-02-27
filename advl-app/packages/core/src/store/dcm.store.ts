/**
 * store/dcm.store.ts — DCM Zustand store
 *
 * Holds the in-memory representation of the project's DCM.yaml.
 * Updated by the agent when use cases are created or modified.
 * TODO: Implement loadDCM() via dcm.service.ts
 * TODO: Implement saveDCM() via dcm.service.ts
 * TODO: Subscribe to agent DCM_UPDATE messages to keep store in sync
 */
import { create } from 'zustand'
import type { DCM, UseCase } from '@advl/shared'

interface DCMState {
  dcm: DCM | null
  isLoading: boolean
  error: string | null

  // Actions
  loadDCM: (projectRoot: string) => Promise<void>
  updateUseCase: (useCase: UseCase) => void
  setDCM: (dcm: DCM) => void
  setError: (error: string | null) => void
}

export const useDCMStore = create<DCMState>((set) => ({
  dcm: null,
  isLoading: false,
  error: null,

  loadDCM: async (_projectRoot: string) => {
    set({ isLoading: true, error: null })
    try {
      // TODO: Call dcm.service.readDCM(projectRoot) → parse YAML → set dcm
      set({ isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  updateUseCase: (useCase: UseCase) => {
    set((state) => {
      if (!state.dcm) return state
      const index = state.dcm.use_cases.findIndex((uc) => uc.id === useCase.id)
      const updated = [...state.dcm.use_cases]
      if (index >= 0) {
        updated[index] = useCase
      } else {
        updated.push(useCase)
      }
      return {
        dcm: {
          ...state.dcm,
          use_cases: updated,
          last_updated: new Date().toISOString().split('T')[0],
        },
      }
    })
  },

  setDCM: (dcm: DCM) => {
    set({ dcm })
  },

  setError: (error) => {
    set({ error })
  },
}))
