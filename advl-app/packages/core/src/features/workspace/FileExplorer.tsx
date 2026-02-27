/**
 * features/workspace/FileExplorer.tsx — In-app filesystem tree browser
 *
 * Used in Browser/Server mode where a native OS dialog is unavailable.
 * Electron mode uses the native dialog directly via IPC.
 *
 * Exports:
 *   FileExplorer        — tree component (embeddable)
 *   FileExplorerModal   — full-screen modal wrapper
 *   OpenProjectButton   — smart button: native dialog in Electron, modal in browser
 *
 * UC-001 / VE-Workspace-Open
 */
import { useState, useEffect, useCallback } from 'react'
import { platform } from '../../platform/adapter.factory'
import { resolveInAppFolderDialog } from '../../platform/adapter.browser'
import type { DirEntry } from '../../platform/adapter.interface'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TreeNode extends DirEntry {
  depth: number
}

interface FileExplorerProps {
  mode?: 'folder' | 'file'
  onSelect: (path: string) => void
  onCancel: () => void
}

interface FileExplorerModalProps {
  isOpen: boolean
  onSelect: (path: string) => void
  onClose: () => void
  mode?: 'folder' | 'file'
}

// ── File icons ────────────────────────────────────────────────────────────────

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const MAP: Record<string, string> = {
    ts: '🔷', tsx: '🔷', js: '🟨', jsx: '🟨',
    json: '📋', yaml: '📋', yml: '📋',
    md: '📝', txt: '📄',
    css: '🎨', html: '🌐',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', svg: '🖼️',
    cs: '🟣', py: '🐍', go: '🔵', rs: '🦀',
    gitignore: '🚫', env: '🔒',
  }
  return MAP[ext] ?? '📄'
}

// ── FileExplorer ──────────────────────────────────────────────────────────────

