/**
 * store/dcm.store.ts — DCM Zustand store
 *
 * Holds the in-memory representation of the project's DCM.yaml.
 * loadDCM()    — reads DCM.yaml from disk via dcmService (file-based projects).
 * loadDocument() — loads a pre-parsed DCMDocument (dev seed, agent message).
 * saveDCM()    — writes back to disk via dcmService.
 * updateUseCase() — in-place update when agent modifies a use case.
 *
 * Canvas selectors:
 *   getScreens()            — ScreenElement[] of type 'screen'
 *   getUseCasesForScreen()  — UseCase[] for a given visual_element_id
 *   getNavigationEdges()    — NavigationEdge[] from postconditions with 'screen_id:' prefix
 */
import { create } from 'zustand'
import type { DCM, DCMDocument, UseCase, ScreenElement } from '@advl/shared'
import { dcmService } from '../services/dcm.service'

/**
 * Convert a DCM (disk YAML format) into a DCMDocument (canvas format).
 *
 * ScreenElements are derived from the unique visual_element_id values on
 * use cases, so the canvas works even when no explicit visual_elements
 * section exists in the YAML. If the DCM gains a native visual_elements
 * field it takes precedence.
 */
function dcmToDCMDocument(dcm: DCM): DCMDocument {
  const nativeElements = (dcm as DCM & { visual_elements?: ScreenElement[] }).visual_elements

  let screenElements: ScreenElement[]

  if (nativeElements && nativeElements.length > 0) {
    screenElements = nativeElements
  } else {
    const seen = new Set<string>()
    screenElements = []
    for (const uc of dcm.use_cases) {
      const vid = uc.visual_element_id
      if (vid && vid !== 'pending' && !seen.has(vid)) {
        seen.add(vid)
        screenElements.push({
          id: vid,
          type: 'screen',
          name: vid.replace(/^(screen_|ve_|ve-)/i, '').replace(/_/g, ' '),
          route: undefined,
        })
      }
    }
  }

  return {
    version: dcm.version,
    project: dcm.project,
    description: dcm.description,
    use_cases: dcm.use_cases,
    visual_elements: screenElements,
    stack: dcm.stack,
    adrs: dcm.adrs,
    deprecated: dcm.deprecated,
    snapshots: dcm.snapshots,
  }
}

export interface NavigationEdge {
  id: string
  sourceScreenId: string
  targetScreenId: string
  useCaseId: string
  useCaseName: string
  label: string
}

export type SelectedNodeType = 'screenNode' | 'useCaseNode' | 'functionNode' | 'dbTableNode' | null

interface DCMState {
  dcm: DCM | null
  document: DCMDocument | null
  isLoading: boolean
  error: string | null

  // Canvas node selection — UC-004
  selectedNodeId: string | null
  selectedNodeType: SelectedNodeType
  selectedNodeData: Record<string, unknown> | null

  // File-based project actions
  loadDCM: (projectRoot: string) => Promise<void>
  saveDCM: (projectRoot: string) => Promise<void>
  updateUseCase: (useCase: UseCase) => void
  setDCM: (dcm: DCM) => void
  setError: (error: string | null) => void

  // Canvas actions
  loadDocument: (doc: DCMDocument) => void
  setSelectedNode: (id: string | null, type: SelectedNodeType, data: Record<string, unknown> | null) => void

  // Canvas selectors
  getScreens: () => ScreenElement[]
  getUseCasesForScreen: (screenId: string) => UseCase[]
  getNavigationEdges: () => NavigationEdge[]
}

export const useDCMStore = create<DCMState>((set, get) => ({
  dcm: null,
  document: null,
  isLoading: false,
  error: null,
  selectedNodeId: null,
  selectedNodeType: null,
  selectedNodeData: null,

  loadDCM: async (projectRoot: string) => {
    set({ isLoading: true, error: null })
    try {
      const dcm = await dcmService.readDCM(projectRoot)
      const doc = dcmToDCMDocument(dcm)
      set({ dcm, document: doc, isLoading: false })
    } catch (err) {
      const msg = String(err)
      // 404 / ENOENT = project has no DCM yet — not an error, just no file
      const isNotFound = msg.includes('404') || msg.includes('ENOENT') || msg.includes('not found')
      if (isNotFound) {
        set({ isLoading: false, error: null })
      } else {
        set({ error: msg, isLoading: false })
      }
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
          last_updated: new Date().toISOString().split('T')[0] ?? state.dcm.last_updated,
        },
      }
    })
  },

  setDCM: (dcm: DCM) => set({ dcm }),

  setError: (error) => set({ error }),

  loadDocument: (doc: DCMDocument) => set({ document: doc, error: null }),

  setSelectedNode: (id, type, data) => set({ selectedNodeId: id, selectedNodeType: type, selectedNodeData: data }),

  getScreens: () => {
    const doc = get().document
    if (!doc?.visual_elements) return []
    return doc.visual_elements.filter((el) => el.type === 'screen')
  },

  getUseCasesForScreen: (screenId: string) => {
    const doc = get().document
    if (!doc?.use_cases) return []
    return doc.use_cases.filter((uc) => uc.visual_element_id === screenId)
  },

  getNavigationEdges: (): NavigationEdge[] => {
    const doc = get().document
    if (!doc?.use_cases) return []

    const edges: NavigationEdge[] = []

    for (const uc of doc.use_cases) {
      if (!uc.visual_element_id || uc.visual_element_id === 'pending') continue

      const targets = (uc.postconditions ?? [])
        .filter((p) => p.startsWith('screen_id:'))
        .map((p) => p.replace('screen_id:', '').trim())

      const label = uc.name ?? uc.title

      for (const targetId of targets) {
        edges.push({
          id: `edge_${uc.id}_${targetId}`,
          sourceScreenId: uc.visual_element_id,
          targetScreenId: targetId,
          useCaseId: uc.id,
          useCaseName: label,
          label,
        })
      }
    }

    return edges
  },
}))
