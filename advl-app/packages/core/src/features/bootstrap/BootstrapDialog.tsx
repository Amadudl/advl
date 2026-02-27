/**
 * features/bootstrap/BootstrapDialog.tsx — Reverse Engineering Bootstrapper UI
 *
 * Sends BOOTSTRAP_PROJECT to the agent, displays scan progress and results.
 * On success, loads the returned DCMDocument into dcm.store and shows
 * violation count badge. User can then switch to Data Flow (Layer 1) to
 * see red/yellow marked nodes.
 *
 * UC-011 / VE-Bootstrap-Dialog
 */
import { useState, useRef } from 'react'
import { useDCMStore } from '../../store/dcm.store'
import { platform } from '../../platform/adapter.factory'
import type { AgentMessage } from '@advl/shared'

type BootstrapPhase = 'idle' | 'scanning' | 'ai_enriching' | 'done' | 'error'

interface ScanStats {
  filesScanned: number
  endpointsFound: number
  functionsFound: number
  tablesFound: number
  durationMs: number
}

interface BootstrapDialogProps {
  onClose: () => void
}

const STAT_LABELS: Array<{ key: keyof ScanStats; label: string }> = [
  { key: 'filesScanned', label: 'Dateien' },
  { key: 'endpointsFound', label: 'Endpoints' },
  { key: 'functionsFound', label: 'Funktionen' },
  { key: 'tablesFound', label: 'Tabellen' },
]

export function BootstrapDialog({ onClose }: BootstrapDialogProps) {
  const [projectPath, setProjectPath] = useState('')
  const [phase, setPhase] = useState<BootstrapPhase>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [scanStats, setScanStats] = useState<ScanStats | null>(null)
  const [violationCount, setViolationCount] = useState(0)
  const { loadDocument } = useDCMStore()
  const sessionRef = useRef<string | null>(null)

  function startBootstrap() {
    if (!projectPath.trim() || phase !== 'idle') return
    const sessionId = crypto.randomUUID()
    sessionRef.current = sessionId
    setPhase('scanning')
    setStatusMessage('')

    platform.onAgentMessage((msg: AgentMessage) => {
      if (sessionRef.current !== sessionId) return
      const payload = msg.payload as Record<string, unknown>

      if (msg.type === 'AGENT_STATUS') {
        setStatusMessage(String(payload['message'] ?? ''))
        const status = String(payload['status'] ?? '')
        if (status === 'ai_enriching') setPhase('ai_enriching')
      }

      if (msg.type === 'BOOTSTRAP_COMPLETE') {
        sessionRef.current = null
        const dcm = payload['dcm'] as Parameters<typeof loadDocument>[0]
        loadDocument(dcm)
        setScanStats(payload['scanStats'] as ScanStats)
        setViolationCount(Number(payload['violationCount'] ?? 0))
        setPhase('done')
        setStatusMessage(String(payload['message'] ?? ''))
      }

      if (msg.type === 'AGENT_ERROR') {
        sessionRef.current = null
        setPhase('error')
        setStatusMessage(String(payload['message'] ?? 'Unbekannter Fehler'))
      }
    })

    platform.sendToAgent({
      id: sessionId,
      type: 'BOOTSTRAP_PROJECT',
      payload: { projectRoot: projectPath.trim() },
      timestamp: new Date().toISOString(),
    }).catch(() => {
      sessionRef.current = null
      setPhase('error')
      setStatusMessage('Verbindung zum Agent fehlgeschlagen')
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[520px] shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">🔍 Projekt Bootstrappen</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              AI analysiert bestehenden Code und baut das DCM auf
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Dialog schließen"
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {phase === 'idle' && (
          <>
            <div className="mb-4">
              <label htmlFor="bootstrap-path" className="text-xs text-gray-400 mb-1.5 block font-medium">
                Projekt-Verzeichnis
              </label>
              <input
                id="bootstrap-path"
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') startBootstrap() }}
                placeholder="/Users/amadeus/projects/chaos-app"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white text-sm font-mono placeholder-gray-600
                           focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3 mb-4 border border-gray-700/50">
              <div className="text-xs text-gray-400 font-semibold mb-2">Was der Scanner erkennt:</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500">
                <div>✓ Express / Fastify / NestJS</div>
                <div>✓ ASP.NET / C# Controllers</div>
                <div>✓ Prisma / TypeORM Models</div>
                <div>✓ EF Core DbSets</div>
                <div>✓ SQL Queries</div>
                <div>✓ PII-Feld Hinweise</div>
              </div>
            </div>

            <button
              onClick={startBootstrap}
              disabled={!projectPath.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700
                         disabled:text-gray-500 text-white rounded-lg py-2.5 font-semibold
                         transition-colors duration-150"
            >
              Scan starten
            </button>
          </>
        )}

        {(phase === 'scanning' || phase === 'ai_enriching') && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-pulse">
              {phase === 'scanning' ? '🔍' : '🤖'}
            </div>
            <div className="text-white font-medium mb-2">
              {phase === 'scanning' ? 'Scanne Dateien...' : 'AI enrichiert DCM...'}
            </div>
            <div className="text-gray-400 text-sm min-h-[1.25rem]">{statusMessage}</div>
            <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 animate-pulse w-2/3 rounded-full" />
            </div>
          </div>
        )}

        {phase === 'done' && scanStats && (
          <div>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-white font-semibold">Bootstrap komplett!</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STAT_LABELS.map(({ key, label }) => (
                <div key={key} className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-400">{scanStats[key]}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
            {violationCount > 0 && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 mb-4
                              flex items-center gap-2">
                <span className="text-red-400">🔴</span>
                <span className="text-red-300 text-sm font-medium">
                  {violationCount} Violations erkannt — in Layer 1 rot markiert
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2.5
                         font-semibold transition-colors"
            >
              Zum Data Flow Layer →
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">❌</div>
            <div className="text-red-400 font-medium mb-2">Scan fehlgeschlagen</div>
            <div className="text-gray-400 text-sm mb-4 break-words">{statusMessage}</div>
            <button
              onClick={() => { setPhase('idle'); setStatusMessage('') }}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
