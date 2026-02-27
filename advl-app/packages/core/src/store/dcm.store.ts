/**
 * store/dcm.store.ts — DCM Zustand store
 *
 * Holds the in-memory representation of the project's DCM.yaml.
 * loadDCM() reads and parses DCM.yaml via dcmService.
 * saveDCM() serializes and writes back via dcmService.
 * Agent DCM_UPDATE messages call updateUseCase() to keep the store in sync.
 */
import { create } from 'zustand'
import type { DCM, UseCase } from '@advl/shared'
import { dcmService } from '../services/dcm.service'

interface DCMState {
  dcm: DCM | null
  isLoading: boolean
  error: string | null

  // Actions
  loadDCM: (projectRoot: string) => Promise<void>
  saveDCM: (projectRoot: string) => Promise<void>
  updateUseCase: (useCase: UseCase) => void
  setDCM: (dcm: DCM) => void
  setError: (error: string | null) => void
}

export const useDCMStore = create<DCMState>((set, get) => ({
  dcm: null,
  isLoading: false,
  error: null,

  loadDCM: async (projectRoot: string) => {
    set({ isLoading: true, error: null })
    try {
      const dcm = await dcmService.readDCM(projectRoot)
      set({ dcm, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  saveDCM: async (projectRoot: string) => {
    const { dcm } = get()
    if (!dcm) return
    try {
      await dcmService.writeDCM(projectRoot, dcm)
    } catch (err) {
      set({ error: String(err) })
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
