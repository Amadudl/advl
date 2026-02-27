# DCM_SCHEMA.md — Data Communication Matrix Schema Documentation
## ADVL (AI Development Visual Language)

---

> This document is the complete specification for the structure, fields, validation rules, and usage patterns of `DCM.yaml`. Any agent or developer working with the DCM must read this document first.

---

## Overview

The Data Communication Matrix (DCM) is a structured YAML file that serves as the permanent, machine-readable memory of an ADVL project. It records every use case, function, endpoint, architectural decision, and technology choice that exists in the project.

The DCM has six top-level sections:

| Section | Purpose |
|---|---|
| `version` | DCM schema version |
| `project` | Project metadata |
| `stack` | Declared technology stack |
| `adrs` | Architecture Decision Records |
| `use_cases` | All use cases and their implementations |
| `deprecated` | Deprecated entries preserved for audit |
| `snapshots` | Index of versioned DCM snapshots |

---

## Top-Level Metadata Fields

```yaml
version: "1.0"
project: "project-name"
description: "One-line description of the project"
author: "Full Name / Organization"
created: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
```

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | string | Yes | DCM schema version. Increment minor on each UC implementation, major on architectural change. |
| `project` | string | Yes | Unique project identifier. Slug format, no spaces. |
| `description` | string | Yes | One-line human-readable description of the project. |
| `author` | string | Yes | Primary author or organization. |
| `created` | date | Yes | ISO date when the DCM was initialized. |
| `last_updated` | date | Yes | ISO date of the most recent change to the DCM. Updated on every write operation. |

---

## Stack Declaration

The `stack` section records every declared technology choice for the project. It is populated during project initialization and updated only via ADR.

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

| Field | Type | Required | Description |
|---|---|---|---|
| `runtime` | string | Yes | Runtime environment and version |
| `framework` | string | Yes | Primary application framework |
| `language` | string | Yes | Primary programming language and version |
| `orm` | string | Conditional | ORM or database access layer. `null` if not applicable. |
| `database` | string | Yes | Database engine and hosting details |
| `auth` | string | Yes | Authentication system |
| `api_style` | string | Yes | `REST`, `GraphQL`, `tRPC`, `gRPC`, or combination |
| `styling` | string | Conditional | CSS/styling approach. `null` for non-UI projects. |
| `ui_components` | string | Conditional | Component library. `null` if none. |
| `state_management` | string | Conditional | Client state management. `null` for API-only projects. |
| `email` | string | Conditional | Email delivery service. `null` if not required. |
| `file_storage` | string | Conditional | File/blob storage. `null` if not required. |
| `deployment` | string | Yes | Deployment target and tooling |
| `ci_cd` | string | Yes | CI/CD platform |
| `testing` | string | Yes | Testing frameworks (unit + e2e) |
| `package_manager` | string | Yes | Package manager (`pnpm`, `npm`, `yarn`, `uv`, etc.) |
| `monorepo` | boolean | Yes | Whether the project uses a monorepo structure |

**Validation rules:**
- No field may be changed without creating an ADR entry first.
- Adding a new field requires an ADR documenting the new technical concern.
- `null` values are acceptable only for fields marked `Conditional`.

---

## Architecture Decision Records (ADRs)

