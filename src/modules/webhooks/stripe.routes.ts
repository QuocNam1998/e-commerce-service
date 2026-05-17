import express, { Router } from "express";
import { handleStripeWebhook } from "./stripe.handler.js";

export const stripeWebhookRouter = Router();

// express.raw is required so stripe.webhooks.constructEvent receives the raw Buffer
stripeWebhookRouter.post("/", express.raw({ type: "application/json" }), handleStripeWebhook);
