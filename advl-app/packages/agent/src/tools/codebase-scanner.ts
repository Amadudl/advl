/**
 * tools/codebase-scanner.ts — Static code scanner for project bootstrapping
 *
 * Scans an existing codebase using regex patterns to extract:
 *   - REST endpoints (Express, Fastify, NestJS, ASP.NET)
 *   - DB tables/models (Prisma, TypeORM, EF Core, raw SQL)
 *   - Async functions
 *   - PII field hints
 *
 * Output is a partial DCMDocument ready for AI enrichment.
 * No AST — regex patterns are sufficient for bootstrap discovery.
 *
 * UC-011 (Reverse Engineering Bootstrapper)
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { glob } from 'glob'
import type { DCMDocument, Endpoint, FunctionEntry, DbTable } from '@advl/shared'

export interface ScanResult {
  dcm: Partial<DCMDocument>
  scanStats: {
    filesScanned: number
    endpointsFound: number
    functionsFound: number
    tablesFound: number
    durationMs: number
  }
}

const EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'cs', 'py', 'go', 'java']
const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'bin/**',
  'obj/**',
]

const PII_HINT_RE = /\b(email|phone|mobile|ssn|passport|address|dob|birthdate|credit_card|iban)\b/i

const PATTERNS = {
  expressEndpoint: /\.(get|post|put|patch|delete|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  nestDecorator:   /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]?([^'"`\)\s]+)?['"`]?\s*\)/gi,
  fastifyRoute:    /fastify\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  aspNetRoute:     /\[Http(Get|Post|Put|Patch|Delete)\](?:[^[]*\[Route\("([^"]+)"\)\])?/gi,
  prismaModel:     /^model\s+(\w+)\s+\{/gm,
  typeormEntity:   /@Entity\s*\(\s*['"`]?(\w+)?['"`]?\s*\)/gi,
  efDbSet:         /public\s+DbSet<(\w+)>/gi,
  sqlTable:        /(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+[`'"]?(\w+)[`'"]?/gi,
  asyncFunction:   /(?:async\s+)?function\s+(\w+)\s*\(/g,
  arrowFunction:   /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
}

function* execAll(content: string, pattern: RegExp): Generator<RegExpExecArray> {
  const re = new RegExp(pattern.source, pattern.flags)
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) yield m
}

function sanitizeId(s: string): string {
  return (s ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40)
}

const BOILERPLATE = new Set(['constructor', 'render', 'use', 'get', 'set', 'handle', 'on', 'main'])
const SQL_KEYWORDS = new Set(['SELECT', 'FROM', 'WHERE', 'JOIN', 'TABLE', 'VALUES', 'SET', 'INTO'])

function isBoilerplate(name: string): boolean {
  return BOILERPLATE.has(name.toLowerCase()) || name.length < 3
}

function isSqlKeyword(name: string): boolean {
  return SQL_KEYWORDS.has(name.toUpperCase())
}

function dedup<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>()
  return arr.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function addEndpoint(
  endpoints: Endpoint[],
  method: string,
  epPath: string,
  rel: string,
): void {
  const m = method.toUpperCase() as Endpoint['method']
  endpoints.push({
    id: `ep_${sanitizeId(method)}_${sanitizeId(epPath)}`,
    method: m,
    path: epPath,
    source_file: rel,
    use_cases: [],
  })
}

function addTable(tables: DbTable[], name: string, rel: string, hasPiiHint: boolean): void {
  if (tables.some((t) => t.name === name)) return
  tables.push({
    id: `tbl_${sanitizeId(name)}`,
    name,
    source_file: rel,
    audit_log: false,
    retention_days: null,
    fields: hasPiiHint ? [{ name: '(detected_pii_hint)', type: 'unknown', is_pii: true }] : [],
  })
}

function extractFromFile(
  content: string,
  rel: string,
  endpoints: Endpoint[],
  tables: DbTable[],
  functions: FunctionEntry[],
): void {
  const hasPii = PII_HINT_RE.test(content)

  for (const m of execAll(content, PATTERNS.expressEndpoint)) {
    addEndpoint(endpoints, m[1] ?? 'get', m[2] ?? '/', rel)
  }
  for (const m of execAll(content, PATTERNS.nestDecorator)) {
    addEndpoint(endpoints, m[1] ?? 'get', m[2] ?? rel, rel)
  }
  for (const m of execAll(content, PATTERNS.fastifyRoute)) {
    addEndpoint(endpoints, m[1] ?? 'get', m[2] ?? '/', rel)
  }
  for (const m of execAll(content, PATTERNS.aspNetRoute)) {
    if (m[1]) addEndpoint(endpoints, m[1], m[2] ?? rel, rel)
  }

  for (const m of execAll(content, PATTERNS.prismaModel)) {
    if (m[1]) addTable(tables, m[1], rel, hasPii)
  }
  for (const m of execAll(content, PATTERNS.typeormEntity)) {
    if (m[1]) addTable(tables, m[1], rel, hasPii)
  }
  for (const m of execAll(content, PATTERNS.efDbSet)) {
    if (m[1]) addTable(tables, m[1], rel, hasPii)
  }
  for (const m of execAll(content, PATTERNS.sqlTable)) {
    const name = (m[1] ?? '').replace(/[`'"]/g, '')
    if (name && !isSqlKeyword(name)) addTable(tables, name, rel, false)
  }

  for (const m of execAll(content, PATTERNS.asyncFunction)) {
    if (m[1] && !isBoilerplate(m[1])) {
      functions.push({
        id: `fn_${sanitizeId(m[1])}_${sanitizeId(rel)}`,
        name: m[1],
        source_file: rel,
        use_cases: [],
      })
    }
  }
  for (const m of execAll(content, PATTERNS.arrowFunction)) {
    if (m[1] && !isBoilerplate(m[1])) {
      functions.push({
        id: `fn_${sanitizeId(m[1])}_${sanitizeId(rel)}`,
        name: m[1],
        source_file: rel,
        use_cases: [],
      })
    }
  }
}

export async function scanCodebase(projectRoot: string): Promise<ScanResult> {
  const startTime = Date.now()

  const endpoints: Endpoint[] = []
  const functions: FunctionEntry[] = []
  const tables: DbTable[] = []

  const files = await glob(`**/*.{${EXTENSIONS.join(',')}}`, {
    cwd: projectRoot,
    ignore: IGNORE_PATTERNS,
    absolute: true,
  })

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8').catch(() => '')
    if (!content) continue
    const rel = path.relative(projectRoot, file)
    extractFromFile(content, rel, endpoints, tables, functions)
  }

  const uniqueEndpoints = dedup(endpoints)
  const uniqueFunctions = dedup(functions)
  const uniqueTables = dedup(tables)

  const dcm: Partial<DCMDocument> = {
    version: '1.0',
    project: `${path.basename(projectRoot)} (reverse-engineered)`,
    use_cases: [],
    visual_elements: [],
    endpoints: uniqueEndpoints,
    functions: uniqueFunctions,
    db_tables: uniqueTables,
    data_flows: [],
  }

  return {
    dcm,
    scanStats: {
      filesScanned: files.length,
      endpointsFound: uniqueEndpoints.length,
      functionsFound: uniqueFunctions.length,
      tablesFound: uniqueTables.length,
      durationMs: Date.now() - startTime,
    },
  }
}
