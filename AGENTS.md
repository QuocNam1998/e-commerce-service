# Node.js Guide for Codex

Use this document when Codex creates or edits code in this Node.js repository.

> For automatic Codex guidance, rename this file to `AGENTS.md` and place it at the repository root.

## Purpose

This project uses Node.js for backend and server-side development. Codex should generate code that is simple, maintainable, secure, and aligned with modern Node.js practices.

## Core Rules

- Prefer built-in Node.js APIs before adding dependencies.
- Keep code modular and focused on one responsibility.
- Avoid broad refactors unless the task explicitly requires them.
- Follow the existing project structure and conventions when editing existing files.
- Prefer clarity over clever abstractions.
- Keep server code predictable and easy to debug.

## Node.js Principles

- Use async, non-blocking patterns for I/O work.
- Avoid blocking the event loop with heavy synchronous operations in request paths.
- Handle errors explicitly.
- Validate external input.
- Keep secrets and sensitive logic on the server only.
- Use streaming when it is clearly better than loading everything into memory.

## Recommended Project Structure

Use the repository’s current structure if it is already clear. Otherwise, prefer a structure like:

```txt
src/
  app/
  modules/
  routes/
  controllers/
  services/
  repositories/
  middleware/
  lib/
  utils/
  config/
  types/
  tests/
```

### Folder meanings

- `app/`: app bootstrap and server initialization
- `modules/`: domain or feature modules
- `routes/`: route registration
- `controllers/`: HTTP request handlers
- `services/`: business logic
- `repositories/`: database access logic
- `middleware/`: middleware functions
- `lib/`: infrastructure helpers and integrations
- `utils/`: small generic helpers
- `config/`: environment and app configuration
- `types/`: shared types
- `tests/`: test files when not colocated

## Layering Rules

Keep responsibilities separate:

- **routes** should define endpoints and connect middleware + controllers
- **controllers** should parse request input and shape HTTP responses
- **services** should contain business logic
- **repositories** should contain database queries and persistence logic
- **lib** should contain infrastructure code such as HTTP clients, logger, cache, or queue wrappers

Avoid:

- database queries directly inside route files
- large controllers with business logic mixed into them
- service code that depends on raw request/response objects

## HTTP and API Rules

- Keep route handlers small.
- Return consistent response shapes where the project already uses them.
- Use the correct HTTP status codes.
- Validate request params, query, body, and headers when relevant.
- Never trust client input.
- Sanitize or normalize input when required by the domain.

Good patterns:

- `getUserById`
- `createOrder`
- `updateProfile`
- `deleteSession`

## Async Rules

- Prefer `async` / `await` for readability.
- Wrap awaited operations with clear error handling.
- Use `Promise.all` only when operations are truly independent.
- Do not ignore rejected promises.
- Avoid unnecessary sequential awaits when concurrency is safe.

## Error Handling

- Fail clearly and safely.
- Do not leak secrets, tokens, internal SQL, or stack traces to clients.
- Centralize HTTP error handling when the framework supports it.
- Log enough context for debugging.
- Use custom error classes only when they improve clarity.

Good examples:

- validation error -> 400
- unauthorized -> 401
- forbidden -> 403
- not found -> 404
- unexpected server error -> 500

## Validation

- Validate all external input at the boundary.
- Keep validation rules close to the endpoint or module they belong to.
- Prefer explicit schemas or clear manual validation over hidden assumptions.
- Reject malformed input early.

## Security Rules

- Never commit secrets.
- Read secrets from environment variables.
- Do not expose private server configuration to clients.
- Escape or sanitize data where needed.
- Use parameterized database queries or ORM-safe query APIs.
- Treat file uploads, headers, and user-generated content as untrusted.
- Be careful with CORS, cookies, auth tokens, redirects, and debug endpoints.

## Configuration

- Centralize environment access.
- Parse and validate required environment variables on startup.
- Keep configuration names explicit.
- Avoid scattering `process.env` reads throughout the codebase when a config module exists.

Good:

- `config/env.ts`
- `config/server.ts`

## Database Rules

- Keep database access in repositories, models, or data-access modules.
- Do not mix SQL or ORM calls into controllers unless the project already intentionally does so.
- Name repository methods after their domain purpose, not raw query behavior.

Good:

- `findUserByEmail`
- `createTransaction`
- `listActivePromotions`

Avoid:

- `runQuery1`
- `dbCall`
- `handleData`

## Modules and Features

Prefer grouping by domain when the project is large enough.

Example:

```txt
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.routes.ts
      auth.types.ts
    users/
      users.controller.ts
      users.service.ts
      users.repository.ts
      users.routes.ts
```

This is usually better than scattering all auth code across many top-level technical folders.

## Feature-Based Structure

For medium and large Node.js codebases, prefer a **feature-based structure** over a purely technical structure.

Main idea:

- group code by business domain
- keep controllers, services, repositories, validation, and types close to the feature that owns them
- reduce cross-project scattering
- make features easier to change, test, and remove

Prefer this:

```txt
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.routes.ts
      auth.validation.ts
      auth.types.ts
    users/
      users.controller.ts
      users.service.ts
      users.repository.ts
      users.routes.ts
      users.types.ts
```

Instead of this:

```txt
src/
  controllers/
  services/
  repositories/
  routes/
  validators/
  types/
```

