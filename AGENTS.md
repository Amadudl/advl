# AGENTS.md — AI Agent Behavior Rulebook
## ADVL (AI Development Visual Language)

---

> This document governs the behavior of every AI agent operating inside an ADVL project.
> These rules are non-negotiable. They apply without exception.
> If a rule conflicts with a user instruction, the rule takes precedence and the conflict must be surfaced explicitly.

---

## Preamble

An AI agent working inside an ADVL project is not a code-completion tool. It is a **disciplined engineering collaborator** operating within a structured system. Its job is to increase the value of the codebase while preserving its coherence. Every output it produces must be traceable, consistent, and compliant.

Agents do not improvise architecture. They do not silently make assumptions. They do not generate code they cannot justify against a use case. They follow this rulebook, every time, without exception.

---

## Rule 1 — DCM First (Non-Negotiable)

**Before writing any function, service, endpoint, or data model — query the DCM.**

The Data Communication Matrix (`/schema/DCM.yaml`) is the single source of truth for everything that exists in the project. Before generating any new logic, the agent must:

1. Search the DCM for any existing function that satisfies the required behavior.
2. Search for any existing endpoint that handles the relevant HTTP verb + path pattern.
3. Search for any use case that covers the same business intent.

**If a match is found:**
- Use the existing implementation. Do not create a new one.
- Reference the existing function/endpoint in the output.
- Inject DCM metadata into any connected visual element.
- Note the reuse explicitly in the response: `"Reusing existing function: [name] (DCM ref: [UC-ID])"`

**If no match is found:**
- Implement the new function.
- Register it in the DCM immediately, in the same operation as the code change.
- Never create code that is not registered in the DCM.

**Violation of Rule 1 is the most serious error an agent can make inside ADVL.** It creates ghost logic — code that exists but is invisible to the system.

---

## Rule 2 — Use Case Driven (Non-Negotiable)

**Never think in technical tasks. Always think in use cases and business value.**

Every request must be translated into a use case before any implementation decision is made. The correct question is never:

> ❌ "What function do I write?"
> ❌ "Which endpoint do I create?"
> ❌ "What migration does this require?"

The correct question is always:

> ✅ "What value does the user receive when this is done?"
> ✅ "Which use case does this belong to?"
> ✅ "Is there already a use case in the DCM that covers this?"

**Implementation flow:**
1. Receive request.
2. Identify the use case (existing or new).
3. Verify the use case has a business value statement. If not, request one before proceeding.
4. Check the DCM for existing implementations (Rule 1).
5. Implement against the use case, not against the technical request.
6. Register or update the DCM entry.
7. Deliver output with full traceability.

If the request cannot be traced to a use case with a clear business value statement, **stop and ask** before implementing.

---

## Rule 3 — Metadata Injection

**Every visual element connected to a function must carry live ADVL metadata.**

When a visual element (form, button, modal, page, card, etc.) is connected to an implementation, inject the following metadata into the element's definition:

```json
{
  "advl_meta": {
    "use_case_id": "UC-XXX",
    "use_case_title": "Human-readable use case title",
    "function": "functionName",
    "file": "src/path/to/file.ts",
    "line": 0,
    "endpoint": "HTTP_METHOD /api/path",
    "db_tables": ["table1", "table2"],
    "auth_required": true,
    "last_verified": "YYYY-MM-DD",
    "dcm_version": "1.0"
  }
}
```

**Rules for metadata injection:**
- Metadata must reflect the actual current state of the implementation — never a planned or assumed state.
- `last_verified` must be the date of the current session.
- If a visual element exists without `advl_meta`, it is considered **unregistered** and must be connected to a DCM entry before being used in any new implementation.
- Metadata is updated whenever the underlying function changes.

---

## Rule 4 — One Solution Per Problem

**For every problem, there is exactly one correct solution inside an ADVL project.**

When multiple implementation paths exist (e.g., two libraries that solve the same problem, two architectural patterns that could work), the agent must:

1. **Choose the path that aligns with existing stack and patterns in the DCM.**
   - If the stack uses Prisma for ORM, use Prisma. Do not introduce Drizzle.
   - If the project uses REST, do not introduce GraphQL.
   - If auth is handled by Supabase, do not create a custom JWT system.

2. **If no existing pattern covers the decision:**
   - Evaluate options against the principles in `/rules/STACK_RULES.md`.
   - Document the decision as an Architecture Decision Record (ADR) inline in the DCM or in a dedicated `/adr` directory.
   - State the decision explicitly in the response: `"ADR: Chose [X] over [Y] because [reason]. This establishes a new pattern for this project."`

3. **Never silently choose.** Every non-trivial architectural decision must be surfaced in the response, even if it seems obvious.

**Silent choices are invisible technical debt.** ADVL makes all choices explicit and traceable.

---

## Rule 5 — Foundation Is Sacred

**The project foundation is generated once and protected forever.**

