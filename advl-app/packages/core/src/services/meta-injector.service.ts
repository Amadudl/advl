/**
 * services/meta-injector.service.ts — ADVL Meta Injection Engine
 *
 * UC-009: "User injects advl_meta into a visual component via Canvas/IDE"
 *
 * Physically reads a target source file, locates a named JSX element or
 * React component return statement, injects a `data-advl-meta` attribute
 * carrying the full advl_meta JSON payload, and writes the file back.
 *
 * Injection strategy — safe bounded string replacement (no AST parser):
 *
 *   Given a componentName of "MyButton" the engine searches for the first
 *   JSX opening tag that matches one of these patterns (in order):
 *
 *   1. Standalone element:  <MyButton
 *   2. JSX return wrapping: return (\n    <MyButton
 *   3. HTML element inside a component function bearing that name — falls
 *      back to locating the function declaration and the first <X tag
 *      inside its body.
 *
 *   The injection inserts:
 *     data-advl-meta='{"use_case_id":"UC-XXX",...}'
 *   immediately after the matched tag name on the same line, before any
 *   existing attributes or the closing >.
 *
 * Guard rails:
 *   - Reads the real file content — never generates or replaces wholesale.
 *   - If the component cannot be located, returns InjectionResult with
 *     success=false and a descriptive reason. Never silently no-ops.
 *   - If data-advl-meta already exists on the matched element, the existing
 *     value is replaced rather than duplicated.
 *   - Writes only when content actually changed.
 *
 * UC-009 / VE-MetaInjector-Bind
 */
import { platform } from '../platform/adapter.factory'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdvlMeta {
  use_case_id: string
  use_case_title: string
  function: string
  file: string
  line: number
  endpoint: string | null
  db_tables: string[]
  auth_required: boolean
  last_verified: string
  dcm_version: string
  visual_element_id: string
}

export interface InjectionResult {
  success: boolean
  reason?: string
  lineInjected?: number
  previouslyHadMeta?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Escape a string for safe use inside a regex literal.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build the data-advl-meta attribute string.
 * Uses single-quote wrapping so it works inside JSX without escaping double quotes.
 */
function buildMetaAttr(meta: AdvlMeta): string {
  return `data-advl-meta='${JSON.stringify(meta)}'`
}

/**
 * Given a line that starts a JSX tag (e.g. "  <button className=..."),
 * inject or replace data-advl-meta immediately after the tag name.
 *
 * Handles:
 *   <TagName>
 *   <TagName attr="x">
 *   <TagName\n   (multi-line props — only inserts on this line)
 *   already has data-advl-meta — replaces it
 */
function injectAttrIntoLine(line: string, tagName: string, metaAttr: string): string {
  const existingMetaPattern = /\s*data-advl-meta=(?:'[^']*'|"[^"]*"|\{[^}]*\})/g

  const cleaned = line.replace(existingMetaPattern, '')

  const tagPattern = new RegExp(`(<${escapeRegex(tagName)})([\\s>])`)
  return cleaned.replace(tagPattern, `$1 ${metaAttr}$2`)
}

/**
 * Find the first line index where a JSX tag matching `componentName` opens.
 *
 * Search order:
 *   1. `<ComponentName` anywhere — direct JSX usage
 *   2. Function/const/export declaration bearing that name, then its first `<` tag inside
 */
function findTagLineIndex(lines: string[], componentName: string): number {
  const directTag = new RegExp(`<${escapeRegex(componentName)}[\\s/>]`)

  for (let i = 0; i < lines.length; i++) {
    if (directTag.test(lines[i])) {
      return i
    }
  }

  const fnDecl = new RegExp(
    `(?:function\\s+${escapeRegex(componentName)}|` +
    `(?:const|let|var)\\s+${escapeRegex(componentName)}\\s*=)`,
  )

  for (let i = 0; i < lines.length; i++) {
    if (fnDecl.test(lines[i])) {
      for (let j = i + 1; j < lines.length && j < i + 80; j++) {
        if (/<[A-Za-z]/.test(lines[j])) {
          return j
        }
      }
    }
  }

  return -1
}

/**
 * Extract the JSX tag name from a line (the first `<Ident` on the line).
 */
function extractTagName(line: string): string | null {
  const m = line.match(/<([A-Za-z][A-Za-z0-9.]*)/)
  return m ? (m[1] ?? null) : null
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * injectMeta — UC-009
 *
 * @param filePath       Absolute or project-relative path to the source file.
 * @param componentName  The JSX element or component name to target
 *                       (e.g. "button", "SubmitButton", "form").
 * @param meta           The full AdvlMeta object to inject.
 */
export async function injectMeta(
  filePath: string,
  componentName: string,
  meta: AdvlMeta,
): Promise<InjectionResult> {
  let content: string
  try {
    content = await platform.readFile(filePath)
  } catch (e) {
    return { success: false, reason: `Cannot read file: ${String(e)}` }
  }

  const lines = content.split('\n')
  const lineIdx = findTagLineIndex(lines, componentName)

  if (lineIdx === -1) {
    return {
      success: false,
      reason:
        `Could not locate "<${componentName}" or a function/const named "${componentName}" ` +
        `in ${filePath}. Ensure the component name matches exactly (case-sensitive).`,
    }
  }

  const originalLine = lines[lineIdx] ?? ''
  const hadMeta = /data-advl-meta=/.test(originalLine)

  const tagName = extractTagName(originalLine) ?? componentName
  const metaAttr = buildMetaAttr(meta)
  const newLine = injectAttrIntoLine(originalLine, tagName, metaAttr)

  if (newLine === originalLine) {
    return {
      success: false,
      reason: `Tag "<${tagName}>" was found at line ${lineIdx + 1} but injection produced no change. ` +
        `Check that the tag name is correct and the line is not already fully injected.`,
    }
  }

  lines[lineIdx] = newLine
  const newContent = lines.join('\n')

  try {
    await platform.writeFile(filePath, newContent)
  } catch (e) {
    return { success: false, reason: `Cannot write file: ${String(e)}` }
  }

  return {
    success: true,
    lineInjected: lineIdx + 1,
    previouslyHadMeta: hadMeta,
  }
}
