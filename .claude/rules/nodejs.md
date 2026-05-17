---
description: Node.js/TypeScript coding standards for this project
paths:
  - "src/**/*.ts"
  - "prisma/**"
---

# Node.js / TypeScript Rules

## Layering
- routes → controllers → services → repositories (never skip layers)
- No Prisma calls outside `*.repository.ts` files
- No `process.env` reads outside `src/config/env.ts`
- No business logic in controllers — only parse input, call service, shape response

## Async
- Always `async/await`; never ignore rejected promises
- `Promise.all` only when operations are truly independent

## Validation & Security
- Validate all external input with Zod at the route/controller boundary
- Use parameterized Prisma queries (never raw string-interpolated SQL)
- Never expose `passwordHash`, tokens, internal errors, or stack traces in responses
- HTTP status codes: 400 invalid, 401 unauthenticated, 403 forbidden, 404 not found, 500 unexpected

## TypeScript
- Prefer explicit types for function parameters and return values
- Use `PascalCase` for types/interfaces, `camelCase` for variables/functions
- Boolean names: prefix with `is`, `has`, `can`, or `should`

## After Schema Changes
- Run `yarn prisma:generate` to regenerate the Prisma client
