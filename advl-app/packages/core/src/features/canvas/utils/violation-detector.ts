/**
 * utils/violation-detector.ts — Detect DCM violations for Data Flow Layer 1
 *
 * Runs against a DCMDocument and returns a flat list of Violation objects.
 * Used by DataFlowCanvas to colour nodes red/yellow and by the agent's
 * BOOTSTRAP_PROJECT handler to count violations server-side.
 *
 * UC-010 / VE-Canvas-DataFlow
 */
import type { DCMDocument } from '@advl/shared'

export type ViolationSeverity = 'critical' | 'warning' | 'info'

export interface Violation {
  id: string
  entityId: string
  entityType: 'table' | 'endpoint' | 'function' | 'flow'
  severity: ViolationSeverity
  code: string
  message: string
  autoFixable: boolean
  fixPrompt?: string
}

export function detectViolations(doc: DCMDocument): Violation[] {
  const violations: Violation[] = []

  detectTableViolations(doc, violations)
  detectEndpointViolations(doc, violations)
  detectFunctionViolations(doc, violations)

  return violations
}

function detectTableViolations(doc: DCMDocument, out: Violation[]): void {
  for (const table of doc.db_tables ?? []) {
    if (!table.owner_service) {
      out.push({
        id: `v_${table.id}_no_owner`,
        entityId: table.id,
        entityType: 'table',
        severity: 'critical',
        code: 'NO_OWNER',
        message: `Tabelle "${table.name}" hat keinen Owner Service. Niemand ist verantwortlich.`,
        autoFixable: true,
        fixPrompt: `Analysiere alle Endpoints die auf "${table.name}" zugreifen und bestimme den primären Owner Service. Setze owner_service im DCM.`,
      })
    }

    const hasPii = table.fields?.some((f) => f.is_pii) ?? false
    if (hasPii && !table.audit_log) {
      out.push({
        id: `v_${table.id}_pii_no_audit`,
        entityId: table.id,
        entityType: 'table',
        severity: 'critical',
        code: 'PII_NO_AUDIT',
        message: `Tabelle "${table.name}" enthält PII-Daten aber hat kein Audit Log. GDPR-Risiko!`,
        autoFixable: true,
        fixPrompt: `Füge Audit-Logging für alle PII-Felder in "${table.name}" hinzu. Erstelle AuditLog Eintrag bei jedem write/delete.`,
      })
    }

    if (table.retention_days === null || table.retention_days === undefined) {
      out.push({
        id: `v_${table.id}_no_retention`,
        entityId: table.id,
        entityType: 'table',
        severity: 'warning',
        code: 'NO_RETENTION',
        message: `Tabelle "${table.name}" hat keine Retention Policy — Daten werden nie gelöscht.`,
        autoFixable: false,
        fixPrompt: `Definiere eine Retention Policy für "${table.name}" basierend auf dem Datentyp und GDPR-Anforderungen.`,
      })
    }
  }
}

function detectEndpointViolations(doc: DCMDocument, out: Violation[]): void {
  for (const ep of doc.endpoints ?? []) {
    const hasUseCase = doc.use_cases?.some((uc) =>
      uc.functions?.some((fn) => fn.endpoint === `${ep.method} ${ep.path}`),
    )
    if (!hasUseCase) {
      out.push({
        id: `v_${ep.id}_ghost`,
        entityId: ep.id,
        entityType: 'endpoint',
        severity: 'warning',
        code: 'GHOST_ENDPOINT',
        message: `Endpoint "${ep.method} ${ep.path}" ist keinem Use Case zugeordnet — Ghost Logic.`,
        autoFixable: true,
        fixPrompt: `Analysiere "${ep.method} ${ep.path}" und erstelle einen passenden Use Case oder markiere ihn als deprecated.`,
      })
    }
  }
}

function detectFunctionViolations(doc: DCMDocument, out: Violation[]): void {
  for (const fn of doc.functions ?? []) {
    const hasUseCase = doc.use_cases?.some((uc) =>
      uc.functions?.some((ucFn) => ucFn.name === fn.name),
    )
    if (!hasUseCase) {
      out.push({
        id: `v_${fn.id}_ghost`,
        entityId: fn.id,
        entityType: 'function',
        severity: 'warning',
        code: 'GHOST_FUNCTION',
        message: `Funktion "${fn.name}" ist keinem Use Case zugeordnet — möglicher Dead Code.`,
        autoFixable: true,
        fixPrompt: `Prüfe ob "${fn.name}" noch verwendet wird. Wenn ja, verknüpfe mit Use Case. Wenn nein, als deprecated markieren.`,
      })
    }
  }
}

export function getViolationsForEntity(violations: Violation[], entityId: string): Violation[] {
  return violations.filter((v) => v.entityId === entityId)
}

export function getWorstSeverity(violations: Violation[]): ViolationSeverity | null {
  if (violations.some((v) => v.severity === 'critical')) return 'critical'
  if (violations.some((v) => v.severity === 'warning')) return 'warning'
  if (violations.length > 0) return 'info'
  return null
}
