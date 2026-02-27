/**
 * tools/dcm.tool.ts — Agent tool: Query and update the DCM
 *
 * Function-calling tool definition for the LLM agent.
 * The agent uses this tool to check for existing functions before generating code,
 * and to register new use cases after implementation.
 *
 * Tool definitions follow the OpenAI function calling schema.
 * TODO: Wire into llmClient tool_choice parameter
 */
import { dcmEngine } from '../dcm.engine.js'
import type { FunctionQueryResult } from '@advl/shared'

export const dcmToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'query_dcm_functions',
      description: 'Check the DCM for existing functions that match the given intent. Always call this before generating any new function.',
      parameters: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description: 'Plain-language description of what the function should do',
          },
          entity_type: {
            type: 'string',
            description: 'The domain entity being operated on (e.g. user, invoice, order)',
          },
        },
        required: ['intent'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_dcm_endpoint',
      description: 'Check if an HTTP endpoint already exists in the DCM. Always call this before generating any new endpoint.',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          },
          path: {
            type: 'string',
            description: 'The API path (e.g. /api/users/:id/address)',
          },
        },
        required: ['method', 'path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'register_use_case',
      description: 'Register a new use case in the DCM after verifying no duplicate exists.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '[Actor] [action] format' },
          value: { type: 'string', description: 'Business value in plain language' },
          actor: { type: 'string' },
          preconditions: { type: 'array', items: { type: 'string' } },
          postconditions: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'value', 'actor'],
      },
    },
  },
]

/**
 * Execute a DCM tool call from the LLM's function calling response.
 * Returns a JSON string to send back to the LLM as a tool result.
 */
export async function executeDCMTool(
  toolName: string,
  args: Record<string, unknown>,
  projectRoot?: string,
): Promise<string> {
  switch (toolName) {
    case 'query_dcm_functions': {
      const result: FunctionQueryResult = await dcmEngine.queryFunctions(
        args['intent'] as string,
        projectRoot,
      )
      return JSON.stringify(result)
    }

    case 'query_dcm_endpoint': {
      const result: FunctionQueryResult = await dcmEngine.queryEndpoint(
        args['method'] as string,
        args['path'] as string,
        projectRoot,
      )
      return JSON.stringify(result)
    }

    case 'register_use_case': {
      const newUC = await dcmEngine.registerUseCase(
        {
          title: args['title'] as string,
          value: args['value'] as string,
          actor: args['actor'] as string,
          status: 'planned',
          visual_element_id: null,
          preconditions: (args['preconditions'] as string[]) ?? [],
          postconditions: (args['postconditions'] as string[]) ?? [],
          functions: [],
          rules_applied: ['USE_CASE_FIRST', 'NO_DUPLICATE'],
          deprecated_date: null,
          deprecated_reason: null,
          replaced_by: null,
        },
        projectRoot,
      )
      return JSON.stringify({ success: true, id: newUC.id, title: newUC.title })
    }

    default:
      return JSON.stringify({ error: `Unknown DCM tool: ${toolName}` })
  }
}
