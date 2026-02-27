/**
 * tools/metadata.tool.ts — Agent tool: Inject advl_meta into visual elements
 *
 * Gives the LLM agent the ability to inject ADVL metadata into visual element
 * definitions in source files. Called after a use case is implemented.
 * See /rules/META_INJECTION.md for the full injection specification.
 *
 * Injection is performed by reading the real target file, locating the
 * named JSX element via bounded string search, and writing back.
 * This mirrors the strategy used by meta-injector.service.ts in core.
 */

import fs from 'node:fs/promises'

export const metadataToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'inject_advl_meta',
      description: 'Inject advl_meta metadata into a visual element definition in a source file.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Relative path to the file containing the visual element',
          },
          visual_element_id: {
            type: 'string',
            description: 'The VE-[Entity]-[Action] identifier of the element',
          },
          use_case_id: { type: 'string', description: 'DCM use case ID (e.g. UC-001)' },
          use_case_title: { type: 'string' },
          function_name: { type: 'string' },
          function_file: { type: 'string' },
          function_line: { type: 'number' },
          endpoint: { type: 'string', description: 'HTTP_METHOD /api/path or null' },
          db_tables: { type: 'array', items: { type: 'string' } },
          auth_required: { type: 'boolean' },
          roles_required: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'file_path', 'visual_element_id', 'use_case_id', 'use_case_title',
          'function_name', 'function_file', 'function_line', 'auth_required',
        ],
      },
    },
  },
]

function buildMetaAttrNode(meta: Record<string, unknown>): string {
  return `data-advl-meta='${JSON.stringify(meta)}'`
}

function injectMetaIntoContent(
  content: string,
  componentName: string,
  metaAttr: string,
): { result: string; found: boolean; line: number } {
  const lines = content.split('\n')
  const directTag = new RegExp(`<${componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s/>]`)
  const fnDecl = new RegExp(
    `(?:function\\s+${componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|` +
    `(?:const|let|var)\\s+${componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=)`,
  )

  let targetLineIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (directTag.test(lines[i] ?? '')) { targetLineIdx = i; break }
  }
  if (targetLineIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (fnDecl.test(lines[i] ?? '')) {
        for (let j = i + 1; j < lines.length && j < i + 80; j++) {
          if (/<[A-Za-z]/.test(lines[j] ?? '')) { targetLineIdx = j; break }
        }
        if (targetLineIdx !== -1) break
      }
    }
  }

  if (targetLineIdx === -1) return { result: content, found: false, line: -1 }

  const original = lines[targetLineIdx] ?? ''
  const cleaned = original.replace(/\s*data-advl-meta=(?:'[^']*'|"[^"]*"|\{[^}]*\})/g, '')
  const tagMatch = cleaned.match(/<([A-Za-z][A-Za-z0-9.]*)/)
  const tagName = tagMatch?.[1] ?? componentName
  const tagPat = new RegExp(`(<${tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([ \t>])`)
  const injected = cleaned.replace(tagPat, `$1 ${metaAttr}$2`)
  lines[targetLineIdx] = injected

  return { result: lines.join('\n'), found: true, line: targetLineIdx + 1 }
}

export async function executeMetadataTool(
  toolName: string,
  args: Record<string, unknown>,
  projectRoot?: string,
): Promise<string> {
  switch (toolName) {
    case 'inject_advl_meta': {
      const filePath = args['file_path'] as string | undefined
      const componentName = args['visual_element_id'] as string | undefined

      if (!filePath || !componentName) {
        return JSON.stringify({ success: false, error: 'file_path and visual_element_id are required' })
      }

      const today = new Date().toISOString().split('T')[0] ?? ''
      const meta: Record<string, unknown> = {
        use_case_id: args['use_case_id'],
        use_case_title: args['use_case_title'],
        function: args['function_name'],
        file: args['function_file'],
        line: args['function_line'],
        endpoint: args['endpoint'] ?? null,
        db_tables: args['db_tables'] ?? [],
        auth_required: args['auth_required'],
        roles_required: args['roles_required'] ?? [],
        last_verified: today,
        dcm_version: '1.0',
        visual_element_id: args['visual_element_id'],
      }

      const absPath = projectRoot
        ? `${projectRoot}/${filePath}`
        : filePath

      let content: string
      try {
        content = await fs.readFile(absPath, 'utf-8')
      } catch (e) {
        return JSON.stringify({ success: false, error: `Cannot read file: ${String(e)}` })
      }

      const { result, found, line } = injectMetaIntoContent(content, componentName, buildMetaAttrNode(meta))

      if (!found) {
        return JSON.stringify({
          success: false,
          error: `Component or element "${componentName}" not found in ${filePath}`,
        })
      }

      try {
        await fs.writeFile(absPath, result, 'utf-8')
      } catch (e) {
        return JSON.stringify({ success: false, error: `Cannot write file: ${String(e)}` })
      }

      return JSON.stringify({ success: true, file: filePath, line_injected: line })
    }

    default:
      return JSON.stringify({ error: `Unknown metadata tool: ${toolName}` })
  }
}
