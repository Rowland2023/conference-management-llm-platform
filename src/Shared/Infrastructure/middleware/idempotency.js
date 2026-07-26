import express from 'express';
import { idempotencyMiddleware } from '../../../../shared/infrastructure/middleware/idempotency.js';
import { redisClient } from '../../../../shared/infrastructure/database/redis.js'; // Your Redis client
import { processPaymentController } from '../controllers/payment.controller.js';

const router = express.Router();

// Apply idempotency specifically to financial charge/transfer endpoints (24-hour TTL)
router.post('/charge', idempotencyMiddleware(redisClient, 86400), processPaymentController);

export default router;