```yaml
adrs:
  - id: "ADR-001"
    date: "YYYY-MM-DD"
    status: "accepted"
    title: "Use Resend for transactional email"
    context: "Project requires email verification and notification capabilities."
    decision: "Resend was chosen for its developer-friendly API, TypeScript-first design, and generous free tier."
    alternatives_considered:
      - name: "SendGrid"
        reason_rejected: "Complex API, higher pricing, legacy design patterns"
      - name: "Postmark"
        reason_rejected: "Good alternative but more expensive at scale; Resend has better DX"
    consequences:
      - "All transactional email goes through Resend API"
      - "Email templates are managed as React components via react-email"
      - "RESEND_API_KEY must be added to all environment configurations"
    stack_update: "email: Resend"
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Sequential ID: `ADR-001`, `ADR-002`, etc. |
| `date` | date | Yes | ISO date when the decision was made |
| `status` | enum | Yes | `proposed` \| `accepted` \| `superseded` \| `deprecated` |
| `title` | string | Yes | Short description of the decision |
| `context` | string | Yes | Why this decision was needed |
| `decision` | string | Yes | What was decided |
| `alternatives_considered` | array | Yes | At least one alternative must be documented |
| `alternatives_considered[].name` | string | Yes | Name of the alternative |
| `alternatives_considered[].reason_rejected` | string | Yes | Why it was not chosen |
| `consequences` | array | Yes | What this decision implies going forward |
| `stack_update` | string | Conditional | Which `stack` field this updates, if any. `null` if no stack change. |

---

## Use Cases

The `use_cases` array is the primary section of the DCM. Each entry represents one complete use case with its full implementation record.

```yaml
use_cases:
  - id: "UC-001"
    title: "Customer updates their shipping address"
    value: "Customer data stays accurate, reducing failed deliveries and billing errors"
    status: "implemented"
    visual_element_id: "VE-AddressForm-Edit"
    actor: "Authenticated customer"
    preconditions:
      - "User is authenticated"
      - "User owns the account being modified"
    postconditions:
      - "Address record is updated in the database"
      - "Audit log entry is created"
      - "User receives confirmation notification"
    functions:
      - name: "updateUserAddress"
        file: "src/api/user.ts"
        line: 142
        endpoint: "PATCH /api/users/:id/address"
        db_tables:
          - "users"
          - "addresses"
        auth_required: true
        roles_required: []
        last_modified: "2026-02-25"
    rules_applied:
      - NO_DUPLICATE
      - USE_CASE_FIRST
      - NO_FAKE
    deprecated_date: null
    deprecated_reason: null
    replaced_by: null
```

### Use Case Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Sequential ID: `UC-001`, `UC-002`, etc. Never reused, even after deprecation. |
| `title` | string | Yes | `[Actor] [action]` format. One action per use case. |
| `value` | string | Yes | Business value in plain language. No technical language. |
| `status` | enum | Yes | `planned` \| `in_progress` \| `implemented` \| `deprecated` |
| `visual_element_id` | string/null | Yes | `VE-[Entity]-[Action]` ID, `null` for system UCs, `"pending"` if UI not yet designed |
| `actor` | string | Yes | Specific actor performing the action (not generic "user") |
| `preconditions` | array | Yes | What must be true before the action can be performed |
| `postconditions` | array | Yes | What is guaranteed to be true after successful completion |
| `functions` | array | Yes | All functions that implement this use case. Empty array `[]` for `planned` status. |
| `rules_applied` | array | Yes | Which ADVL rules were applied during implementation |
| `deprecated_date` | date/null | Conditional | Required when `status: deprecated` |
| `deprecated_reason` | string/null | Conditional | Required when `status: deprecated` |
| `replaced_by` | string/null | Conditional | UC-ID of the replacement use case, when applicable |

### Function Record Field Reference

Each entry in `functions` represents one function that implements (part of) the use case:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Exact function name as it appears in the codebase |
| `file` | string | Yes | Relative path from project root |
| `line` | integer | Yes | Line number of the function definition |
| `endpoint` | string/null | Yes | `HTTP_METHOD /api/path` format, or `null` for non-endpoint functions |
| `db_tables` | array | Yes | All tables read or written. Empty array if no DB access. |
| `auth_required` | boolean | Yes | Whether the function/endpoint requires authentication |
| `roles_required` | array | Yes | Specific roles required. Empty array `[]` if any authenticated user can access. |
| `last_modified` | date | Yes | ISO date of last modification to this function |

### Use Case Status Lifecycle

```
planned → in_progress → implemented → deprecated
```

- **`planned`**: DCM entry exists with `id`, `title`, `value`, `actor`. `functions: []`. No implementation.
- **`in_progress`**: Implementation has started. `functions` array may be partially populated.
- **`implemented`**: Full implementation exists. All `functions` fields are complete and accurate.
- **`deprecated`**: Use case is no longer active. `deprecated_date`, `deprecated_reason` are set. Entry moves to `deprecated` section.

**Transition rules:**
- `planned → in_progress`: Agent sets this when beginning implementation.
- `in_progress → implemented`: Agent sets this when implementation is complete and verified.
- `implemented → deprecated`: Requires explicit user instruction + `deprecated_reason`.
- No backward transitions (e.g., `implemented → planned`) without explicit instruction.

---

## Deprecated Entries

Deprecated use cases are moved to the `deprecated` array. They are **never deleted**. They serve as an audit trail and protect against accidental recreation of removed logic.

```yaml
deprecated:
  - id: "UC-003"
    title: "Customer updates their profile photo via URL"
    value: "Users could add a profile photo quickly by pasting a URL"
    status: "deprecated"
    deprecated_date: "2026-03-15"
    deprecated_reason: "Replaced by direct file upload (UC-012) for security and UX reasons"
    replaced_by: "UC-012"
    functions:
      - name: "updateUserAvatarUrl"
        file: "src/api/user.ts"
        line: 198
        endpoint: "PATCH /api/users/:id/avatar-url"
        db_tables: ["users"]
        auth_required: true
        roles_required: []
        last_modified: "2026-03-01"