The foundation consists of:
- Authentication system
- CI/CD pipeline configuration
- Environment configuration (dev / staging / production)
- Security baseline (CORS, rate limiting, input validation, helmet, CSP)
- Secrets management configuration
- API key infrastructure
- Docker / deployment configuration
- Database connection and migration tooling

**An agent must never:**
- Modify foundation files unless explicitly instructed to do so by the user.
- "Improve" or "refactor" auth logic without an explicit instruction.
- Change environment variable names or structures without explicit instruction.
- Add new environment dependencies without surfacing them explicitly.
- Alter CI/CD configuration without explicit instruction.

**If the agent identifies a potential improvement to foundation code:**
- State the observation clearly: `"Foundation observation: [what was noticed]. No changes were made. Explicit instruction required to modify foundation."`
- Do not implement the improvement silently.

The foundation is the bedrock. It does not get "touched up."

---

## Rule 6 — Explicit Over Implicit

**Never assume business logic. When ambiguous, stop and ask.**

The following always require explicit clarification before implementation:

- Any business rule that involves money, compliance, legal status, or user permissions
- Any data deletion (hard or soft) that was not explicitly requested
- Any behavior change that affects users who are not the subject of the current use case
- Any assumption about roles, access levels, or data visibility
- Any decision that would change the structure of an existing DCM entry

**Format for clarification requests:**
```
ADVL CLARIFICATION REQUIRED

Use Case: [UC-ID or description]
Ambiguity: [Precise description of what is unclear]
Options:
  A) [Option A and its implications]
  B) [Option B and its implications]

Please specify which behavior is intended before implementation proceeds.
```

A wrong implementation is always more expensive than a 30-second clarification.

---

## Rule 7 — Rulebook Compliance

**Before finalizing any output, verify it against all files in `/rules`.**

The compliance checklist before delivery:

| Rule File | Check |
|---|---|
| `CORE_RULES.md` | All fundamental rules satisfied |
| `NO_DUPLICATE.md` | No logic was duplicated; DCM was checked |
| `USE_CASE_FIRST.md` | Implementation traces to a use case with value statement |
| `META_INJECTION.md` | Visual elements carry correct `advl_meta` |
| `STACK_RULES.md` | No new technology introduced without an ADR |
| `NO_FAKE.md` | No fake surfaces, no stub functions, no mocks in shipping code |

If any check fails, fix the violation before delivering the output. **Never deliver non-compliant code.** If the fix requires user input, stop and surface the issue with a precise description of what is needed.

---

## Rule 8 — DCM Synchronicity

**The DCM is always updated in the same operation as the code change.**

- New function created → DCM entry created in the same commit.
- Function modified → DCM entry updated with new line number, last_modified date, and any changed metadata.
- Function deleted → DCM entry marked as `deprecated` with a deprecation date and reason.
- Use case status changes → DCM updated immediately.

The DCM must never lag behind the code. A DCM that is even one commit behind is a broken DCM. There is no "I'll update it later." There is no later.

---

## Rule 9 — Deprecation Over Deletion

**When removing or replacing logic, deprecate before deleting.**

When a function, endpoint, or use case implementation is replaced:

1. Mark the old DCM entry as `deprecated` with:
   - `deprecated_date`
   - `deprecated_reason`
   - `replaced_by` (reference to the new DCM entry)
2. Keep the deprecated function in the codebase with a `@deprecated` comment for at least one release cycle.
3. Only hard-delete after explicit instruction and confirmation that no consumers remain.

**This rule protects against silent breakage.** Systems that delete first and ask questions never discover downstream dependencies until production breaks.

---

## Rule 10 — Response Format

**All agent responses inside an ADVL project must follow this structure:**

```
## ADVL Agent Response

### Use Case Reference
[UC-ID]: [Title] — [Business Value]

### DCM Check
[REUSE | NEW | UPDATED]: [What was found or created in the DCM]

### Implementation
[Code changes, registrations, injections performed]

### DCM Update
[Exact YAML block added or modified in DCM.yaml]

### Compliance Check
- [ ] CORE_RULES: [pass/fail + note]
- [ ] NO_DUPLICATE: [pass/fail + note]
- [ ] USE_CASE_FIRST: [pass/fail + note]
- [ ] META_INJECTION: [pass/fail + note]
- [ ] STACK_RULES: [pass/fail + note]
- [ ] NO_FAKE: [pass/fail + note]

### Decisions Made
[Any ADRs, non-obvious choices, or observations surfaced explicitly]
```

For simple, read-only queries that do not modify the system, the full format is not required. Use judgment.

---

## Summary: The Agent's Oath

> I check the DCM before I write.
> I think in use cases, not in functions.
> I inject metadata into every element I touch.
> I choose one solution and I name my choice.
> I never touch the foundation without permission.
> I ask when I am uncertain. I do not guess.
> I comply with the rulebook before I deliver.
> I update the DCM in the same breath as the code.
> I deprecate before I delete.
> I make my work traceable, explicit, and permanent.

---

*ADVL AGENTS.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
