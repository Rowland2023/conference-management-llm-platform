import express from 'express';
import { ipAllowlist } from '../../../../shared/infrastructure/middleware/ipAllowlist.js';

const router = express.Router();

// Define trusted IP addresses (e.g., internal services or admin office IPs)
const trustedIps = ['192.168.1.50', '203.0.113.195'];

// Protect payout endpoints using the allowlist
router.post('/payouts/trigger', ipAllowlist(trustedIps), payoutController);

export default router;