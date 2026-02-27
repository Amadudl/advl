# META_INJECTION.md — Metadata Injection Specification
## ADVL (AI Development Visual Language)

---

> Every visual element that is connected to an implementation must carry live metadata about that implementation. This metadata is not documentation — it is a machine-readable link between the canvas and the codebase. Without it, the visual layer is decorative. With it, the visual layer is a live view of the system.

---

## What Is Metadata Injection?

Metadata injection is the act of embedding `advl_meta` — a structured JSON object — into the definition of any visual element that is connected to a function, endpoint, or use case.

When an agent creates or modifies a visual element and connects it to an implementation, the `advl_meta` block is injected into the element's definition at the same time. It is never added later. It is never left as a placeholder. It reflects the actual current state of the implementation at the moment of injection.

---

## The Standard `advl_meta` Schema

```json
{
  "advl_meta": {
    "use_case_id": "UC-XXX",
    "use_case_title": "Human-readable use case title",
    "function": "functionName",
    "file": "src/path/to/file.ts",
    "line": 42,
    "endpoint": "HTTP_METHOD /api/resource/:id",
    "db_tables": ["table1", "table2"],
    "auth_required": true,
    "roles_required": ["admin", "user"],
    "last_verified": "YYYY-MM-DD",
    "dcm_version": "1.0",
    "visual_element_id": "VE-ElementName-Action"
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `use_case_id` | string | Yes | DCM use case ID (e.g., `UC-001`) |
| `use_case_title` | string | Yes | Human-readable use case title from the DCM |
| `function` | string | Yes | Exact function name as it appears in the codebase |
| `file` | string | Yes | Relative path from project root to the file containing the function |
| `line` | integer | Yes | Line number where the function is defined |
| `endpoint` | string | Conditional | HTTP method + path if this connects to an API endpoint. Null for client-only elements. |
| `db_tables` | array | Yes | All database tables read or written by this function |
| `auth_required` | boolean | Yes | Whether the endpoint/function requires authentication |
| `roles_required` | array | No | Specific roles required beyond basic auth. Empty array if any authenticated user can access. |
| `last_verified` | date | Yes | ISO date of the session in which this metadata was last confirmed accurate |
| `dcm_version` | string | Yes | Version of the DCM at the time of injection |
| `visual_element_id` | string | Yes | The element's own ID in the visual design tool |

---

## What Requires Metadata Injection

Metadata injection is required for every visual element that triggers or displays the result of an implementation. This includes:

### Always Inject
- **Forms** that submit data to an API endpoint
- **Buttons** that trigger a function call (create, update, delete, submit, confirm)
- **Modal dialogs** that perform or confirm a state-changing action
- **Pages** that fetch and display data from an endpoint
- **Cards or list items** that render entity data from the database
- **Tables** that display query results
- **Dropdowns and selects** that load options from an API

### Inject When Connected
- **Navigation items** that route to a page whose data comes from an endpoint
- **Status badges** that reflect database state
- **Counters or aggregates** that derive from a database query

### No Injection Required
- **Pure layout elements** (containers, dividers, spacers)
- **Static content** (static text, static images, decorative elements)
- **Utility components** with no backend connection (date pickers, color pickers used locally)

---

## Injection Rules

### Rule MI-01 — Inject at Connection Time
Metadata is injected when the visual element is first connected to an implementation. It is never deferred. An element that exists without `advl_meta` is considered **unregistered**.

### Rule MI-02 — Reflect Reality, Not Plans
`advl_meta` values reflect the actual current state of the implementation. If the function is not yet implemented, the element cannot carry accurate metadata. In this case, use the `pending` state:

```json
{
  "advl_meta": {
    "use_case_id": "UC-XXX",
    "use_case_title": "Title of planned use case",
    "function": null,
    "file": null,
    "line": null,
    "endpoint": null,
    "db_tables": [],
    "auth_required": null,
    "last_verified": null,
    "dcm_version": "1.0",
    "visual_element_id": "VE-ElementName-Action",
    "status": "pending"
  }
}
```

### Rule MI-03 — Update on Every Change
When the underlying function changes (rename, relocation, refactor), every visual element that references it must have its `advl_meta` updated. This is done in the same operation as the function change.

The `last_verified` field is updated to the current date whenever metadata is confirmed or updated.

### Rule MI-04 — The Visual Element ID Convention
Visual element IDs follow this naming pattern:

```
VE-[EntityName]-[Action]
```

Examples:
- `VE-AddressForm-Edit`
- `VE-InvoiceTable-List`
- `VE-UserModal-Delete`
- `VE-LoginPage-Submit`
- `VE-ProductCard-View`

The ID must be unique within the project. It must match the `visual_element_id` field in the corresponding DCM entry.

### Rule MI-05 — Unregistered Elements Are Blocked
Any visual element found without `advl_meta` in a connected state is considered unregistered. An unregistered element:
- Cannot be used in a new implementation without first being connected to a DCM entry
- Must be surfaced in the validation report generated by `validate-rules.js`
- Must be registered before the session closes

---

## Multi-Function Elements

Some visual elements trigger multiple functions (e.g., a page that loads data on mount AND submits a form on action). In this case, `advl_meta` carries an array of function references:

```json
{
  "advl_meta": {
    "visual_element_id": "VE-CheckoutPage-Main",
    "connections": [
      {
        "trigger": "on_mount",
        "use_case_id": "UC-015",
        "use_case_title": "Customer reviews order before payment",
        "function": "getOrderSummary",
        "file": "src/api/orders.ts",
        "line": 88,
        "endpoint": "GET /api/orders/:id/summary",
        "db_tables": ["orders", "order_items", "products"],
        "auth_required": true,
        "last_verified": "2026-02-25"
      },
      {
        "trigger": "on_submit",
        "use_case_id": "UC-016",
        "use_case_title": "Customer pays an invoice",
        "function": "processPayment",
        "file": "src/api/payments.ts",
        "line": 201,
        "endpoint": "POST /api/payments",
        "db_tables": ["payments", "invoices", "orders"],
        "auth_required": true,
        "last_verified": "2026-02-25"
      }
    ],
    "dcm_version": "1.0"
  }
}
```

---

## Metadata Validation

The `validate-rules.js` tool checks all visual element metadata for:

1. **Completeness** — all required fields are present and non-null (unless `status: pending`)
2. **Accuracy** — `file` and `line` references point to a real function in the codebase
3. **DCM Sync** — `use_case_id` matches an existing DCM entry
4. **Freshness** — `last_verified` is within an acceptable range (configurable, default 30 days)
5. **ID Uniqueness** — no two elements share the same `visual_element_id`

Validation failures are reported as blocking issues that must be resolved before commit.

---

## Example: Complete Metadata-Injected Element

A form component in a Next.js project that allows a customer to update their shipping address:

```tsx
export const AddressEditForm = {
  component: "AddressEditForm",
  advl_meta: {
    use_case_id: "UC-001",
    use_case_title: "Customer updates their shipping address",
    function: "updateUserAddress",
    file: "src/api/user.ts",
    line: 142,
    endpoint: "PATCH /api/users/:id/address",
    db_tables: ["users", "addresses"],
    auth_required: true,
    roles_required: [],
    last_verified: "2026-02-25",
    dcm_version: "1.0",
    visual_element_id: "VE-AddressForm-Edit"
  }
}
```

This metadata is what allows the visual design tool to display:
- Which use case this element implements
- Which function it calls
- Which endpoint it hits
- Which database tables are affected
- Whether authentication is required
- When this metadata was last verified

---

## Summary: The Injection Checklist

When connecting a visual element to an implementation:

- [ ] `use_case_id` matches an existing DCM entry
- [ ] `function` name matches the actual function in the codebase
- [ ] `file` path is correct and the file exists
- [ ] `line` number is accurate
- [ ] `endpoint` reflects the correct HTTP method and path
- [ ] `db_tables` lists all tables touched (read and write)
- [ ] `auth_required` is accurate
- [ ] `roles_required` is accurate (empty array if not role-restricted)
- [ ] `last_verified` is today's date
- [ ] `visual_element_id` follows the `VE-[Entity]-[Action]` convention
- [ ] DCM entry has been updated with this `visual_element_id`

---

*ADVL META_INJECTION.md Version 1.0 — Last Updated: 2026-02-25*
*Maintained by: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)*
