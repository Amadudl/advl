/**
 * services/compliance.engine.ts — ADVL Rulebook Compliance Engine
 *
 * UC-008: TypeScript port of tools/validate-rules.js.
 * Runs entirely in the browser/Electron renderer using the platform adapter
 * for filesystem access — no child_process required.
 *
 * Checks performed (mirrors validate-rules.js exactly):
 *   CR-01  DCM structural integrity — required top-level fields, date format
 *   CR-02  Use case uniqueness, ID format, status validity, value statement
 *   CR-03  Implemented UCs have ≥1 function; function records are complete; file refs exist
 *   CR-06  ADR format (id, decision, context, alternatives, status)
 *   CR-07  /rules directory — all 6 rule files present
 *   CR-09  Deprecated array entries have deprecated_date + deprecated_reason
 *   NO_DUPLICATE  No duplicate function names or endpoints across UCs
 *   NO_FAKE       Implemented UCs have NO_FAKE in rules_applied; fn.line != 0; auth_required present
 *   META_INJECTION  VE IDs follow VE-[Entity]-[Action] pattern; no duplicates
 *   STACK_RULES   Stack fields non-null when stack is initialised
 *
 * Returns ComplianceReport — { errors, warnings, passes } grouped by rule.
 *
 * UC-008 / VE-Compliance-Runner
 */
import type { DCM, UseCase } from '@advl/shared'
import { RULE_FILES, RULES_DIR, SCHEMA_DIR, DCM_FILENAME } from '@advl/shared'
import { platform } from '../platform/adapter.factory'
import { dcmService } from './dcm.service'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ComplianceItem {
  rule: string
  detail: string
}

