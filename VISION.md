# ADVL — AI Development Visual Language
## Vision Document

---

## What ADVL Is

ADVL is a **living architecture system** for software engineering. It is the operating layer between human intent and working software — a structured, bidirectional framework where visual design, AI agents, and code exist in permanent, verifiable sync.

ADVL is not a code generator. It is not a no-code platform. It is not a prompt-engineering trick. It is a **discipline** — a set of rules, schemas, and workflows that make AI-assisted development rigorous, consistent, and permanently free of entropy.

At its core, ADVL answers one question: **"How do we build software with AI that doesn't fall apart?"**

---

## The Problem ADVL Was Built to Solve

Modern AI-assisted development ("vibe coding") produces software that works until it doesn't. The failures are structural, not accidental:

**1. No Architectural Memory**
AI agents forget. Between sessions, between prompts, between developers — decisions evaporate. The same logic gets implemented three different ways. The same endpoint gets created twice. Nobody knows what the system decided six weeks ago, or why.

**2. Consistency Collapse**
Without a single source of truth, every AI-generated addition drifts from the last. After fifty sessions, the codebase contains fifty slightly different patterns. Refactoring becomes archaeology. Every change risks breaking something unrelated.

**3. Developer-Centric Thinking**
Current tooling assumes you understand the stack. You must know what a REST endpoint is, what a migration does, what a foreign key constraint means. The knowledge barrier excludes business thinkers — the people who understand the problem most deeply.

**4. No Living Architecture**
Architecture documents are written once and abandoned immediately. By the time the second sprint ends, every diagram is a lie. Nobody reads them. Nobody updates them. They become decorative.

**5. Infinite Foundation Tax**
Every project rebuilds auth, CI/CD, environment management, secrets handling, and security baselines from scratch. This is weeks of work that produces zero business value. It is a tax on every project, paid by every team, forever.

ADVL eliminates all five simultaneously.

---

## What ADVL Is Not

**ADVL is not a no-code platform.**
It does not hide engineering from engineers. It elevates the level at which engineering decisions are made.

**ADVL is not a prompt library.**
Prompts are inputs to agents. ADVL is the system that governs what agents do with those inputs.

**ADVL is not a framework.**
It does not dictate your programming language, your cloud provider, or your UI components. It governs *how decisions are made* about those choices, not what the choices are.

**ADVL is not a project management tool.**
It does not replace Jira, Linear, or Notion. It replaces the invisible architecture layer that none of those tools cover.

**ADVL is not finished.**
It is a living system. Its rules evolve. Its schemas are versioned. Its templates grow. ADVL is designed to improve continuously without breaking what it has already built.

---

## Core Principles

### 1. Use Case First, Always
Every line of code that ever enters an ADVL project must trace back to a use case. Use cases express business value in plain language. They are the non-negotiable unit of work. Technical tasks are derived from use cases — never the other way around.

### 2. One Problem, One Solution
Every problem has exactly one correct implementation inside an ADVL project. When a function exists, it is reused. When an endpoint exists, it is referenced. Duplication is not a style choice — it is a system violation. The DCM (Data Communication Matrix) enforces this at every commit.

### 3. The Architecture Lives in the Tool
Architecture must be machine-readable, automatically maintained, and always current. The DCM is the architecture. It is updated in the same commit as the code. If it is not in the DCM, it does not officially exist.

### 4. Business Thinkers Are First-Class Engineers
A person who deeply understands a business problem should be able to engineer software to solve it. ADVL makes that possible by abstracting the technical layer while preserving full engineering power. The vocabulary is use cases and value, not functions and migrations.

### 5. Foundation Is Sacred
The project foundation — auth, CI/CD, security, environments, secrets management — is generated once, correctly, and never touched without explicit instruction. It is not a starting point to be "improved." It is bedrock.

### 6. Explicit Over Implicit
ADVL agents never assume business logic. Ambiguity triggers a clarification request, not a guess. A wrong implementation is always more expensive than a short conversation.

### 7. Zero Entropy Growth
Every addition to an ADVL project must make the system more coherent, not less. New use cases integrate with existing patterns. New functions extend existing modules. The system grows without divergence.

---

## The Data Communication Matrix (DCM)

The DCM is the memory of every ADVL project. It is a structured YAML file that records:

- Every use case, with its business value statement
- Every function that implements a use case, with its file location and line number
- Every API endpoint, with its HTTP method, path, and authentication requirements
- Every database table touched by a use case
- Every rule applied to the implementation
- The current status of every use case (planned, in-progress, implemented, deprecated)

The DCM is not documentation. Documentation describes what was built. The DCM *is* what was built — a machine-readable, queryable, versionable record of the system's entire functional surface.

AI agents consult the DCM before generating any output. This is not a suggestion. It is Rule 1.

---

## The Visual Layer

ADVL is designed to connect to a bidirectional visual design tool where every element on the canvas carries live metadata about its underlying code. A button on the canvas knows which function it calls. A form knows which endpoint it hits and which database tables are affected. A modal knows which use case it implements.

When the code changes, the visual layer updates. When the visual layer is modified, the DCM is updated. The design and the implementation are never out of sync because they share the same source of truth.

This is not mockup tooling. This is engineering tooling that happens to have a visual interface.

---

## The Goal: Zero to Production in Under an Hour

For a new project with ADVL:

1. Answer a handful of questions about deployment target, auth, database, and compliance requirements.
2. Receive a fully configured project scaffold: working auth, CI/CD pipeline, three environments (dev/staging/prod), security baseline, secrets management, and an initialized DCM.
3. Define the first use case in plain language.
4. Ship.

From that point forward, every subsequent use case is: describe it → ADVL builds it → it is registered in the DCM → it is visible in the visual layer → it is in production.

No boilerplate. No duplicate logic. No architectural drift. No wasted sessions rebuilding decisions already made.

---

## Non-Negotiables

These rules cannot be overridden by any user, agent, or configuration:

1. **The DCM is always consulted before any function is written.**
2. **Use cases are the unit of work. Technical tasks are derived from them.**
3. **No logic is duplicated. Ever.**
4. **The foundation is generated once and protected.**
5. **Every implementation is traceable to a use case with a business value statement.**
6. **The DCM is updated in the same commit as the code.**
7. **Ambiguity is resolved before implementation, not during.**

---

## Who ADVL Is For

- **Founders** who need to ship fast without creating technical debt that kills the company at Series A
- **Senior engineers** who are tired of spending 60% of their time on boilerplate, migrations, and inconsistency archaeology
- **Product managers** who want to be able to contribute meaningfully to architecture conversations
- **AI-native teams** who want to scale output without scaling entropy
- **Agencies** who deliver projects for clients and need a consistent, reliable delivery system

---

## Who Maintains ADVL

ADVL is created and maintained by **Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)**.

It is open to use, fork, and contribution under the Commons Clause + MIT License. It cannot be sold or offered as a paid commercial service without explicit written permission.

---

*ADVL Version 1.0 — Last Updated: 2026-02-25*
*"The developer 2.0 only creates real value. Never infrastructure. Never boilerplate. Never duplicate logic."*
