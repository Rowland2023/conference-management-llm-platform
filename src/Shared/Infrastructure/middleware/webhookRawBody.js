import express from 'express';
import { webhookRawBody } from '../../../../shared/infrastructure/middleware/webhookRawBody.js';
import { paymentWebhookController } from '../controllers/payment.controller.js';

const router = express.Router();

// Apply raw body capture specifically to the webhook endpoint before express.json() runs globally
router.post('/webhook', webhookRawBody(), paymentWebhookController);

export default router;