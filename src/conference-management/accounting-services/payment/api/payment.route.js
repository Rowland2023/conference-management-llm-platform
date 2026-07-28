import express from "express";

import { authGuard } from "../../../../shared/infrastructure/middleware/authGuard.js";
import { validate } from "../../../../shared/infrastructure/middleware/validate.js";
import { webhookRawBody } from "../../../../shared/infrastructure/middleware/webhookRawBody.js";
import { rateLimit } from "../../../../shared/infrastructure/middleware/rateLimit.js";
import { ipAllowlist } from "../../../../shared/infrastructure/middleware/ipAllowlist.js";
import { idempotency } from "../../../../shared/infrastructure/middleware/idempotency.js";

import {
  createPaymentSchema,
  refundPaymentSchema,
  getPaymentByIdSchema,
} from "./validators/payment.schema.js";

const STRIPE_IPS = [
  "3.18.12.63/32",
  "3.130.192.231/32",
  "54.187.174.169/32",
  "54.187.205.235/32",
  "54.187.216.72/32",
];

const PAYSTACK_IPS = [
  "52.31.139.75/32",
  "52.49.173.169/32",
  "52.214.14.220/32",
];

export default function createPaymentRouter({
  paymentController,
  paymentWebhookController,
}) {
  const router = express.Router();

  router.post(
    "/payments",
    rateLimit({
      max: 10,
      windowMs: 60000,
      keyGenerator: (req) => req.user?.id || req.ip,
    }),
    authGuard(),
    validate(createPaymentSchema),
    idempotency(),
    paymentController.createPayment
  );

  router.get(
    "/payments/:id",
    validate(getPaymentByIdSchema),
    rateLimit({
      max: 100,
      windowMs: 60000,
    }),
    authGuard(),
    paymentController.getPaymentById
  );

  router.get(
    "/payments",
    rateLimit({
      max: 20,
      windowMs: 60000,
    }),
    authGuard("admin"),
    paymentController.getAllPayments
  );

  router.post(
    "/payments/:id/refund",
    validate(refundPaymentSchema),
    rateLimit({
      max: 5,
      windowMs: 60000,
    }),
    authGuard("admin"),
    idempotency(),
    paymentController.refundPayment
  );

  router.post(
    "/webhooks/paystack",
    ipAllowlist(PAYSTACK_IPS),
    webhookRawBody(),
    paymentWebhookController.handlePaystackWebhook
  );

  router.post(
    "/webhooks/stripe",
    ipAllowlist(STRIPE_IPS),
    webhookRawBody(),
    paymentWebhookController.handleStripeWebhook
  );

  return router;
}