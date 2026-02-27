# CORE_RULES.md — Fundamental Rules
## ADVL (AI Development Visual Language)

---

> These are the foundational rules of the ADVL system. Every agent, every session, every output must comply with all of them without exception. No rule may be suspended, overridden, or "temporarily" bypassed for convenience. If a rule creates friction, that friction is intentional — it is the system protecting itself.

---

## CR-01 — The DCM Is the Ground Truth

The Data Communication Matrix (`/schema/DCM.yaml`) is the authoritative record of everything that exists in the project. It supersedes:

- Any agent's internal knowledge
- Any conversation history
- Any code file in isolation
- Any comment or inline documentation

If the DCM and the code contradict each other, the discrepancy must be surfaced immediately. The agent must not proceed until the conflict is resolved. The DCM is updated to match reality — never the other way around.

**Enforcement:** Every read-write session begins with a DCM query. No exceptions.

---

## CR-02 — Use Cases Are the Unit of Work

Work is expressed in use cases. Use cases express business value. A use case without a business value statement is incomplete and cannot be implemented.

The minimum valid use case definition:

```yaml
- id: "UC-XXX"
  title: "[Who] [does what]"
  value: "[What business outcome results]"
  status: planned
```

Technical tasks (functions, endpoints, migrations, queries) are derived from use cases. They are never the primary unit. If someone requests a "function" or an "endpoint" without a use case context, the agent must identify or create the use case first.

**Enforcement:** No function is written without a traceable use case in the DCM.

---

## CR-03 — No Ghost Logic

Ghost logic is code that exists in the codebase but is not registered in the DCM. Ghost logic is invisible to the system. It cannot be reused, referenced, or maintained. It will be duplicated.

Ghost logic is created when:
- A function is written without a DCM entry
- A DCM entry exists but is outdated (wrong file, wrong line, wrong function name)
- A function is deleted without deprecating its DCM entry

**Prevention:** Every function creation, modification, and deletion is accompanied by a DCM update in the same operation.

**Detection:** The `validate-rules.js` tool scans for ghost logic by comparing DCM entries against actual codebase symbols. Run it before every commit.

---

## CR-04 — No Duplication

Before any logic is created, the DCM must be searched for existing logic that satisfies the same need. Duplication is defined as:

- Two functions that perform the same transformation on the same data type
- Two endpoints that handle the same HTTP verb and resource
- Two services that manage the same business entity
- Two UI components that render the same data shape with the same interaction pattern

**Enforcement:** See `NO_DUPLICATE.md` for the complete duplication detection protocol.

If a match is found, the existing implementation is used. If the existing implementation is insufficient, it is extended — never forked.

---

## CR-05 — Foundation Is Immutable Without Explicit Instruction

The project foundation is:

- Authentication system and session management
- CI/CD pipeline configuration
- Environment variable structure and `.env` templates
- Security middleware (CORS, rate limiting, helmet, CSP, input validation)
- Secrets management and API key infrastructure
- Docker and deployment configuration
- Database connection pooling and migration tooling

An agent operating on a project may observe, read, and reference foundation files. It may **never** modify them without a user instruction that explicitly names the foundation component to be changed.

**If improvement is noticed:** Surface it with `"Foundation observation: [description]. No changes made. Explicit instruction required."` Then stop.

---

## CR-06 — Every Decision Is Named

Architectural decisions are not made silently. When an agent makes a non-trivial choice (library selection, pattern selection, data structure design, trade-off resolution), the decision is:

1. Stated explicitly in the response.
2. Recorded as an Architecture Decision Record (ADR) — either inline in the DCM or in `/adr/`.
3. Cross-referenced in the DCM entry for any related use case.

**The format for an ADR:**
```
ADR-XXX: [Decision title]
Date: YYYY-MM-DD
Status: accepted
Context: [Why a decision was needed]
Decision: [What was decided]
Alternatives considered: [What else was evaluated]
Consequences: [What this decision implies going forward]
```

Silence is not a decision. It is a gap.

---

## CR-07 — Compliance Before Delivery

No output is delivered until it has been verified against the full rulebook:

- `CORE_RULES.md` (this file)
- `NO_DUPLICATE.md`
- `USE_CASE_FIRST.md`
- `META_INJECTION.md`
- `STACK_RULES.md`
- `NO_FAKE.md`

Verification is not optional and is not skipped for "simple" tasks. Every output that touches implementation, schema, or visual elements is subject to the full compliance check.

The compliance block in the response format is not decorative. Every checkbox must have an honest status.

---

## CR-08 — Business Logic Is Never Assumed

The agent never infers business rules from technical patterns. The following are always clarified before implementation:

- Who has permission to perform this action?
- What happens when the action fails — hard fail, soft fail, or retry?
- What state changes are permanent vs. reversible?
- What notifications or side effects does the action trigger?
- What happens at the edge cases: empty state, concurrent requests, rate limits?

If a use case description answers these questions, proceed. If it doesn't, ask. The format for asking is defined in `AGENTS.md` Rule 6.

---

## CR-09 — The Codebase Is a System, Not a Collection of Files

Every change must be evaluated in the context of the system:

- How does this change affect existing functions that share data with it?
- Does this change invalidate any existing DCM metadata?
- Does this change require a visual element update?
- Does this change affect any downstream consumers registered in the DCM?

An agent that treats files in isolation will break the system. An agent that treats the codebase as a system will strengthen it.

---

## CR-10 — Versioning and Snapshots

When a major milestone is reached (first production deploy, major feature completion, architectural change), a DCM snapshot is created:

```
/schema/snapshots/DCM_v[X].[Y]_[YYYY-MM-DD].yaml
```

Snapshots are read-only. They are never modified after creation. They serve as rollback references and audit points.

The current DCM version is incremented in the `version` field when:
- A new use case is implemented (minor version bump)
- A use case is deprecated (minor version bump)
- Foundation architecture changes (major version bump)

---

## Summary

| Rule | Core Constraint |
|---|---|
| CR-01 | DCM is ground truth |
| CR-02 | Use cases are the unit of work |
| CR-03 | No ghost logic — DCM always reflects code |
| CR-04 | No duplication — reuse first |
| CR-05 | Foundation is immutable without explicit instruction |
| CR-06 | Every decision is named and recorded |
| CR-07 | Compliance check before every delivery |
| CR-08 | Business logic is never assumed |
| CR-09 | Every change is evaluated as a system change |
| CR-10 | Milestones produce DCM snapshots |

---

*ADVL CORE_RULES.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
