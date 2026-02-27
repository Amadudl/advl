/**
 * features/inspector/index.tsx — Canvas Node Inspector Panel
 *
 * Reads the selected node from dcm.store.selectedNodeId/Type/Data and renders
 * the full metadata for that node type:
 *   screenNode    — screen id, name, route, use cases for this screen
 *   useCaseNode   — id, title, actor, status, value, functions count
 *   functionNode  — name, file, line, endpoint, auth, db_tables
 *   dbTableNode   — tableName, referenced-by function count
 *
 * advl_meta: { use_case_id: "UC-004", visual_element_id: "VE-CanvasNode-Inspector" }
 *
 * UC-004 / VE-CanvasNode-Inspector
 */
import { useDCMStore } from '../../store/dcm.store'
import type { UseCaseNodeData } from '../canvas/nodes/UseCaseNode'
import type { FunctionNodeData } from '../canvas/nodes/FunctionNode'
import type { DbTableNodeData } from '../canvas/nodes/DbTableNode'
import type { ScreenNodeData } from '../canvas/utils/dcm-to-flow'

const UC004_META = {
  use_case_id: 'UC-004',
  use_case_title: 'User inspects detailed element metadata via canvas selection',
  function: 'InspectorPanel',
  file: 'packages/core/src/features/inspector/index.tsx',
  line: 14,
  endpoint: null,
  db_tables: [],
  auth_required: false,
  last_verified: '2026-02-27',
  dcm_version: '1.0',
  visual_element_id: 'VE-CanvasNode-Inspector',
}

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-gray-800/60 last:border-0">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
      <span className={`text-xs text-gray-200 break-all ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-gray-600 italic">—</span>}
      </span>
    </div>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>
      {label}
    </span>
  )
}

// ── Node-type renderers ───────────────────────────────────────────────────────

function ScreenInspector({ data, nodeId }: { data: ScreenNodeData; nodeId: string }) {
  const { getUseCasesForScreen } = useDCMStore()
  const useCases = getUseCasesForScreen(nodeId)

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🖥️</span>
        <span className="text-sm font-semibold text-white truncate">{data.name}</span>
      </div>
      <Row label="Screen ID" value={data.screenId} mono />
      <Row label="Route" value={data.route} mono />
      <Row label="Use Cases" value={`${useCases.length} attached`} />
      {useCases.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {useCases.map((uc) => (
            <div key={uc.id} className="text-[10px] text-gray-400 bg-gray-800/50 rounded px-2 py-1">
              <span className="text-gray-600 font-mono mr-1">{uc.id}</span>
              {uc.title}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function UseCaseInspector({ data }: { data: UseCaseNodeData }) {
  const statusColor: Record<string, string> = {
    implemented: 'bg-emerald-900/60 text-emerald-300',
    planned: 'bg-yellow-900/60 text-yellow-300',
    in_progress: 'bg-blue-900/60 text-blue-300',
    deprecated: 'bg-gray-800 text-gray-500',
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📋</span>
        <span className="text-sm font-semibold text-white truncate">{data.title}</span>
      </div>
      <Row label="ID" value={data.ucId} mono />
      <Row label="Actor" value={data.actor} />
      <Row
        label="Status"
        value={
          <Tag
            label={data.status}
            color={statusColor[data.status] ?? 'bg-gray-800 text-gray-400'}
          />
        }
      />
      <Row label="Functions" value={`${data.functionCount} registered`} />
    </>
  )
}

function FunctionInspector({ data }: { data: FunctionNodeData }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚙️</span>
        <span className="text-sm font-semibold text-white truncate">{data.name}</span>
      </div>
      <Row label="File" value={data.file} mono />
      <Row label="Line" value={data.line} mono />
      <Row label="Endpoint" value={data.endpoint} mono />
      <Row
        label="Auth Required"
        value={
          <Tag
            label={data.authRequired ? 'yes' : 'no'}
            color={data.authRequired ? 'bg-red-900/60 text-red-300' : 'bg-gray-800 text-gray-500'}
          />
        }
      />
      {data.dbTables.length > 0 && (
        <div className="flex flex-col gap-0.5 py-1.5">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">DB Tables</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {data.dbTables.map((t) => (
              <Tag key={t} label={t} color="bg-emerald-900/50 text-emerald-300" />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function DbTableInspector({ data }: { data: DbTableNodeData }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🗄️</span>
        <span className="text-sm font-semibold text-emerald-300 font-mono">{data.tableName}</span>
      </div>
      <Row label="Table Name" value={data.tableName} mono />
      <Row label="Referenced By" value={`${data.referencedBy.length} function${data.referencedBy.length !== 1 ? 's' : ''}`} />
      {data.referencedBy.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {data.referencedBy.map((key) => (
            <div key={key} className="text-[10px] text-gray-500 font-mono bg-gray-800/50 rounded px-2 py-1 break-all">
              {key}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * InspectorPanel — UC-004
 * advl_meta: UC-004 / VE-CanvasNode-Inspector
 */
export function InspectorPanel() {
  const { selectedNodeId, selectedNodeType, selectedNodeData, setSelectedNode } = useDCMStore()

  if (!selectedNodeId || !selectedNodeData) {
    return (
      <div
        className="p-3 h-full flex flex-col"
        data-advl-meta={JSON.stringify(UC004_META)}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-700">
          <span className="text-3xl">🔍</span>
          <span className="text-xs text-center">Click a node on the canvas to inspect its metadata</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-3 h-full flex flex-col overflow-hidden"
      data-advl-meta={JSON.stringify(UC004_META)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
          {selectedNodeType?.replace('Node', '') ?? 'Node'}
        </span>
        <button
          onClick={() => setSelectedNode(null, null, null)}
          className="text-gray-700 hover:text-gray-400 text-xs px-1"
          title="Clear selection"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedNodeType === 'screenNode' && (
          <ScreenInspector
            data={selectedNodeData as unknown as ScreenNodeData}
            nodeId={selectedNodeId}
          />
        )}
        {selectedNodeType === 'useCaseNode' && (
          <UseCaseInspector data={selectedNodeData as unknown as UseCaseNodeData} />
        )}
        {selectedNodeType === 'functionNode' && (
          <FunctionInspector data={selectedNodeData as unknown as FunctionNodeData} />
        )}
        {selectedNodeType === 'dbTableNode' && (
          <DbTableInspector data={selectedNodeData as unknown as DbTableNodeData} />
        )}
      </div>
    </div>
  )
}
