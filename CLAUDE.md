# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

`commerce-service` is a Node.js/TypeScript REST API for an e-commerce backend. Stack: Express, Prisma ORM, PostgreSQL, Zod validation, deployed via `serverless-http`.

## Commands

```bash
yarn dev              # start dev server with hot reload (tsx watch)
yarn build            # compile TypeScript to dist/
yarn typecheck        # type-check without emitting
yarn db:push          # push Prisma schema to database
yarn db:seed          # seed database with sample data
yarn prisma:generate  # regenerate Prisma client after schema changes
```

## Architecture

Feature-based module structure under `src/modules/`:

```
src/
  app.ts               # Express app factory
  server.ts            # entry point
  config/env.ts        # validated env vars (single source of truth)
  lib/
    db/prisma.ts       # Prisma client singleton
    mail.ts            # nodemailer wrapper
    cookies.ts         # cookie helpers
    httpError.ts       # HttpError class
  modules/
    auth/              # registration, login, sessions, password reset
    orders/            # order creation and retrieval
    products/          # product listing
    health/            # health check endpoint
```

### Module shape

Each module: `*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts`

### Key patterns

- Passwords hashed via `src/lib/password.ts`
- Auth uses token-based sessions stored in `AuthSession` table
- All env vars accessed through `config/env.ts` (validated with Zod on startup)
- Prices stored as integers (cents)

## Important Rules

- Following TDD (Test-Driven Development) and SOLID principles during implementation
- Never read `process.env` directly — always use `config/env.ts`
- Keep SQL/Prisma calls in `*.repository.ts` files only
- Validate external input with Zod at the controller/route boundary
- Never expose `passwordHash`, tokens, or stack traces in responses
- Run `yarn prisma:generate` after any schema change