export interface ComplianceReport {
  errors: ComplianceItem[]
  warnings: ComplianceItem[]
  passes: ComplianceItem[]
  projectRoot: string
  ranAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VE_ID_PATTERN = /^VE-[A-Z][a-zA-Z0-9]+-[A-Z][a-zA-Z0-9]+$/

const REQUIRED_STACK_FIELDS = [
  'runtime', 'framework', 'language', 'database', 'auth',
  'api_style', 'deployment', 'ci_cd', 'testing', 'package_manager',
] as const

const VALID_STATUSES = ['planned', 'in_progress', 'implemented', 'deprecated']

function err(report: ComplianceReport, rule: string, detail: string) {
  report.errors.push({ rule, detail })
}

function warn(report: ComplianceReport, rule: string, detail: string) {
  report.warnings.push({ rule, detail })
}

function pass(report: ComplianceReport, rule: string, detail: string) {
  report.passes.push({ rule, detail })
}

// ── Individual checks ─────────────────────────────────────────────────────────

function checkTopLevelMetadata(dcm: DCM, report: ComplianceReport) {
  const required = ['version', 'project', 'description', 'author', 'created', 'last_updated'] as const
  for (const field of required) {
    if (!dcm[field]) {
      err(report, 'CR-01', `DCM top-level field missing: ${field}`)
    } else {
      pass(report, 'CR-01', `Top-level field present: ${field} = "${dcm[field]}"`)
    }
  }
  if (dcm.last_updated && !/^\d{4}-\d{2}-\d{2}$/.test(dcm.last_updated)) {
    err(report, 'CR-01', `last_updated is not YYYY-MM-DD format: "${dcm.last_updated}"`)
  }
  if (!Array.isArray(dcm.use_cases)) {
    err(report, 'CR-01', 'DCM use_cases field is missing or not an array')
  } else {
    pass(report, 'CR-01', `use_cases array present (${dcm.use_cases.length} entries)`)
  }
}

function checkStackDeclaration(dcm: DCM, report: ComplianceReport) {
  if (!dcm.stack) {
    warn(report, 'CR-01', 'Stack declaration is missing. Add stack section to DCM.yaml.')
    return
  }
  const values = Object.values(dcm.stack)
  const hasAny = values.some((v) => v !== null && v !== undefined)
  if (!hasAny) {
    warn(report, 'CR-01', 'Stack declaration is all-null. Initialize stack values during project setup.')
    return
  }
  for (const field of REQUIRED_STACK_FIELDS) {
    const val = dcm.stack[field]
    if (val === null || val === undefined) {
      warn(report, 'STACK_RULES', `Stack field "${field}" is null. Required for initialized projects.`)
    } else {
      pass(report, 'STACK_RULES', `Stack field declared: ${field} = "${val}"`)
    }
  }
}

function checkUseCaseUniqueness(dcm: DCM, report: ComplianceReport) {
  const all: UseCase[] = [...(dcm.use_cases ?? []), ...(dcm.deprecated ?? [])]
  const seen = new Set<string>()
  const dupes: string[] = []

  for (const uc of all) {
    if (!uc.id) { err(report, 'CR-02', 'Use case found with no id field'); continue }
    if (seen.has(uc.id)) dupes.push(uc.id)
    seen.add(uc.id)
  }
  if (dupes.length > 0) {
    err(report, 'CR-02', `Duplicate use case IDs: ${dupes.join(', ')}`)
  } else {
    pass(report, 'CR-02', `All use case IDs unique (${all.length} total)`)
  }

  for (const uc of all) {
    if (uc.id && !/^UC-\d{3,}$/.test(uc.id)) {
      warn(report, 'CR-02', `Use case ID "${uc.id}" does not follow UC-XXX format`)
    }
    if (!VALID_STATUSES.includes(uc.status)) {
      err(report, 'CR-02', `UC ${uc.id} has invalid status: "${uc.status}"`)
    }
    if (!uc.title) {
      err(report, 'CR-02', `UC ${uc.id} is missing title`)
    }
    if (!uc.value) {
      err(report, 'USE_CASE_FIRST', `UC ${uc.id} is missing value statement`)
    }
  }
}

function checkFunctionDuplication(dcm: DCM, report: ComplianceReport) {
  const names = new Map<string, string>()
  const dupes: Array<{ name: string; uc1: string; uc2: string }> = []

  for (const uc of (dcm.use_cases ?? [])) {
    for (const fn of (uc.functions ?? [])) {
      if (!fn.name) continue
      if (names.has(fn.name)) {
        dupes.push({ name: fn.name, uc1: names.get(fn.name)!, uc2: uc.id })
      } else {
        names.set(fn.name, uc.id)
      }
    }
  }
  if (dupes.length > 0) {
    for (const d of dupes) {
      err(report, 'NO_DUPLICATE', `Function "${d.name}" in both ${d.uc1} and ${d.uc2}`)
    }
  } else {
    pass(report, 'NO_DUPLICATE', `No duplicate function names (${names.size} checked)`)
  }
}

function checkEndpointDuplication(dcm: DCM, report: ComplianceReport) {
  const eps = new Map<string, string>()
  const dupes: Array<{ endpoint: string; uc1: string; uc2: string }> = []

  for (const uc of (dcm.use_cases ?? [])) {
    for (const fn of (uc.functions ?? [])) {
      if (!fn.endpoint) continue
      if (eps.has(fn.endpoint)) {
        dupes.push({ endpoint: fn.endpoint, uc1: eps.get(fn.endpoint)!, uc2: uc.id })
      } else {
        eps.set(fn.endpoint, uc.id)
      }
    }
  }
  if (dupes.length > 0) {
    for (const d of dupes) {
      err(report, 'NO_DUPLICATE', `Endpoint "${d.endpoint}" in both ${d.uc1} and ${d.uc2}`)
    }
  } else {
    pass(report, 'NO_DUPLICATE', `No duplicate endpoints (${eps.size} checked)`)
  }
}

function checkImplementedUseCases(dcm: DCM, report: ComplianceReport) {
  for (const uc of (dcm.use_cases ?? [])) {
    if (uc.status !== 'implemented') continue
    if (!uc.functions || uc.functions.length === 0) {
      err(report, 'CR-03', `UC ${uc.id} is "implemented" but has no functions registered`)
    } else {
      pass(report, 'CR-03', `UC ${uc.id} has ${uc.functions.length} function(s) registered`)
      for (const fn of uc.functions) {
        if (!fn.name) err(report, 'CR-03', `UC ${uc.id}: function record missing "name"`)
        if (!fn.file) err(report, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "file"`)
        if (fn.line === null || fn.line === undefined) {
          err(report, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "line"`)
        }
        if (fn.auth_required === null || fn.auth_required === undefined) {
          warn(report, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "auth_required"`)
        }
        if (!fn.last_modified) {
          warn(report, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "last_modified"`)
        }
      }
    }
  }
}

