// src/routes/invoiceRoutes.js
import express from 'express';
import { z } from 'zod';
import knexConfig from '../db/knex.js'; // Initialized Knex instance
import { InvoiceRepository } from '../repositories/InvoiceRepository.js';

const router = express.Router();
const invoiceRepo = new InvoiceRepository(knexConfig);

// 1. Zod Validation Schemas
const lineItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().positive('Unit price must be a positive number'),
});

const createInvoiceSchema = z.object({
  conferenceName: z.string().min(1, 'Conference name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid client email address'),
  clientAddress: z.string().min(1, 'Client address is required'),
  issueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  eventStartDate: z.string().datetime({ offset: true }).or(z.string().date()),
  eventEndDate: z.string().datetime({ offset: true }).or(z.string().date()),
  currency: z.string().length(3).default('NGN'),
  taxRate: z.number().nonnegative().default(7.50),
  depositPaid: z.number().nonnegative().default(0.00),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  correlationId: z.string().uuid().optional(),
});

// POST /api/v1/invoices
router.post('/', async (req, res) => {
  try {
    // Validate request body against schema
    const validatedData = createInvoiceSchema.parse(req.body);

    const invoice = await invoiceRepo.createInvoice(validatedData);

    return res.status(201).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        status: 'fail',
        message: 'Validation failed',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Log operational errors in APM / Logger
    console.error('[Create Invoice Error]:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to process invoice creation',
    });
  }
});

// GET /api/v1/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Optional UUID format validation
    const invoice = await invoiceRepo.findById(id);

    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    console.error('[Get Invoice Error]:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;