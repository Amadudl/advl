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
   * TODO: Add duplicate detection before registering
   */
  async registerUseCase(useCase: Omit<UseCase, 'id'> & { id?: string }, projectRoot?: string): Promise<UseCase> {
    const dcm = await dcmEngine.readDCM(projectRoot)

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
   * TODO: Implement semantic matching — currently returns not-found.
   * Full implementation will use embeddings or LLM classification.
   */
  async queryFunctions(intent: string, _projectRoot?: string): Promise<FunctionQueryResult> {
    // TODO: Load DCM, iterate functions, score against intent
    // TODO: Return best match if confidence > threshold
    void intent
    return { found: false, reason: 'TODO: Semantic function query not yet implemented' }
  },

  /**
   * Query DCM use cases by intent to detect duplicates.
   * TODO: Implement semantic matching.
   */
  async queryUseCases(intent: string, _projectRoot?: string): Promise<UseCaseQueryResult> {
    // TODO: Load DCM, iterate use_cases, score titles and value statements against intent
    void intent
    return { found: false, reason: 'TODO: Semantic use case query not yet implemented' }
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
