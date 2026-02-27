/**
 * dcm.engine.ts — DCM read/write/query engine for the Agent process
 *
 * The authoritative DCM interface inside the agent. Uses the 'yaml' package
 * to parse and serialize DCM.yaml. All agent handlers that need to read or
 * write the DCM go through this engine.
 *
 * readDCM() and writeDCM() are real implementations.
 * Query methods are stubs pending LLM-based semantic search.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import type { DCM, UseCase, FunctionQueryResult, UseCaseQueryResult } from '@advl/shared'
import { DCM_FILENAME, SCHEMA_DIR } from '@advl/shared'

/** Resolve the DCM.yaml path from an env var or a passed projectRoot */
function resolveDCMPath(projectRoot?: string): string {
  const root = projectRoot ?? process.env['ADVL_PROJECT_ROOT'] ?? process.cwd()
  return path.join(root, SCHEMA_DIR, DCM_FILENAME)
}

export const dcmEngine = {
  /**
   * Read and parse DCM.yaml from disk.
   * This is a real implementation — reads the actual file.
   */
  async readDCM(projectRoot?: string): Promise<DCM> {
    const dcmPath = resolveDCMPath(projectRoot)
    const content = await fs.readFile(dcmPath, 'utf-8')
    return parse(content) as DCM
  },

  /**
   * Serialize and write DCM to disk.
   * This is a real implementation — writes to the actual file.
   */
  async writeDCM(dcm: DCM, projectRoot?: string): Promise<void> {
    const dcmPath = resolveDCMPath(projectRoot)
    dcm.last_updated = new Date().toISOString().split('T')[0] ?? dcm.last_updated
    const content = stringify(dcm, { lineWidth: 120 })
    await fs.writeFile(dcmPath, content, 'utf-8')
  },

  /**
   * Register a new use case in the DCM.
   * Assigns the next sequential UC-ID if none provided.
   * Performs exact-title duplicate check before inserting.
   */
  async registerUseCase(useCase: Omit<UseCase, 'id'> & { id?: string }, projectRoot?: string): Promise<UseCase> {
    const dcm = await dcmEngine.readDCM(projectRoot)

    const titleNorm = useCase.title.toLowerCase().trim()
    const existing = dcm.use_cases.find((uc) => uc.title.toLowerCase().trim() === titleNorm)
    if (existing) {
      return existing
    }

    const existingIds = dcm.use_cases.map((uc) => uc.id)
    const nextNum = existingIds.length + 1
    const id = useCase.id ?? `UC-${String(nextNum).padStart(3, '0')}`

    const newUseCase: UseCase = { ...useCase, id } as UseCase
    dcm.use_cases.push(newUseCase)
    await dcmEngine.writeDCM(dcm, projectRoot)
    return newUseCase
  },

  /**
   * Query DCM functions by intent description.
   *
   * Scans all functions across all use cases and scores each by how many
   * normalised intent words appear in function name + file path + endpoint.
   * Returns the best match if confidence ≥ 40 % of intent words matched.
   * No LLM required — deterministic keyword scan.
   *
   * UC-007
   */
  async queryFunctions(intent: string, projectRoot?: string): Promise<FunctionQueryResult> {
    const dcm = await dcmEngine.readDCM(projectRoot)
    const words = intent.toLowerCase().split(/\W+/).filter((w) => w.length > 2)

    if (words.length === 0) {
      return { found: false, reason: 'Intent too short to match' }
    }

    let bestScore = 0
    let bestMatch: { fn: (typeof dcm.use_cases)[0]['functions'][0]; ucId: string } | null = null

    for (const uc of dcm.use_cases) {
      for (const fn of uc.functions) {
        const haystack = [fn.name, fn.file, fn.endpoint ?? ''].join(' ').toLowerCase()
        const score = words.filter((w) => haystack.includes(w)).length / words.length
        if (score > bestScore) {
          bestScore = score
          bestMatch = { fn, ucId: uc.id }
        }
      }
    }

    if (bestMatch && bestScore >= 0.4) {
      return {
        found: true,
        functionName: bestMatch.fn.name,
        useCaseId: bestMatch.ucId,
        file: bestMatch.fn.file,
        line: bestMatch.fn.line,
        endpoint: bestMatch.fn.endpoint ?? undefined,
        reason: `Keyword match score: ${Math.round(bestScore * 100)}%`,
      }
    }

    return { found: false, reason: `No function matched intent (best score: ${Math.round(bestScore * 100)}%)` }
  },

  /**
   * Query DCM use cases by intent to detect semantic duplicates.
   *
   * Scores each UC by keyword overlap between the intent string and the
   * UC title + value statement. Returns best match if ≥ 40 % overlap.
   * No LLM required — deterministic keyword scan.
   *
   * UC-007
   */
  async queryUseCases(intent: string, projectRoot?: string): Promise<UseCaseQueryResult> {
    const dcm = await dcmEngine.readDCM(projectRoot)
    const words = intent.toLowerCase().split(/\W+/).filter((w) => w.length > 2)

    if (words.length === 0) {
      return { found: false, reason: 'Intent too short to match' }
    }

    let bestScore = 0
    let bestMatch: (typeof dcm.use_cases)[0] | null = null

    for (const uc of dcm.use_cases) {
      const haystack = [uc.title, uc.value, uc.actor].join(' ').toLowerCase()
      const score = words.filter((w) => haystack.includes(w)).length / words.length
      if (score > bestScore) {
        bestScore = score
        bestMatch = uc
      }
    }

    if (bestMatch && bestScore >= 0.4) {
      return {
        found: true,
        matchedId: bestMatch.id,
        confidence: bestScore,
        reason: `Keyword match score: ${Math.round(bestScore * 100)}% — "${bestMatch.title}"`,
      }
    }

    return { found: false, reason: `No use case matched intent (best score: ${Math.round(bestScore * 100)}%)` }
  },

  /**
   * Check if an endpoint (method + path) already exists in the DCM.
   * This is a real implementation — exact string match.
   */
  async queryEndpoint(method: string, path: string, projectRoot?: string): Promise<FunctionQueryResult> {
    const dcm = await dcmEngine.readDCM(projectRoot)
    const endpoint = `${method.toUpperCase()} ${path}`

    for (const uc of dcm.use_cases) {
      for (const fn of uc.functions) {
        if (fn.endpoint === endpoint) {
          return {
            found: true,
            functionName: fn.name,
            useCaseId: uc.id,
            file: fn.file,
            line: fn.line,
            endpoint: fn.endpoint ?? undefined,
          }
        }
      }
    }
    return { found: false, reason: `No endpoint "${endpoint}" found in DCM` }
  },
}
