import express from 'express';
import { z } from 'zod';

export function createInvoiceRouter({
  createInvoiceUseCase,
  getInvoiceUseCase,
}) {
  const router = express.Router();

  const lineItemSchema = z.object({
    category: z.string().min(1),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  });

  const createInvoiceSchema = z.object({
    conferenceName: z.string().min(1),
    clientName: z.string().min(1),
    clientEmail: z.string().email(),
    clientAddress: z.string().min(1),

    issueDate: z.string(),
    dueDate: z.string(),

    eventStartDate: z.string(),
    eventEndDate: z.string(),

    currency: z.string().length(3).default('NGN'),

    taxRate: z.number().nonnegative().default(7.5),

    depositPaid: z.number().nonnegative().default(0),

    items: z.array(lineItemSchema).min(1),

    correlationId: z.string().uuid().optional(),
  });

  router.post('/', async (req, res, next) => {
    try {
      const command = createInvoiceSchema.parse(req.body);

      const invoice = await createInvoiceUseCase.execute(command);

      res.status(201).json(invoice);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const invoice = await getInvoiceUseCase.execute({
        id: req.params.id,
      });

      if (!invoice) {
        return res.sendStatus(404);
      }

      res.json(invoice);
    } catch (err) {
      next(err);
    }
  });

  return router;
}