async function checkFileReferences(dcm: DCM, report: ComplianceReport, projectRoot: string) {
  const checked = new Set<string>()
  for (const uc of (dcm.use_cases ?? [])) {
    for (const fn of (uc.functions ?? [])) {
      if (!fn.file || checked.has(fn.file)) continue
      checked.add(fn.file)
      const fullPath = `${projectRoot}/${fn.file}`
      const exists = await platform.exists(fullPath)
      if (!exists) {
        err(report, 'CR-03', `UC ${uc.id}: function "${fn.name}" references non-existent file: ${fn.file}`)
      } else {
        pass(report, 'CR-03', `File reference verified: ${fn.file}`)
      }
    }
  }
}

async function checkRulesDirectory(report: ComplianceReport, projectRoot: string) {
  for (const ruleFile of RULE_FILES) {
    const fullPath = `${projectRoot}/${RULES_DIR}/${ruleFile}`
    const exists = await platform.exists(fullPath)
    if (!exists) {
      err(report, 'CR-07', `Required rule file missing: rules/${ruleFile}`)
    } else {
      pass(report, 'CR-07', `Rule file present: rules/${ruleFile}`)
    }
  }
}

function checkDeprecatedUseCases(dcm: DCM, report: ComplianceReport) {
  for (const uc of (dcm.deprecated ?? [])) {
    if (uc.status !== 'deprecated') {
      warn(report, 'CR-09', `Entry in deprecated array has status "${uc.status}" (expected "deprecated"): ${uc.id}`)
    }
    if (!uc.deprecated_date) {
      err(report, 'CR-09', `Deprecated entry ${uc.id} missing "deprecated_date"`)
    }
    if (!uc.deprecated_reason) {
      err(report, 'CR-09', `Deprecated entry ${uc.id} missing "deprecated_reason"`)
    }
    if (uc.deprecated_date && uc.deprecated_reason) {
      pass(report, 'CR-09', `Deprecated entry ${uc.id} has proper deprecation metadata`)
    }
  }
  for (const uc of (dcm.use_cases ?? [])) {
    if (uc.status === 'deprecated') {
      warn(report, 'CR-09', `UC ${uc.id} has status "deprecated" but is still in use_cases. Move to deprecated array.`)
    }
  }
}

function checkVisualElementIds(dcm: DCM, report: ComplianceReport) {
  const seen = new Set<string>()
  for (const uc of (dcm.use_cases ?? [])) {
    const vid = uc.visual_element_id
    if (vid === null || vid === undefined) {
      pass(report, 'META_INJECTION', `UC ${uc.id}: visual_element_id null (system UC or intentionally unlinked)`)
    } else if (vid === 'pending') {
      pass(report, 'META_INJECTION', `UC ${uc.id}: visual_element_id pending (UI not yet designed)`)
    } else if (!VE_ID_PATTERN.test(vid)) {
      warn(report, 'META_INJECTION', `UC ${uc.id}: visual_element_id "${vid}" does not match VE-[Entity]-[Action]`)
    } else {
      pass(report, 'META_INJECTION', `UC ${uc.id}: visual_element_id "${vid}" valid`)
    }
    if (vid && vid !== 'pending') {
      if (seen.has(vid)) {
        err(report, 'META_INJECTION', `Duplicate visual_element_id "${vid}" across use cases`)
      }
      seen.add(vid)
    }
  }
}

