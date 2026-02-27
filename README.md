# ADVL — AI Development Visual Language

> **Zero to production in under an hour. Zero entropy. Forever.**

---

## What Is ADVL?

ADVL is a **living architecture system** that makes AI-assisted software development rigorous, consistent, and permanently free of technical debt.

It is the missing layer between human intent and working software.

Current AI-assisted development ("vibe coding") produces software that works until it doesn't. AI agents forget decisions. Logic gets duplicated. Codebases drift. Architecture documents go stale on day two. Every project re-invents the same foundation.

ADVL solves all of this simultaneously.

---

## The Core Idea

Every function that exists in your project is registered in the **Data Communication Matrix (DCM)** — a structured YAML file that serves as the system's permanent memory. Before any AI agent writes a single line of code, it checks the DCM. If the logic already exists, it reuses it. If it doesn't, it creates it and registers it immediately.

Every use case has a business value statement. Every implementation traces back to a use case. Every visual element carries live metadata about its underlying code.

The architecture lives in the tool. It is always current. It is always machine-readable. It cannot go stale.

---

## Five Problems ADVL Solves

| Problem | How ADVL Solves It |
|---|---|
| **No architectural memory** | The DCM is the permanent, versioned memory of every function, endpoint, and use case |
| **Consistency collapse** | One problem = one solution. The DCM enforces reuse. Duplication is a rule violation. |
| **Developer-centric thinking** | Use cases are the unit of work. Business value drives every implementation decision. |
| **No living architecture** | The DCM is updated in the same commit as the code. Design and implementation are always in sync. |
| **Infinite foundation tax** | Foundation is generated once, correctly, from a template. Never rebuilt again. |

---

## How It Works

### 1. Initialize

Answer a handful of questions:
- Where does this run? (Web, iOS, Android, Cloud API)
- Which cloud? (Vercel, AWS, GCP, Azure, Self-hosted)
- How do users authenticate? (Email, OAuth, SSO, Magic Link)
- Which database? (PostgreSQL, SQLite, MongoDB, Supabase)
- Compliance requirements? (GDPR, SOC2, HIPAA, None)

ADVL generates a fully configured project: working auth, CI/CD pipeline, three environments (dev/staging/prod), security baseline, secrets management, Docker config, and an initialized DCM. In minutes.

### 2. Define Use Cases

Describe what your users need in plain language:

> "A customer should be able to update their shipping address."

ADVL translates this into a DCM entry, implements the function, creates the endpoint, and injects metadata into the visual layer.

### 3. Ship

From that point forward, every feature follows the same flow:

```
Describe the use case → ADVL checks DCM → implements or reuses → registers in DCM → ships
```

No boilerplate. No duplicate logic. No architectural drift. No wasted sessions rebuilding decisions already made.

---

## The Data Communication Matrix (DCM)

The DCM is the heart of ADVL. A structured YAML file that records everything:

```yaml
use_cases:
  - id: "UC-001"
    title: "User updates their address"
    value: "Customer data stays accurate, reducing failed deliveries and billing errors"
    status: implemented
    functions:
      - name: "updateUserAddress"
        file: "src/api/user.ts"
        line: 142
        endpoint: "PATCH /api/user/:id/address"
        db_tables: ["users", "addresses"]
        auth_required: true
        last_modified: "2026-02-25"
```

Every function. Every endpoint. Every database table. Every use case. All in one place. Always current.

---

## Repository Structure

```
/advl
├── VISION.md                  ← What ADVL is, principles, non-negotiables
├── AGENTS.md                  ← How AI agents must behave inside ADVL projects
├── LICENSE                    ← Commons Clause + MIT
├── README.md                  ← This file
│
├── /rules                     ← Core rulebooks — the law of the system
│   ├── CORE_RULES.md
│   ├── NO_DUPLICATE.md
│   ├── USE_CASE_FIRST.md
│   ├── META_INJECTION.md
│   └── STACK_RULES.md
│
├── /templates                 ← Stack templates for project bootstrapping
│   ├── web-nextjs/
│   ├── web-fastapi-react/
│   ├── mobile-expo/
│   └── fullstack-cloud/
│
├── /schema                    ← Data Communication Matrix
│   ├── DCM.yaml
│   ├── DCM_SCHEMA.md
│   └── /snapshots
│
├── /experiments               ← Prompt experiments and iteration logs
│
└── /tools                     ← CLI and scripts
    ├── dcm-sync.js
    └── validate-rules.js
```

---

## Agent Rules (Summary)

AI agents inside ADVL projects are bound by ten non-negotiable rules:

1. **DCM First** — Check the DCM before writing any function
2. **Use Case Driven** — Think in business value, not in technical tasks
3. **Metadata Injection** — Every visual element carries live code metadata
4. **One Solution Per Problem** — No duplicate implementations, ever
5. **Foundation Is Sacred** — Auth, CI/CD, security are never touched without explicit instruction
6. **Explicit Over Implicit** — Ambiguity triggers a clarification request, not a guess
7. **Rulebook Compliance** — All output is verified against `/rules` before delivery
8. **DCM Synchronicity** — DCM is updated in the same commit as the code
9. **Deprecation Over Deletion** — Logic is deprecated before it is removed
10. **Structured Response Format** — All responses reference use cases and DCM state

Full specification in [`AGENTS.md`](./AGENTS.md).

---

## Core Philosophy

> "The developer 2.0 only creates real value. Never infrastructure. Never boilerplate. Never duplicate logic."

> "A business thinker should be able to engineer software as effectively as a senior developer."

> "The architecture lives in the tool, not in someone's head."

> "One problem. One solution. Always."

---

## License

Commons Clause + MIT License

Free to use, fork, self-host, and contribute. Cannot be sold or offered as a paid hosted service without explicit written permission.

See [`LICENSE`](./LICENSE) for full terms.

**Author:** Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)

---

*ADVL Version 1.0 — 2026-02-25*