when most files belong to one specific domain.

### Recommended Feature Module Shape

A feature module may contain:

```txt
src/
  modules/
    checkout/
      checkout.routes.ts
      checkout.controller.ts
      checkout.service.ts
      checkout.repository.ts
      checkout.validation.ts
      checkout.types.ts
      checkout.constants.ts
      index.ts
```

Not every module needs every file.  
Only create what the feature actually needs.

### Responsibility Inside a Feature

- `*.routes.ts`: endpoint registration
- `*.controller.ts`: request parsing and response shaping
- `*.service.ts`: business logic
- `*.repository.ts`: persistence and database access
- `*.validation.ts`: input validation
- `*.types.ts`: feature-local types
- `*.constants.ts`: feature-local constants
- `index.ts`: public exports when useful

### Import Boundary Rules

Allowed:

- `app` -> `modules`, `lib`, `config`
- one module -> its own local files, `lib`, `config`, shared utilities
- shared infrastructure -> other infrastructure modules when reasonable

Avoid:

- one module importing deep private internals from another module
- `lib` importing business modules
- database code being shared through controllers
- feature logic being placed in `app/`

Prefer importing through a module's public entry when one exists.

Good:

```ts
import { authRouter } from "@/modules/auth";
```

Avoid:

```ts
import { authRouter } from "@/modules/auth/internal/routes/auth.routes";
```

unless the repository already intentionally follows deep imports.

### Shared vs Feature-Specific Rule

Keep code inside a feature when:

- it is used by one domain only
- it contains business-specific assumptions
- reuse is not yet proven

Move code to shared folders only when:

- it is reused by multiple modules
- it is stable and generic
- it no longer belongs to one business feature

Examples:

- `auth.validation.ts` -> belongs to `modules/auth`
- `payment.repository.ts` -> belongs to `modules/payment`
- `http client` -> belongs to `lib/`
- `env config` -> belongs to `config/`

### Example Scalable Structure

```txt
src/
  app/
    server.ts
    registerRoutes.ts

  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.validation.ts
      auth.types.ts
      index.ts

    orders/
      orders.routes.ts
      orders.controller.ts
      orders.service.ts
      orders.repository.ts
      orders.validation.ts
      orders.types.ts
      index.ts

    promotions/
      promotions.routes.ts
      promotions.controller.ts
      promotions.service.ts
      promotions.repository.ts
      promotions.types.ts
      index.ts

  lib/
    db/
      client.ts
    http/
      externalApiClient.ts
    logger/
      logger.ts

  config/
    env.ts
    server.ts

  shared/
    utils/
      formatDate.ts
    errors/
      AppError.ts
```

### Codex Rule

When adding backend code:

1. identify the owning feature first
2. place the code inside that module
3. extract to shared folders only when reuse is real
4. keep HTTP, business logic, and persistence separated inside the feature
5. avoid creating global technical folders for code that belongs to one domain

## Naming Rules

- files: consistent with repository convention, usually `kebab-case` or `dot.separated`
- variables/functions: `camelCase`
- classes/types/interfaces: `PascalCase`
- constants: `UPPER_SNAKE_CASE` only for real constants
- booleans: start with `is`, `has`, `can`, or `should`
- handlers: use names like `handleLogin`, `getProfile`, `createPayment`

Avoid vague names like:

- `data`
- `item`
- `value`
- `temp`
- `helper`
- `manager`
- `stuff`

## Dependency Rules

- Prefer built-in modules such as `node:http`, `node:fs`, `node:path`, `node:stream`, and `node:events` when they are sufficient.
- Add third-party packages only when they solve a real problem better than built-ins.
- Do not add a library for trivial functionality.
- Keep runtime dependencies intentional and minimal.

## Logging

- Log meaningful operational events.
- Avoid noisy logs in hot paths unless needed.
- Never log passwords, tokens, or sensitive personal data.
- Keep log messages structured and actionable where possible.

## Performance Rules

- Avoid blocking sync APIs in request-heavy paths.
- Stream large files when appropriate.
- Avoid repeated expensive work inside loops.
- Cache only when it clearly improves the system and invalidation is understood.
- Keep memory usage in mind for large payloads.

## Testing Guidance

When adding or updating tests:

- test behavior, not implementation trivia
- cover success, failure, and edge cases
- mock external systems only where necessary
- keep tests readable and deterministic
- prefer colocated tests if that matches the repository

## What Codex Should Avoid

- Do not introduce unnecessary abstractions.
- Do not mix HTTP, business, and database logic in one place.
- Do not add dependencies without clear value.
- Do not use sync filesystem or CPU-heavy work in hot request paths unless required.
- Do not expose raw internal errors to clients.
- Do not refactor unrelated files just for style consistency.

## Preferred Workflow for Codex

For each task:

1. inspect nearby files first
2. match the current architecture and naming style
3. keep changes small and local
4. preserve separation of concerns
5. verify async, error handling, and validation behavior
6. summarize important design choices briefly

## Review Checklist

Before finalizing:

- Is the logic in the correct layer?
- Are inputs validated?
- Are errors handled safely?
- Are async operations used correctly?
- Are names clear and consistent?
- Are built-in Node.js APIs preferred where reasonable?
- Is the change aligned with existing project patterns?