function checkNoFakeCompliance(dcm: DCM, report: ComplianceReport) {
  for (const uc of (dcm.use_cases ?? [])) {
    if (uc.status !== 'implemented') continue
    if (!uc.rules_applied?.includes('NO_FAKE')) {
      warn(report, 'NO_FAKE', `UC ${uc.id} is "implemented" but NO_FAKE not in rules_applied`)
    }
    for (const fn of (uc.functions ?? [])) {
      if (fn.line === 0 || fn.line === null || fn.line === undefined) {
        warn(report, 'NO_FAKE', `UC ${uc.id}: function "${fn.name}" has line 0 or null`)
      }
      if (fn.auth_required === null || fn.auth_required === undefined) {
        err(report, 'NO_FAKE', `UC ${uc.id}: function "${fn.name}" has no auth_required value`)
      }
      const nameLower = (fn.name ?? '').toLowerCase()
      if (!fn.name || fn.name.trim() === '') {
        err(report, 'NO_FAKE', `UC ${uc.id}: function record with empty name — stub detected`)
      } else if (nameLower.includes('todo') || nameLower.includes('placeholder') || nameLower.includes('stub')) {
        err(report, 'NO_FAKE', `UC ${uc.id}: function name "${fn.name}" suggests a stub`)
      }
    }
    if (uc.functions && uc.functions.length > 0) {
      pass(report, 'NO_FAKE', `UC ${uc.id}: implemented with ${uc.functions.length} function(s)`)
    }
  }
}

function checkADRFormat(dcm: DCM, report: ComplianceReport) {
  const validStatuses = ['proposed', 'accepted', 'superseded', 'deprecated']
  for (const adr of (dcm.adrs ?? [])) {
    if (!adr.id || !/^ADR-\d{3,}$/.test(adr.id)) {
      warn(report, 'CR-06', `ADR missing or invalid id (expected ADR-XXX): ${JSON.stringify(adr.id)}`)
    }
    if (!adr.decision) err(report, 'CR-06', `ADR ${adr.id ?? 'unknown'} missing "decision"`)
    if (!adr.context) err(report, 'CR-06', `ADR ${adr.id ?? 'unknown'} missing "context"`)
    if (!validStatuses.includes(adr.status)) {
      warn(report, 'CR-06', `ADR ${adr.id ?? 'unknown'} has invalid status "${adr.status}"`)
    }
    if (!adr.alternatives_considered || adr.alternatives_considered.length === 0) {
      warn(report, 'CR-06', `ADR ${adr.id ?? 'unknown'} has no alternatives_considered`)
    }
    if (adr.id && adr.decision && adr.context) {
      pass(report, 'CR-06', `ADR ${adr.id} is well-formed`)
    }
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * runComplianceChecks — UC-008
 * Loads DCM.yaml from the projectRoot via platform adapter and runs all checks.
 * Returns a ComplianceReport with errors, warnings, and passes.
 */
export async function runComplianceChecks(projectRoot: string): Promise<ComplianceReport> {
  const report: ComplianceReport = {
    errors: [],
    warnings: [],
    passes: [],
    projectRoot,
    ranAt: new Date().toISOString(),
  }

  const dcmPath = `${projectRoot}/${SCHEMA_DIR}/${DCM_FILENAME}`
  const dcmExists = await platform.exists(dcmPath)
  if (!dcmExists) {
    err(report, 'CR-01', `DCM file not found at: ${dcmPath}`)
    return report
  }

  let dcm: DCM
  try {
    dcm = await dcmService.readDCM(projectRoot)
  } catch (e) {
    err(report, 'CR-01', `DCM parse error: ${String(e)}`)
    return report
  }

  pass(report, 'CR-01', 'DCM file exists and is parseable')

  checkTopLevelMetadata(dcm, report)
  checkStackDeclaration(dcm, report)
  checkUseCaseUniqueness(dcm, report)
  checkFunctionDuplication(dcm, report)
  checkEndpointDuplication(dcm, report)
  checkImplementedUseCases(dcm, report)
  checkDeprecatedUseCases(dcm, report)
  checkVisualElementIds(dcm, report)
  checkNoFakeCompliance(dcm, report)
  checkADRFormat(dcm, report)
  await checkFileReferences(dcm, report, projectRoot)
  await checkRulesDirectory(report, projectRoot)

  return report
}
