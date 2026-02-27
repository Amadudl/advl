# NO_FAKE.md — No Fake Surfaces, No Fake Functions, No Mocks in Production
## ADVL (AI Development Visual Language)

---

> A surface without a function is a lie. A function without purpose is noise. A mock in production is a trap. ADVL builds only what is real, only what works, only what delivers the value it claims to deliver.

---

## The Rule in One Sentence

**Every surface must have a function. Every function must have a use case. Every use case must be fully implemented before it is considered done.**

There are no exceptions. There are no "we'll hook it up later." There is no "placeholder for now." Either it works completely, or it does not ship.

---

## What Is Forbidden

### NF-01 — No Fake Surfaces

A fake surface is any visual element that:

- Looks like it does something but does nothing when interacted with
- Shows hardcoded or static data where dynamic data is expected
- Displays a loading state permanently with no underlying data fetch
- Has a submit button that fires no function
- Has a form that captures input but sends it nowhere
- Has navigation that routes to a blank or "coming soon" page presented as functional

**Examples of forbidden patterns:**

```tsx
// FORBIDDEN — button with no handler
<Button onClick={() => {}}>Save Changes</Button>

// FORBIDDEN — onClick that only logs
<Button onClick={() => console.log('clicked')}>Delete Account</Button>

// FORBIDDEN — form with hardcoded "success" state
const handleSubmit = () => setSuccess(true); // no API call

// FORBIDDEN — navigation to unimplemented page
<Link href="/analytics">Analytics</Link> // page doesn't exist yet
```

**What is required instead:**

If a surface is not yet backed by a real function, it does not appear in the UI. It is not greyed out with a "coming soon" label. It is not rendered at all. It belongs to a `planned` use case in the DCM and ships when the implementation is complete.

---

### NF-02 — No Fake Functions

A fake function is any function that:

- Has a signature but an empty body (or a body that only returns a hardcoded value)
- Is named as if it does something but contains a `// TODO` comment instead of logic
- Throws a `Not implemented` error at runtime
- Returns `null`, `undefined`, or an empty object unconditionally
- Wraps another fake function with no added behavior
- Is registered in the DCM as `implemented` when it is not

**Examples of forbidden patterns:**

```ts
// FORBIDDEN — empty function
export async function updateUserAddress(userId: string, address: Address) {
  // TODO: implement
}

// FORBIDDEN — hardcoded return
export async function getUserById(id: string): Promise<User> {
  return { id: '1', name: 'Test User', email: 'test@example.com' };
}

// FORBIDDEN — not implemented stub
export async function processPayment(invoiceId: string) {
  throw new Error('Not implemented');
}

// FORBIDDEN — DCM status mismatch
// DCM says status: "implemented" but function does nothing
```

**What is required instead:**

A function either does what its name says completely, or it does not exist. If the implementation is genuinely in progress, the DCM status is `in_progress` and the function is not exposed in any API route or UI surface. When it is `implemented`, it is fully implemented — database read/write performed, error handling complete, return type accurate.

---

### NF-03 — No Mocks in Shipping Code

Test mocks, fake API responses, and hardcoded fixture data belong exclusively in test files. They are never imported into application code, never conditionally activated in production builds, and never used as a "temporary" data source while the real API is built.

**Examples of forbidden patterns:**

```ts
// FORBIDDEN — mock data in component
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]; // TODO: replace with API call

// FORBIDDEN — environment-conditional mocking in app code
const data = process.env.NODE_ENV === 'development'
  ? mockInvoices
  : await fetchInvoices();

// FORBIDDEN — mock service registered in dependency injection for non-test builds
container.bind(UserService).to(MockUserService);

// FORBIDDEN — MSW handlers imported in the application entry point
import { worker } from './mocks/browser'; // should only exist in test setup
```

**What is required instead:**

- **Real data fetching from day one.** If the backend endpoint is not ready, the frontend feature is not built yet. They ship together as a complete use case.
- **Test mocks stay in test files.** `__mocks__`, `*.mock.ts`, `fixtures/`, `test/` — these directories are the only acceptable home for mock data.
- **Seeded development data via migrations.** If realistic data is needed in development, use database seed scripts (`prisma db seed`, `alembic` data migration, etc.) — not hardcoded arrays in component files.

---

### NF-04 — No Disconnected Visual Elements

Every visual element that renders data must be connected to the function that provides that data via `advl_meta`. A disconnected element — one that renders data without a registered DCM function — is treated identically to a fake surface.

The following are signs of a disconnected element:

