# USE_CASE_FIRST.md — Use Case Driven Development
## ADVL (AI Development Visual Language)

---

> Software is not a collection of functions. It is a collection of outcomes. Every line of code in an ADVL project exists to deliver a specific, nameable business value to a specific, nameable user. If you cannot name the value, you cannot write the code.

---

## The Fundamental Shift

Traditional AI-assisted development starts with the technical task:

> "Create a PATCH endpoint for the user's address."
> "Write a migration to add a `shipping_address` column."
> "Build a form with name, street, city, and postal code fields."

ADVL starts with the use case:

> "A registered customer should be able to update their shipping address so that future orders are delivered to the correct location, reducing failed deliveries and customer service load."

The technical tasks — the endpoint, the migration, the form — are *derived* from the use case. They are never the starting point.

**This is not semantics. It is architecture.** A use case forces clarity about who benefits, what they do, and what the system must preserve. A technical task forces nothing. It is a blank check that any implementation can cash.

---

## Use Case Anatomy

A well-formed use case in ADVL has five components:

### 1. Actor
Who performs the action? Be specific.

- Not: "The user"
- Not: "The system"
- Yes: "A registered customer"
- Yes: "An authenticated admin"
- Yes: "An unauthenticated visitor"

### 2. Action
What does the actor do? One action per use case.

- Not: "Manage their account"
- Not: "Handle the order process"
- Yes: "Updates their shipping address"
- Yes: "Pays a pending invoice"
- Yes: "Cancels an active subscription"

### 3. Business Value
What outcome justifies this use case existing? This must be expressed in business terms — not technical terms.

- Not: "So that the address field in the database is updated"
- Not: "So that the PATCH endpoint is called"
- Yes: "So that future deliveries reach the correct location, reducing failed deliveries and support overhead"
- Yes: "So that revenue is collected and an accounting entry is created automatically"

### 4. Preconditions
What must be true before the actor can perform this action?

- The actor must be authenticated
- The actor must own the resource being modified
- A related resource must exist (e.g., an order must exist before it can be cancelled)
- A business rule must be satisfied (e.g., the invoice must be in "pending" status)

### 5. Postconditions
What is guaranteed to be true after the action succeeds?

- The database record is updated
- A notification is sent
- An audit log entry is created
- A downstream system is notified

---

## The DCM Use Case Format

```yaml
- id: "UC-XXX"
  title: "[Actor] [action]"
  value: "[Business value in plain language]"
  status: planned | in_progress | implemented | deprecated
  visual_element_id: "[VE-identifier or null]"
  actor: "[Who performs the action]"
  preconditions:
    - "[Precondition 1]"
    - "[Precondition 2]"
  postconditions:
    - "[Postcondition 1]"
    - "[Postcondition 2]"
  functions:
    - name: "[functionName]"
      file: "[src/path/to/file.ts]"
      line: 0
      endpoint: "[HTTP_METHOD /api/path]"
      db_tables: ["table1", "table2"]
      auth_required: true
      last_modified: "YYYY-MM-DD"
  rules_applied:
    - NO_DUPLICATE
    - USE_CASE_FIRST
```

---

## Translating Requests Into Use Cases

When a request arrives — from a developer, a product manager, a founder, or a stakeholder — the agent's first job is translation.

### Request Types and Translations

**Technical request:**
> "Add an API endpoint to update the user's email address."

**Translation:**
> "A registered user updates their email address so that account communications and login credentials stay current and accessible."

---

**Feature request:**
> "We need a way for admins to export invoice data."

**Translation:**
> "An authenticated admin exports invoice data to CSV so that the finance team can perform reconciliation without requiring engineering support."

---

**Bug-framed request:**
> "The logout button doesn't work properly."

**Translation:**
> "An authenticated user terminates their session so that their account is protected when they leave a shared device." *(Bug in existing UC — locate the UC, do not create a new one)*

---

**Vague request:**
> "We need better user management."

**Response:**
```
ADVL CLARIFICATION REQUIRED

Use Case: Not yet defined
Ambiguity: "Better user management" covers multiple distinct use cases, each with different value, different actors, and different implementations.
Options:
  A) User updates their own profile information
  B) Admin deactivates a user account
  C) Admin assigns a role to a user
  D) User deletes their own account

Please specify which use case to implement. Each will be registered as a separate DCM entry.
```

---

## Use Case Granularity

**Too broad — split it:**
> "User manages their account" → split into: update email, update password, update address, upload avatar, delete account

**Too narrow — merge it:**
> "User types their first name into a form field" → this is not a use case. It is a UI interaction. The use case is the submission that changes state.

**Correctly scoped:**
> "A registered user updates their shipping address"
> "An admin deactivates a user account"
> "A customer pays a pending invoice"

The test: **Does this use case produce a durable state change or a meaningful outcome?** If yes, it is a use case. If no, it is an interaction detail.

---

## Use Case Status Lifecycle

```
planned → in_progress → implemented → deprecated
```

- **planned**: Use case is defined in the DCM with title and value. No implementation exists.
- **in_progress**: Implementation has started. DCM entry exists with partial function data.
- **implemented**: Full implementation exists, DCM entry is complete with all function metadata.
- **deprecated**: Use case has been superseded or removed. DCM entry is preserved with deprecation metadata.

An agent must never begin implementation on a use case without first moving its status to `in_progress` in the DCM.

---

## Why Business Value Is Non-Negotiable

Every use case must have a value statement. This is not bureaucracy. It is protection.

A value statement:
1. **Prevents scope creep** — if the implementation doesn't deliver the stated value, it is not done
2. **Prevents over-engineering** — if a simpler implementation delivers the same value, the complexity is unjustified
3. **Enables prioritization** — use cases with higher business value ship first
4. **Enables measurement** — you can verify whether the value was actually delivered
5. **Enables deprecation** — if the value is no longer needed, the use case and its code can be removed confidently

A use case without a value statement is a technical task wearing a use case costume. Reject it.

---

## Use Cases and the Visual Layer

Every implemented use case is connected to a visual element in the design tool. The connection is bidirectional:

- The visual element carries `advl_meta` that references the use case ID
- The DCM entry carries the `visual_element_id` that references the canvas element
- When the use case implementation changes, the visual element's metadata is updated
- When the visual element is modified, the DCM is checked for impact

A use case without a visual element is either:
- A background/system use case (acceptable — mark `visual_element_id: null`)
- A use case whose UI has not yet been designed (mark `visual_element_id: pending`)

It is never acceptable for a visual element to exist without a DCM-linked use case.

---

## Summary: The Use Case Checklist

Before implementation begins, verify:

- [ ] The use case has a specific actor (not "user" generically)
- [ ] The use case describes one action (not a workflow)
- [ ] The value statement is in business terms, not technical terms
- [ ] Preconditions are defined
- [ ] Postconditions are defined
- [ ] The DCM has been searched for an existing matching use case
- [ ] The status has been set to `in_progress`
- [ ] The visual element ID is known or marked as `pending`

If any item is unchecked, resolve it before writing code.

---

*ADVL USE_CASE_FIRST.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
