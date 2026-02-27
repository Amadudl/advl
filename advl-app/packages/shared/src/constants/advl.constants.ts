/**
 * advl.constants.ts — Application-wide ADVL constants
 *
 * Version identifiers, schema versions, and other system-level constants.
 * These values are read by multiple packages — define once, import everywhere.
 */

export const ADVL_VERSION = '0.1.0'

export const STACK_TEMPLATES = {
  'web-nextjs': {
    label: 'Web — Next.js',
    description: 'Next.js 15 + Tailwind CSS + Supabase + Vercel',
    stack: {
      runtime: 'Node.js 20',
      framework: 'Next.js 15',
      language: 'TypeScript',
      orm: 'Prisma',
      database: 'PostgreSQL (Supabase)',
      auth: 'Supabase Auth',
      api_style: 'REST',
      styling: 'Tailwind CSS 4',
      ui_components: 'shadcn/ui',
      state_management: 'Zustand',
      email: null,
      file_storage: 'Supabase Storage',
      deployment: 'Vercel',
      ci_cd: 'GitHub Actions',
      testing: 'Vitest + Playwright',
      package_manager: 'pnpm',
      monorepo: false,
    },
  },
  'web-fastapi-react': {
    label: 'Web — FastAPI + React',
    description: 'FastAPI + React + PostgreSQL + Docker',
    stack: {
      runtime: 'Python 3.12 + Node.js 20',
      framework: 'FastAPI + React 18',
      language: 'Python + TypeScript',
      orm: 'SQLAlchemy + Alembic',
      database: 'PostgreSQL',
      auth: 'JWT (python-jose)',
      api_style: 'REST',
      styling: 'Tailwind CSS',
      ui_components: 'shadcn/ui',
      state_management: 'Zustand',
      email: null,
      file_storage: null,
      deployment: 'Docker + Compose',
      ci_cd: 'GitHub Actions',
      testing: 'Pytest + Vitest',
      package_manager: 'pnpm + pip',
      monorepo: false,
    },
  },
  'mobile-expo': {
    label: 'Mobile — Expo',
    description: 'Expo SDK 52 + EAS Build + Supabase',
    stack: {
      runtime: 'Node.js 20 (Hermes)',
      framework: 'Expo SDK 52 (React Native)',
      language: 'TypeScript',
      orm: null,
      database: 'PostgreSQL (Supabase)',
      auth: 'Supabase Auth',
      api_style: 'REST',
      styling: 'NativeWind',
      ui_components: null,
      state_management: 'Zustand',
      email: null,
      file_storage: 'Supabase Storage',
      deployment: 'EAS Build + Submit',
      ci_cd: 'EAS CI',
      testing: 'Jest + Detox',
      package_manager: 'pnpm',
      monorepo: false,
    },
  },
  'fullstack-cloud': {
    label: 'Fullstack — Cloud Monorepo',
    description: 'Turborepo + Kubernetes + BullMQ + Redis',
    stack: {
      runtime: 'Node.js 20',
      framework: 'Next.js 15 + Fastify',
      language: 'TypeScript',
      orm: 'Prisma',
      database: 'PostgreSQL + Redis',
      auth: 'Auth.js v5',
      api_style: 'REST + tRPC',
      styling: 'Tailwind CSS',
      ui_components: 'shadcn/ui',
      state_management: 'Zustand + React Query',
      email: 'Resend',
      file_storage: 'AWS S3',
      deployment: 'Kubernetes (GKE)',
      ci_cd: 'GitHub Actions',
      testing: 'Vitest + Playwright',
      package_manager: 'pnpm',
      monorepo: true,
    },
  },
} as const

export type StackTemplateId = keyof typeof STACK_TEMPLATES

export const DCM_SCHEMA_VERSION = '1.0'

export const DCM_FILENAME = 'DCM.yaml'

export const RULES_DIR = 'rules'

export const SCHEMA_DIR = 'schema'

export const RULE_FILES = [
  'CORE_RULES.md',
  'NO_DUPLICATE.md',
  'USE_CASE_FIRST.md',
  'META_INJECTION.md',
  'STACK_RULES.md',
  'NO_FAKE.md',
] as const

export const DEFAULT_AGENT_PORT = 7433

export const DEFAULT_SERVER_PORT = 3000

/** The global injected by Electron's preload.ts to signal desktop mode */
export const ELECTRON_GLOBAL_KEY = '__ADVL_ELECTRON__'

/** IPC channel names used between Electron renderer and main process */
export const IPC_CHANNELS = {
  READ_FILE: 'advl:read-file',
  WRITE_FILE: 'advl:write-file',
  READ_DIR: 'advl:read-dir',
  READ_DIR_RICH: 'advl:read-dir-rich',
  EXISTS: 'advl:exists',
  OPEN_FOLDER_DIALOG: 'advl:open-folder-dialog',
  GET_PROJECT_ROOT: 'advl:get-project-root',
  SET_PROJECT_ROOT: 'advl:set-project-root',
  GET_FILESYSTEM_ROOTS: 'advl:get-filesystem-roots',
  STAT: 'advl:stat',
} as const
