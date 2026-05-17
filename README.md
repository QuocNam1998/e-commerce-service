# Commerce Service

Standalone Node.js service intended to handle API requests for `ecommerce-web` as the frontend grows beyond local-only data access.

## What is included

- Express + TypeScript server scaffold
- Route modules for health, products, and auth
- Shared request validation with Zod
- Centralized error handling
- Mock product repository that can be replaced with Prisma or another data source later

## Quick start

```bash
yarn --cwd services/commerce-service install
yarn service:dev
```

The service runs on `http://localhost:4000` by default.

## Planned evolution

1. Replace the mock repository in `src/modules/products/products.repository.ts` with Prisma-backed queries.
2. Add persistent auth/session handling.
3. Point the Next.js frontend at this service for product, cart, and checkout requests.
