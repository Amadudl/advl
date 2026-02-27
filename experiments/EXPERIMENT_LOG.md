# EXPERIMENT_LOG.md — Prompt & System Experiments
## ADVL (AI Development Visual Language)

---

> This log records all prompt experiments, system tests, and iteration results conducted inside the ADVL research track. Every experiment is documented with its hypothesis, method, result, and lesson. Nothing is deleted — failed experiments are as valuable as successful ones.

---

## How to Log an Experiment

Each experiment follows this format:

```
## EXP-XXX — [Short Title]
**Date:** YYYY-MM-DD
**Category:** [Prompt Engineering | System Design | Agent Behavior | DCM Validation | Template Test]
**Hypothesis:** [What we expected to happen]
**Method:** [What we did, what prompt or configuration was used]
**Result:** [What actually happened]
**Lesson:** [What this tells us about the system]
**Status:** [Success | Partial | Failure | Inconclusive]
**Follow-up:** [Next experiment or action item, if any]
```

---

## Experiment Categories

| Category | Description |
|---|---|
| **Prompt Engineering** | Testing how prompt phrasing affects agent behavior and output quality |
| **System Design** | Testing architectural decisions about how ADVL itself is structured |
| **Agent Behavior** | Testing whether agents correctly follow ADVL rules (DCM-first, use-case-first, etc.) |
| **DCM Validation** | Testing the accuracy and completeness of DCM entries |
| **Template Test** | Testing a stack template for completeness, correctness, and speed-to-production |
| **Rule Compliance** | Testing whether the rulebook prevents specific bad behaviors |
| **Integration** | Testing the connection between the visual layer and the codebase layer |

---

## Experiment Index

| ID | Title | Category | Status | Date |
|---|---|---|---|---|
| *(No experiments yet — log is initialized and ready)* | | | | |

---

## Active Hypotheses

> Hypotheses waiting to be tested. Move to a full experiment entry once a test is designed.

1. **H-001**: An agent given the full ADVL rulebook will not duplicate existing functions if the DCM is populated with accurate entries for the relevant domain.

2. **H-002**: A business-minded user (non-developer) can define a complete, implementable use case using only the USE_CASE_FIRST.md vocabulary without requiring technical coaching.

3. **H-003**: The DCM's `validate-rules.js` tool can detect 90%+ of ghost logic in a codebase that has been developed for 30+ days without ADVL.

4. **H-004**: An ADVL-governed project can reach its first production deployment faster than the same project initialized without ADVL, when measured from the first commit.

5. **H-005**: Agents that are given the `NO_DUPLICATE.md` rules will reduce function duplication by at least 80% compared to baseline vibe-coding sessions on the same feature set.

---

## Lessons Learned Archive

> High-value lessons extracted from completed experiments. Updated as experiments are logged.

*(Empty on initialization — will be populated as experiments complete.)*

---

## Experiment Template (Copy-Paste Ready)

```markdown
## EXP-001 — [Short Title]
**Date:** YYYY-MM-DD
**Category:** [Category]
**Hypothesis:** 
**Method:** 
**Prompt Used:**
```
[Paste the exact prompt here]
```
**Model/Configuration:** [Model name, temperature, system prompt variant]
**Result:** 
**Evidence:** [Screenshots, output excerpts, metrics]
**Lesson:** 
**Status:** [Success | Partial | Failure | Inconclusive]
**Follow-up:** 
```

---

*ADVL EXPERIMENT_LOG.md Version 1.0 — Initialized: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