export function FileExplorer({ mode = 'folder', onSelect, onCancel }: FileExplorerProps) {
  const [roots, setRoots] = useState<TreeNode[]>([])
  const [expanded, setExpanded] = useState<Map<string, TreeNode[]>>(new Map())
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    platform.getFilesystemRoots()
      .then((entries) => {
        setRoots(entries.map((e) => ({ ...e, depth: 0 })))
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        setError(String(err))
        setIsLoading(false)
      })
  }, [])

  const toggleDir = useCallback(async (node: TreeNode) => {
    if (!node.isDirectory) {
      if (mode === 'file') setSelectedPath(node.path)
      return
    }

    setSelectedPath(node.path)

    if (expanded.has(node.path)) {
      setExpanded((prev) => {
        const next = new Map(prev)
        next.delete(node.path)
        return next
      })
      return
    }

    setLoading((prev) => new Set(prev).add(node.path))
    try {
      const children = await platform.readDir(node.path)
      const sorted = [...children].sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
      const childNodes: TreeNode[] = sorted
        .filter((e) => !e.name.startsWith('.') || e.name === '.advl')
        .map((e) => ({ ...e, depth: node.depth + 1 }))

      setExpanded((prev) => new Map(prev).set(node.path, childNodes))
    } catch (err: unknown) {
      setError(`Cannot open: ${String(err)}`)
    } finally {
      setLoading((prev) => {
        const next = new Set(prev)
        next.delete(node.path)
        return next
      })
    }
  }, [expanded, mode])

  function renderNode(node: TreeNode): React.ReactNode {
    const isSelected = selectedPath === node.path
    const isExpanded = expanded.has(node.path)
    const isLoadingNode = loading.has(node.path)
    const children = expanded.get(node.path) ?? []

    return (
      <div key={node.path}>
        <div
          onClick={() => { void toggleDir(node) }}
          className={[
            'flex items-center gap-1.5 cursor-pointer rounded transition-colors duration-75 select-none',
            'py-[3px] pr-2',
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white',
          ].join(' ')}
          style={{ paddingLeft: `${(node.depth + 1) * 14}px` }}
        >
          <span className="w-3 text-center text-gray-500 text-[10px] flex-shrink-0">
            {node.isDirectory
              ? isLoadingNode ? '⟳' : isExpanded ? '▾' : '▸'
              : ''}
          </span>
          <span className="text-sm flex-shrink-0">
            {node.isDirectory
              ? (isExpanded ? '📂' : '📁')
              : getFileIcon(node.name)}
          </span>
          <span className="truncate text-sm">{node.name}</span>
        </div>

        {isExpanded && children.length === 0 && !isLoadingNode && (
          <div
            className="text-[11px] text-gray-600 italic py-0.5"
            style={{ paddingLeft: `${(node.depth + 2) * 14}px` }}
          >
            (empty)
          </div>
        )}
        {isExpanded && children.map((child) => renderNode(child))}
      </div>
    )
  }

  const platformInfo = platform.getPlatformInfo()
  const breadcrumbs = selectedPath
    ? selectedPath.replace(/\\/g, '/').split('/').filter(Boolean)
    : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 gap-2">
        <span className="animate-spin text-lg">⟳</span>
        <span className="text-sm">Loading filesystem…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div>
          <h3 className="text-white font-semibold text-sm">
            {mode === 'folder' ? '📁 Select Folder' : '📄 Select File'}
          </h3>
          <p className="text-gray-600 text-xs mt-0.5">
            {platformInfo.mode === 'server' ? 'Server filesystem' : 'Local filesystem'}
          </p>
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="text-gray-500 hover:text-gray-300 text-xl leading-none px-1"
        >
          ✕
        </button>
      </div>

      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-800 overflow-x-auto shrink-0">
          <span className="text-gray-600 text-[10px]">📍</span>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-700 text-[10px]">/</span>}
              <span className="text-[11px] text-gray-500 whitespace-nowrap">{crumb}</span>
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 bg-red-950/40 border-b border-red-900/50 text-red-300 text-xs flex justify-between shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {roots.map((root) => renderNode(root))}
      </div>

      {/* Path input + actions */}
      <div className="border-t border-gray-800 p-3 shrink-0">
        <input
          type="text"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          placeholder="Type path or select above…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5
                     text-white text-xs font-mono placeholder-gray-600 mb-2.5
                     focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300
                       rounded py-2 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (selectedPath) onSelect(selectedPath) }}
            disabled={!selectedPath}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700
                       disabled:text-gray-500 text-white rounded py-2 text-sm
                       font-semibold transition-colors"
          >
            {mode === 'folder' ? 'Open Folder' : 'Open File'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FileExplorerModal ─────────────────────────────────────────────────────────

export function FileExplorerModal({ isOpen, onSelect, onClose, mode = 'folder' }: FileExplorerModalProps) {
  if (!isOpen) return null

  function handleSelect(path: string) {
    resolveInAppFolderDialog(path)
    onSelect(path)
    onClose()
  }

  function handleCancel() {
    resolveInAppFolderDialog(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
                      w-[560px] h-[580px] flex flex-col overflow-hidden">
        <FileExplorer
          mode={mode}
          onSelect={handleSelect}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}

// ── OpenProjectButton ─────────────────────────────────────────────────────────

interface OpenProjectButtonProps {
  onProjectOpened: (path: string) => void
  className?: string
}

export function OpenProjectButton({ onProjectOpened, className }: OpenProjectButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const platformInfo = platform.getPlatformInfo()
  const hasNativeDialogs = platformInfo.capabilities.includes('native-dialogs')

  async function handleClick() {
    if (hasNativeDialogs) {
      const selectedPath = await platform.openFolderDialog()
      if (selectedPath) {
        await platform.setProjectRoot(selectedPath)
        onProjectOpened(selectedPath)
      }
    } else {
      setShowModal(true)
    }
  }

  async function handleModalSelect(selectedPath: string) {
    await platform.setProjectRoot(selectedPath)
    onProjectOpened(selectedPath)
    setShowModal(false)
  }

  return (
    <>
      <button
        onClick={() => { void handleClick() }}
        className={className ?? [
          'flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500',
          'text-white rounded-lg px-4 py-2.5 font-semibold text-sm',
          'transition-colors duration-150 shadow-lg',
        ].join(' ')}
      >
        <span>📁</span>
        <span>Open Project</span>
        {hasNativeDialogs && (
          <span className="text-indigo-300 text-xs font-normal">(dialog)</span>
        )}
      </button>

      <FileExplorerModal
        isOpen={showModal}
        onSelect={handleModalSelect}
        onClose={() => {
          resolveInAppFolderDialog(null)
          setShowModal(false)
        }}
      />
    </>
  )
}
