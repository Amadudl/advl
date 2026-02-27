# STACK_RULES.md — Technology Decision Framework
## ADVL (AI Development Visual Language)

---

> Technology decisions are not preferences. Inside an ADVL project, every technology choice is a commitment that affects every future implementation. Once a pattern is established, it is the pattern. Deviation requires justification and creates an ADR. Inconsistency is never acceptable.

---

## The Core Principle: One Stack Per Concern

Every technical concern in a project has exactly one solution. Once that solution is chosen and registered, it is used for every subsequent implementation of that concern. No alternatives are introduced without an explicit ADR and user approval.

| Concern | Example Commitment | What This Prevents |
|---|---|---|
| ORM | Prisma | Drizzle, raw SQL, TypeORM alongside Prisma |
| Auth | Supabase Auth | Custom JWT + Supabase Auth in the same project |
| API style | REST | GraphQL endpoint added "just for this feature" |
| State management | Zustand | Redux introduced for a single complex page |
| Styling | Tailwind CSS | Styled-components added for one component |
| Email | Resend | SendGrid added "because it has a nicer API" |

---

## Stack Declaration

When a project is initialized, the stack is declared in the DCM under a `stack` key:

```yaml
stack:
  runtime: "Node.js 22"
  framework: "Next.js 15"
  language: "TypeScript 5"
  orm: "Prisma"
  database: "PostgreSQL 16 (Supabase managed)"
  auth: "Supabase Auth"
  api_style: "REST"
  styling: "Tailwind CSS 4"
  ui_components: "shadcn/ui"
  state_management: "Zustand"
  email: "Resend"
  file_storage: "Supabase Storage"
  deployment: "Vercel"
  ci_cd: "GitHub Actions"
  testing: "Vitest + Playwright"
  package_manager: "pnpm"
  monorepo: false
```

Once declared, this stack definition is the law of the project. Every agent reads it before making any technology decision.

---

## Introducing New Technology

New technology may only be introduced when:

1. The existing stack has no solution for the required concern.
2. The user has explicitly requested the new technology.
3. An ADR has been written and accepted.

### The ADR Requirement

Before adding any new dependency that represents a new technical concern, the agent must produce an Architecture Decision Record:

```yaml
adr:
  id: "ADR-001"
  date: "YYYY-MM-DD"
  status: "accepted"
  title: "[What technology and for what purpose]"
  context: "[Why this decision was needed]"
  decision: "[What was chosen]"
  alternatives_considered:
    - name: "[Alternative 1]"
      reason_rejected: "[Why it was not chosen]"
    - name: "[Alternative 2]"
      reason_rejected: "[Why it was not chosen]"
  consequences:
    - "[Implication 1 going forward]"
    - "[Implication 2 going forward]"
  stack_update: "[Which field in the stack declaration this updates or adds]"
```

The ADR is stored in `/adr/ADR-XXX.md` and referenced in the DCM `adrs` list.

---

## Stack Template Defaults

When a project is initialized from a template, the following defaults apply unless overridden during the target selection phase:

### web-nextjs (Default Web Stack)
```
Runtime:          Node.js 22
Framework:        Next.js 15 (App Router)
Language:         TypeScript 5
ORM:              Prisma
Database:         PostgreSQL (Supabase managed)
Auth:             Supabase Auth
Styling:          Tailwind CSS 4
Components:       shadcn/ui
State:            Zustand (client state), React Query (server state)
Email:            Resend
Storage:          Supabase Storage
Deployment:       Vercel
CI/CD:            GitHub Actions
Testing:          Vitest (unit), Playwright (e2e)
Package Manager:  pnpm
```

### web-fastapi-react
```
Runtime:          Python 3.12
Framework:        FastAPI
Language:         Python (typed with Pydantic)
ORM:              SQLAlchemy 2.0 (async)
Database:         PostgreSQL 16
Auth:             Custom JWT (FastAPI)
Frontend:         React 18 + Vite
Styling:          Tailwind CSS 4
State:            React Query + Zustand
Deployment:       Docker + cloud provider of choice
CI/CD:            GitHub Actions
Testing:          Pytest (backend), Vitest + Playwright (frontend)
Package Manager:  uv (Python), pnpm (frontend)
```

### mobile-expo
```
Runtime:          Node.js 22
Framework:        Expo SDK 52 (React Native)
Language:         TypeScript 5
ORM:              None (API-driven, no local DB by default)
Auth:             Supabase Auth
State:            Zustand + React Query
API Client:       Axios + custom typed client
Deployment:       EAS Build + EAS Submit
CI/CD:            GitHub Actions + EAS
Testing:          Jest + Detox
Package Manager:  pnpm
```

