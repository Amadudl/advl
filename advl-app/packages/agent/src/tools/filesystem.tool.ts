/**
 * tools/filesystem.tool.ts — Agent tool: Read/write project files
 *
 * Gives the LLM agent controlled access to the project filesystem.
 * Only operates within the project root — no path traversal outside it.
 * Path traversal is prevented by resolving and verifying the absolute path
 * starts with the project root before any read/write operation.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

export const filesystemToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read a file from the project. Path must be relative to the project root.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path from project root (e.g. src/api/user.ts)' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file in the project. Creates the file if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path from project root' },
          content: { type: 'string', description: 'Full file content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_directory',
      description: 'List files and directories at a path within the project.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path from project root' },
        },
        required: ['path'],
      },
    },
  },
]

function resolveAndValidatePath(projectRoot: string, relativePath: string): string | null {
  const resolved = path.resolve(path.join(projectRoot, relativePath))
  const root = path.resolve(projectRoot)
  return resolved.startsWith(root + path.sep) || resolved === root ? resolved : null
}

export async function executeFilesystemTool(
  toolName: string,
  args: Record<string, string>,
  projectRoot: string,
): Promise<string> {
  const safePath = resolveAndValidatePath(projectRoot, args['path'] ?? '')
  if (!safePath) {
    return JSON.stringify({ success: false, error: 'Path traversal outside project root is not permitted' })
  }

  switch (toolName) {
    case 'read_file': {
      try {
        const content = await fs.readFile(safePath, 'utf-8')
        return JSON.stringify({ success: true, content })
      } catch (err) {
        return JSON.stringify({ success: false, error: String(err) })
      }
    }

    case 'write_file': {
      try {
        await fs.mkdir(path.dirname(safePath), { recursive: true })
        await fs.writeFile(safePath, args['content'] ?? '', 'utf-8')
        return JSON.stringify({ success: true, path: args['path'] })
      } catch (err) {
        return JSON.stringify({ success: false, error: String(err) })
      }
    }

    case 'list_directory': {
      try {
        const entries = await fs.readdir(safePath, { withFileTypes: true })
        const result = entries.map((e) => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' }))
        return JSON.stringify({ success: true, entries: result })
      } catch (err) {
        return JSON.stringify({ success: false, error: String(err) })
      }
    }

    default:
      return JSON.stringify({ error: `Unknown filesystem tool: ${toolName}` })
  }
}
