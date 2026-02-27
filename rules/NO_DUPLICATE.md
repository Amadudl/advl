# NO_DUPLICATE.md — Logic Reuse and Duplication Prevention
## ADVL (AI Development Visual Language)

---

> Duplication is not a style choice. It is a system violation. Every duplicate implementation creates a divergence point — two versions of the same truth that will drift apart over time, silently, until they break something. ADVL has zero tolerance for duplication.

---

## What Counts as Duplication

Duplication in ADVL is broader than identical code. It includes any two implementations that serve the same logical purpose, even if their code differs. The following are all considered duplication:

### Function-Level Duplication
- Two functions that perform the same data transformation on the same type
- Two functions that validate the same business rule
- Two functions that format the same output structure
- Two functions that query the same database table with the same intent

### Endpoint-Level Duplication
- Two routes that handle the same HTTP verb + resource path combination
- Two endpoints that perform the same operation on the same entity
- Two controller methods that delegate to the same service layer

### Service-Level Duplication
- Two service classes that manage the lifecycle of the same domain entity
- Two repositories that query the same table with overlapping concerns
- Two auth wrappers that implement the same permission check

### UI Component Duplication
- Two components that render the same data shape with the same interaction pattern
- Two forms that collect the same fields for the same purpose
- Two modals that confirm the same type of destructive action

---

## The Reuse Detection Protocol

Before writing any new logic, the agent must execute the following checks in order:

### Step 1 — DCM Function Search

Search the DCM for functions with matching intent:

```
Query: Does any existing function in the DCM:
  1. Operate on the same entity or data type?
  2. Perform the same transformation or validation?
  3. Return the same output shape?
  4. Serve the same use case or a closely related one?
```

If yes to any of the above → proceed to Step 2 before implementing anything new.

### Step 2 — Endpoint Search

Search the DCM for endpoints with matching surface:

```
Query: Does any existing endpoint in the DCM:
  1. Handle the same HTTP verb?
  2. Operate on the same resource path or resource type?
  3. Accept the same input shape?
  4. Return the same response shape?
```

If yes → the existing endpoint must be used or extended. A new endpoint is never created for the same surface.

### Step 3 — Use Case Overlap Check

Search the DCM for use cases with overlapping business intent:

```
Query: Does any existing use case in the DCM:
  1. Describe the same user action?
  2. Produce the same business outcome?
  3. Touch the same domain entity with the same intent?
```

If yes → the new implementation belongs inside the existing use case, not in a new one.

### Step 4 — Codebase Symbol Search

If the DCM check is inconclusive, perform a direct codebase search:

1. Search for function names using the same domain vocabulary (e.g., `user`, `address`, `payment`, `invoice`)
2. Search for identical or near-identical function signatures
3. Search for route definitions that match the target path pattern
4. Search for service or repository classes that operate on the target entity

If a match is found that is NOT in the DCM → this is ghost logic. Register it in the DCM before proceeding. Do not create a duplicate of ghost logic.

---

## When Reuse Is Found

**Report it explicitly:**
```
Reusing existing function: [functionName] (DCM ref: [UC-ID])
File: [path]:[line]
Endpoint: [HTTP_METHOD /path]
```

**Then:**
1. Use the existing function directly — do not copy it, do not wrap it unnecessarily.
2. If the existing function requires a small modification to satisfy the new use case, extend it. Document the extension in the DCM.
3. If the existing function would need to change significantly, this may represent a new use case. Stop and evaluate before proceeding.
4. Inject the existing function's metadata into the new visual element via `advl_meta`.

---

## When No Reuse Is Found

If the full protocol above produces no match, a new implementation is justified. The agent must:

1. Implement the new function.
2. Register it in the DCM in the same operation — never separately.
3. State explicitly: `"No existing match found in DCM. New function created and registered as [UC-ID]."`
4. Run the `validate-rules.js` tool to confirm no accidental duplication was introduced.

---

## Extension vs. Forking

When an existing function is close but not exact, the correct response is **extension**, not **forking**.

### Extension (Correct)
- Add an optional parameter to an existing function
- Add a new condition to an existing validation chain
- Add a new field to an existing response mapper
- Add a new query filter to an existing repository method

### Forking (Violation)
- Copy the existing function and modify it
- Create a `v2` version of an existing function without deprecating the original
- Create a `getUser` and a `getUserById` that both query the users table
- Create `createOrder` and `createNewOrder` in the same service

**If extension is not possible without significant complexity, surface it:**
```
ADVL CLARIFICATION REQUIRED

Existing function: [name] (UC-ID: [ref])
Conflict: [describe why extension is difficult]
Options:
  A) Extend [functionName] with [proposed change] — impact: [describe]
  B) Create new use case [UC-XXX] — justification: [describe]

Please confirm before implementation proceeds.
```

---

## The Naming Discipline

Duplication is often caused by naming inconsistency. ADVL enforces consistent naming through the DCM:

- **Entity names** are singular (`user`, not `users`) in function names
- **Action verbs** are consistent across the codebase (`create`, `update`, `delete`, `get`, `list`, `send`, `validate`)
- **Function names** follow the pattern: `[verb][Entity][Qualifier?]` (e.g., `getUserById`, `updateUserAddress`, `listActiveInvoices`)
- **Endpoint paths** follow REST conventions: `GET /users/:id`, `PATCH /users/:id/address`

When naming a new function, the agent must verify that no existing DCM entry uses the same name or a name that implies the same intent.

---

## The Cost of Duplication

Every duplicate implementation:

1. **Creates maintenance debt** — two places to change when the business rule changes
2. **Creates drift risk** — the two implementations will diverge over time
3. **Breaks DCM integrity** — the system's memory becomes unreliable
4. **Wastes future agent time** — the next agent will not know which implementation to use
5. **Introduces bugs** — when one copy is fixed, the other is silently left broken

ADVL is designed around the mathematical certainty that duplication always costs more than it saves.

---

## Automated Detection

The `validate-rules.js` tool in `/tools` performs automated duplication detection by:

1. Extracting all function signatures from the codebase
2. Comparing against DCM entries for coverage
3. Flagging functions not in the DCM (ghost logic)
4. Flagging DCM entries with mismatched file/line references
5. Generating a duplication risk report before each commit

This tool is not a replacement for the manual protocol above. It is a safety net that catches what agents miss.

---

*ADVL NO_DUPLICATE.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
