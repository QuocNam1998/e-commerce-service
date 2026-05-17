# /product — Products Domain Task

Task: $ARGUMENTS

---

## Step 1 — Load Context

Before touching any code, read:

1. `C:\Users\james\.claude\projects\c--dev-commerce-service\memory\feature_products.md` — products domain documentation (schema, endpoints, business logic, conventions)
2. All files relevant to the task:
   - `src/modules/products/products.routes.ts`
   - `src/modules/products/products.controller.ts`
   - `src/modules/products/products.service.ts`
   - `src/modules/products/products.repository.ts`
   - `src/modules/products/products.validation.ts`
   - `src/modules/products/products.types.ts`
   - `prisma/schema.prisma` (if the task touches the data model)
   - Any test files under `src/modules/products/__tests__/`

Identify which layers (route, controller, service, repository, validation, types, schema) the task will touch.

---

## Step 2 — Plan

State in 2–4 bullets exactly what will change before writing any code. Example:

- Add `GET /products/:id` route and handler
- Add `findProductById` service + repository function
- Extend `productIdParamsSchema` validation (already exists — reuse it)
- Add unit test for the new repository function

Do not start implementing until the plan is clear.

---

## Step 3 — Implement

Constraints:
- Scope changes strictly to the products domain (`src/modules/products/`)
- Follow existing conventions: routes → controller → service → repository; Zod validation at controller boundary; Prisma calls only in repository
- Prices are integers (cents); never expose `passwordHash`, tokens, or stack traces
- Never read `process.env` directly — use `config/env.ts`
- After any Prisma schema change run `yarn prisma:generate`
- Write or update tests (TDD — tests first when adding new behaviour)
- Run before reporting done:

```bash
yarn typecheck
yarn test --run src/modules/products
```

Both must pass with no errors.

---

## Step 4 — Update Docs

After every code change, patch **only the affected sections** of `C:\Users\james\.claude\projects\c--dev-commerce-service\memory\feature_products.md`:

- Added/changed endpoint → update the **HTTP Endpoints** table
- Schema change → update **Data Model**
- New business rule → update **Business Logic Rules**
- New query or index → update **Database Queries**
- New error condition → update **Error Handling Strategy**
- New convention → update **Notable Conventions**

Do not rewrite sections that were not affected.

---

## Output Summary

Respond with these four sections:

**Plan**
Bullets of what was changed and why.

**Changes**
List of files modified with a one-line description of each change.

**Tests**
Result of `yarn typecheck` and `yarn test --run src/modules/products` (pass/fail, test count).

**Docs Updated**
Which sections of `feature_products.md` were patched (or "none" if no change was needed).