- A table that renders rows from a prop passed down from a parent with no clear origin
- A card that displays entity data but has no `advl_meta` linking it to a `GET` function
- A form that is pre-populated with data from an unregistered source
- A counter or aggregate that is calculated inline without a registered query function

**Enforcement:** Every data-rendering element must carry `advl_meta` that accurately identifies the function and endpoint that provided the data. See `META_INJECTION.md` for the full specification.

---

### NF-05 — No Partial Use Cases in `implemented` Status

A use case is `implemented` when every one of the following is true:

- [ ] The backend function exists and handles all specified postconditions
- [ ] The backend function handles all error cases (validation errors, auth errors, not-found, server errors)
- [ ] The API endpoint is protected by the correct auth middleware
- [ ] Input is validated (Zod, Pydantic, or equivalent) before reaching business logic
- [ ] The database write/read is committed and tested
- [ ] The frontend surface is connected to the real endpoint (no mock, no hardcoded data)
- [ ] The frontend handles loading, success, and error states
- [ ] The DCM entry is updated with accurate file, line, and endpoint references
- [ ] The `advl_meta` on the visual element reflects the current implementation

If any of these is incomplete, the status is `in_progress`. Setting a use case to `implemented` when any box is unchecked is a falsification of the DCM. The DCM is the ground truth. Falsifying it is the most serious violation in the system.

---

## What Is Allowed

### Allowed: Feature Flags for Unreleased Work
Features that are complete but not yet exposed to users may be hidden behind a feature flag. The implementation is complete — the flag controls visibility, not functionality.

```ts
// ALLOWED — complete implementation behind a flag
if (featureFlags.analyticsV2) {
  return <AnalyticsDashboard />; // fully implemented, real data
}
```

### Allowed: Graceful Empty States
A UI surface that shows an empty state when no data exists is not a fake surface. An empty state is a real, valid UI state.

```tsx
// ALLOWED — empty state for no data
if (invoices.length === 0) {
  return <EmptyState message="No invoices yet." />;
}
```

### Allowed: Progressive Enhancement
A feature may ship in a simplified form with a plan to enhance it — **as long as the shipped form is fully functional for what it claims to do**. A simplified invoice list that shows title and amount but not line items is acceptable if it clearly represents a `UC-list-invoices` use case. It is not a fake surface — it is a scoped implementation.

### Allowed: Development Seeds
Seeded database data for local development is encouraged. This is different from hardcoded mock data in component files — seeds live in the database layer and are generated through the project's migration tooling.

### Allowed: Skeleton Loading States
Skeleton screens and loading spinners that appear while real data is being fetched are not fake surfaces. They are accurate representations of a pending state.

---

## The Completeness Test

Before marking any use case as `implemented`, run the following test:

> **"If I hand this feature to a real user right now, will it work end-to-end without any manual intervention, workaround, or background knowledge about its incompleteness?"**

If the answer is **yes** → mark as `implemented`.
If the answer is **no** → keep at `in_progress`. Fix what is missing. Run the test again.

There is no such thing as "99% done." A use case is done or it is not.

---

## Why This Rule Exists

Fake surfaces and placeholder functions cause specific, measurable harm:

1. **They poison the DCM.** A function registered as `implemented` that does nothing makes the DCM unreliable. Once the DCM is unreliable, Rule 1 (DCM First) becomes meaningless. The entire ADVL system degrades.

2. **They create false confidence.** Stakeholders see a working UI and believe the feature is complete. The discrepancy between appearance and reality is discovered in production, under pressure.

3. **They create hidden technical debt.** `// TODO: hook up API` comments accumulate. The longer they live, the more the codebase has grown around them, and the harder they become to replace with real implementations.

4. **They break the use case contract.** A use case promises to deliver a specific business value. A fake implementation delivers zero value while appearing to deliver the promised value. It is a broken contract with every user who encounters it.

5. **They waste future agent time.** The next session must re-examine what is real and what is fake before building anything new. Every fake surface is a tax on every future session.

---

## Summary: The NO_FAKE Checklist

Before any code is committed:

- [ ] No visual element has an empty or non-functional `onClick` / `onSubmit` handler
- [ ] No function has an empty body, hardcoded return value, or `// TODO` body
- [ ] No mock data exists in any non-test file
- [ ] No component imports from `mocks/`, `fixtures/`, or test helper directories
- [ ] No use case is marked `implemented` with any incomplete item from the NF-05 checklist
- [ ] Every data-rendering element carries accurate `advl_meta`
- [ ] Every form submission reaches a real API endpoint
- [ ] Every API endpoint is connected to real database logic
- [ ] Every error case is handled — not silently swallowed

---

*ADVL NO_FAKE.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