### fullstack-cloud
```
Runtime:          Node.js 22
Framework:        Next.js 15 (App Router) + separate API service
Language:         TypeScript 5
ORM:              Prisma
Database:         PostgreSQL 16 (cloud managed)
Auth:             Supabase Auth or Auth0 (declared at init)
Queue:            BullMQ (Redis-backed)
Cache:            Redis (Upstash)
Email:            Resend
Storage:          S3-compatible (cloud provider)
Deployment:       Docker + Kubernetes or cloud-native equivalent
CI/CD:            GitHub Actions
Testing:          Vitest + Playwright
Package Manager:  pnpm (monorepo with Turborepo)
```

---

## Prohibited Patterns

The following patterns are explicitly prohibited inside ADVL projects regardless of stack:

### Never Mix ORM and Raw SQL for the Same Entity
If Prisma manages the `users` table, all queries against `users` go through Prisma. Raw SQL is not used as a "shortcut" for complex queries. Use Prisma's `$queryRaw` with typed results if necessary.

### Never Create Multiple Auth Systems
One auth system per project. If Supabase Auth is declared, no custom JWT system is introduced. If a custom JWT system is declared, Supabase Auth is not added alongside it.

### Never Use `any` in TypeScript Implementations
ADVL projects use strict TypeScript. `any` is not acceptable. If a type is genuinely unknown, use `unknown` and narrow it. If a library has poor types, create a local type wrapper.

### Never Hardcode Secrets
No API keys, database credentials, tokens, or secrets are hardcoded in application code. All secrets are accessed via environment variables. All environment variables are documented in `.env.example` with non-sensitive placeholder values.

### Never Skip Migration Tooling
Database schema changes are always made through the project's declared migration tooling (Prisma Migrate, Alembic, etc.). Direct database modifications are never made by an agent without generating a corresponding migration file.

### Never Create Parallel Routing Systems
If the project uses Next.js App Router, all routes are in the `app/` directory. Pages Router routes are not introduced. A single routing paradigm is used throughout.

---

## Dependency Governance

### Adding a New Dependency
Before adding any new package:
1. Check whether the existing stack already covers the need.
2. Check whether a different existing package in the project already covers the need.
3. If a new package is justified, verify it is actively maintained (last release within 12 months, open issues response rate reasonable).
4. Add it to the stack declaration in the DCM.
5. Document it in an ADR if it represents a new technical concern.

### Upgrading Dependencies
- Minor and patch upgrades may be applied without an ADR.
- Major version upgrades require an ADR documenting breaking changes and migration steps.
- Foundation dependencies (auth, ORM, framework) require explicit user instruction before upgrading.

### Removing Dependencies
- A dependency is only removed when all uses have been eliminated from the codebase.
- The DCM is updated to remove the dependency from the stack declaration.
- The removal is documented in an ADR if the dependency was a declared stack choice.

---

## Language and Style Standards

### TypeScript
- `strict: true` always
- No `any` (use `unknown` + narrowing)
- Interfaces for public API shapes, types for internal compositions
- Zod for runtime validation of external inputs
- All async functions return typed promises
- No `eslint-disable` without a comment explaining why

### Python (FastAPI stack)
- Python 3.12+ features encouraged
- Pydantic v2 for all request/response models
- Type hints required on all function signatures
- Async handlers throughout FastAPI routes
- No bare `except:` — always catch specific exception types

### File Naming
- **TypeScript:** `camelCase.ts` for utilities, `PascalCase.tsx` for React components
- **Python:** `snake_case.py` for all files
- **API route files:** named by resource (`users.ts`, `invoices.ts`, `payments.ts`)
- **Test files:** `[filename].test.ts` or `[filename].spec.ts` co-located with source

---

## Summary: The Technology Decision Flowchart

```
New technology need identified
        ↓
Is this concern already covered by the declared stack?
  YES → Use the existing stack solution. No deviation.
  NO  ↓
Is there an existing package in the project that covers this?
  YES → Use it. No new dependency needed.
  NO  ↓
Has the user explicitly requested this new technology?
  NO  → Surface the need, propose options, wait for decision.
  YES ↓
Write an ADR. Add to stack declaration in DCM. Proceed.
```

---

*ADVL STACK_RULES.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