```

---

## Snapshots Index

The `snapshots` array indexes versioned copies of the DCM stored in `/schema/snapshots/`.

```yaml
snapshots:
  - version: "1.0"
    date: "2026-02-25"
    milestone: "Initial ADVL meta-repository setup"
    file: "schema/snapshots/DCM_v1.0_2026-02-25.yaml"
  - version: "1.1"
    date: "2026-03-01"
    milestone: "First use case implemented"
    file: "schema/snapshots/DCM_v1.1_2026-03-01.yaml"
```

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | string | Yes | DCM version at time of snapshot |
| `date` | date | Yes | ISO date the snapshot was taken |
| `milestone` | string | Yes | Human-readable description of what this milestone represents |
| `file` | string | Yes | Relative path to the snapshot file |

**When to create a snapshot:**
- First production deployment
- Completion of a major feature set
- Before a breaking architectural change
- At explicit user request

Snapshots are read-only after creation.

---

## DCM Version Numbering

The `version` field in the DCM follows semantic versioning adapted for architecture:

| Change Type | Version Bump | Example |
|---|---|---|
| New use case implemented | Minor | `1.0` → `1.1` |
| Use case deprecated | Minor | `1.4` → `1.5` |
| Foundation architecture change | Major | `1.5` → `2.0` |
| Stack declaration update | Major | `1.5` → `2.0` |
| Metadata correction (no logic change) | Patch | `1.5` → `1.5.1` |

---

## Validation Rules Summary

The `validate-rules.js` tool enforces these constraints on every DCM read:

1. All `id` values are unique across `use_cases` and `deprecated`.
2. All `file` references in `functions` point to existing files.
3. All `line` references in `functions` contain a function matching the `name` field.
4. All `visual_element_id` values follow the `VE-[Entity]-[Action]` pattern (or are `null`/`"pending"`).
5. All `status: implemented` use cases have at least one entry in `functions`.
6. All `status: deprecated` use cases have `deprecated_date` and `deprecated_reason` set.
7. `last_updated` matches the date of the most recent `last_modified` in any function record.
8. No `functions[].name` appears more than once across the entire DCM (duplication check).
9. No `functions[].endpoint` appears more than once across the entire DCM (endpoint duplication check).
10. Stack fields are not `null` for non-conditional fields in an initialized project.

---

## Quick Reference: Common Operations

### Register a New Use Case (planned)
```yaml
- id: "UC-XXX"
  title: "[Actor] [action]"
  value: "[Business value]"
  status: planned
  visual_element_id: null
  actor: "[Actor]"
  preconditions: []
  postconditions: []
  functions: []
  rules_applied: []
  deprecated_date: null
  deprecated_reason: null
  replaced_by: null
```

### Move Use Case to In Progress
```yaml
  status: in_progress
```
(Update `last_updated` at top level.)

### Register a Function Implementation
```yaml
  functions:
    - name: "functionName"
      file: "src/path/to/file.ts"
      line: 0
      endpoint: "HTTP_METHOD /api/path"
      db_tables: ["table1"]
      auth_required: true
      roles_required: []
      last_modified: "YYYY-MM-DD"
  status: implemented
```

### Deprecate a Use Case
```yaml
  status: deprecated
  deprecated_date: "YYYY-MM-DD"
  deprecated_reason: "[Why this was removed or replaced]"
  replaced_by: "UC-XXX"
```
Then move the full entry to the `deprecated` array.

---

*ADVL DCM_SCHEMA.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
