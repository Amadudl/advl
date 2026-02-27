/**
 * features/project-init/index.tsx — New ADVL Project Bootstrapper
 *
 * UC-005: "User initializes a new ADVL project from a template"
 *
 * Presents a form with:
 *   - Project name input
 *   - Target directory path input (or folder-picker via platform adapter)
 *   - Stack template selector (4 options)
 *   - Execute button — calls projectService.initProject() then
 *     workspace.store.openProject() so the new project loads immediately.
 *
 * Error handling:
 *   DIRECTORY_NOT_EMPTY — red banner: "Target directory already has a DCM.yaml"
 *   WRITE_FAILED        — red banner with detail message
 *   generic             — red banner with error string
 *
 * advl_meta on Execute button → VE-ProjectInit-Submit / UC-005
 *
 * UC-005 / VE-ProjectInit-Submit
 */
import { useState } from 'react'
import { STACK_TEMPLATES } from '@advl/shared'
import type { StackTemplateId } from '@advl/shared'
import { projectService } from '../../services/project.service'
import { useWorkspaceStore } from '../../store/workspace.store'
import { platform } from '../../platform/adapter.factory'

const UC005_META = {
  use_case_id: 'UC-005',
  use_case_title: 'User initializes a new ADVL project from a template',
  function: 'initProject',
  file: 'packages/core/src/services/project.service.ts',
  line: 70,
  endpoint: null,
  db_tables: [],
  auth_required: false,
  last_verified: '2026-02-27',
  dcm_version: '1.0',
  visual_element_id: 'VE-ProjectInit-Submit',
}

const TEMPLATE_IDS = Object.keys(STACK_TEMPLATES) as StackTemplateId[]

function formatError(err: unknown): string {
  const msg = String(err).replace(/^Error:\s*/i, '')
  if (msg.startsWith('DIRECTORY_NOT_EMPTY')) {
    return 'That directory already contains a DCM.yaml. Choose an empty directory.'
  }
  if (msg.startsWith('WRITE_FAILED:')) {
    return `Write failed: ${msg.replace('WRITE_FAILED:', '')}`
  }
  return msg
}

export function ProjectInitFeature() {
  const { openProject } = useWorkspaceStore()
  const [projectName, setProjectName] = useState('')
  const [targetPath, setTargetPath] = useState('')
  const [templateId, setTemplateId] = useState<StackTemplateId>('web-nextjs')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isValid = projectName.trim().length > 0 && targetPath.trim().length > 0

  async function pickFolder() {
    const picked = await platform.openFolderDialog()
    if (picked) setTargetPath(picked)
  }

  async function handleInit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || isRunning) return

    setIsRunning(true)
    setError(null)

    try {
      await projectService.initProject(targetPath.trim(), templateId, projectName.trim())
      await openProject(targetPath.trim())
      setSuccess(true)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setIsRunning(false)
    }
  }

  if (success) {
    return (
      <div className="p-3 flex flex-col gap-2">
        <div className="text-xs text-emerald-400 bg-emerald-950/40 rounded px-2 py-2 border border-emerald-800/40">
          Project initialised and opened. DCM.yaml seeded with{' '}
          <span className="font-semibold">{STACK_TEMPLATES[templateId].label}</span> stack.
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccess(false)
            setProjectName('')
            setTargetPath('')
          }}
          className="text-xs text-blue-400 hover:text-blue-300 text-left"
        >
          + Init another project
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleInit} className="p-3 flex flex-col gap-3">
      {error && (
        <div className="text-xs text-red-400 bg-red-950/40 rounded px-2 py-1.5 border border-red-800/40">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={isRunning}
          placeholder="my-advl-project"
          className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider">
          Target Directory <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1">
          <input
            type="text"
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            disabled={isRunning}
            placeholder="/path/to/empty/folder"
            className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-blue-700 min-w-0"
          />
          <button
            type="button"
            onClick={() => void pickFolder()}
            disabled={isRunning}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1 disabled:opacity-40 shrink-0"
            title="Pick folder"
          >
            …
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider">
          Stack Template <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col gap-1">
          {TEMPLATE_IDS.map((id) => {
            const tpl = STACK_TEMPLATES[id]
            const selected = templateId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTemplateId(id)}
                disabled={isRunning}
                className={`text-left rounded px-2 py-1.5 border text-xs transition-colors disabled:opacity-40 ${
                  selected
                    ? 'border-blue-700 bg-blue-950/40 text-blue-200'
                    : 'border-gray-800 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-[11px]">{tpl.label}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{tpl.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isRunning}
        data-advl-meta={JSON.stringify(UC005_META)}
        className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white rounded px-3 py-1.5 transition-colors self-end mt-1"
      >
        {isRunning ? 'Initialising…' : 'Init Project ↵'}
      </button>
    </form>
  )
}
