import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { pinoHttp } from 'pino-http';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { HttpError } from './lib/httpError.js';
import { addressesRouter } from './modules/addresses/index.js';
import { authRouter } from './modules/auth/index.js';
import { adminUsersRouter } from './modules/auth/auth.admin.routes.js';
import { cartRouter } from './modules/cart/index.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { checkoutRouter } from './modules/checkout/index.js';
import { healthRouter } from './modules/health/health.routes.js';
import { adminOrdersRouter } from './modules/orders/orders.admin.routes.js';
import { ordersRouter } from './modules/orders/index.js';
import { productsRouter } from './modules/products/products.routes.js';
import { stripeWebhookRouter } from './modules/webhooks/stripe.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // Must be registered before express.json() so Stripe receives the raw body Buffer
  app.use('/webhooks/stripe', stripeWebhookRouter);

  app.use(express.json());

  app.get('/', (_request, response) => {
    response.json({
      message: 'Commerce service is running.',
      docs: {
        health: '/health',
        products: `${env.API_PREFIX}/products`,
        authLogin: `${env.API_PREFIX}/auth/login`,
      },
    });
  });

  app.use('/health', healthRouter);
  app.use(`${env.API_PREFIX}/products`, productsRouter);
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/orders`, ordersRouter);
  app.use(`${env.API_PREFIX}/admin/orders`, adminOrdersRouter);
  app.use(`${env.API_PREFIX}/admin/users`, adminUsersRouter);
  app.use(`${env.API_PREFIX}/categories`, categoriesRouter);
  app.use(`${env.API_PREFIX}/addresses`, addressesRouter);
  app.use(`${env.API_PREFIX}/cart`, cartRouter);
  app.use(`${env.API_PREFIX}/checkout`, checkoutRouter);

  app.use((request, _response, next) => {
    next(new HttpError(404, `Route ${request.method} ${request.originalUrl} was not found.`));
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        message: 'Validation failed.',
        issues: error.issues,
      });
      return;
    }

    if (error instanceof HttpError) {
      response.status(error.statusCode).json({
        message: error.message,
      });
      return;
    }

    logger.error(error);

    response.status(500).json({
      message: 'Internal server error.',
    });
  });

  return app;
}
