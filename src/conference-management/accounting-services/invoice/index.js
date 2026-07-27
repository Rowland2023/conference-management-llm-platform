import knex from '../../../cross-cutting/database/knex.js';

import { PostgresInvoiceRepository } from './infrastructure/repositories/PostgresInvoiceRepository.js';

import { CreateInvoiceUseCase } from './application/use-cases/CreateInvoiceUseCase.js';
import { GetInvoiceUseCase } from './application/use-cases/GetInvoiceUseCase.js';

import { createInvoiceRouter } from './presentation/routes/invoice.routes.js';

export function createInvoiceModule() {
  // Infrastructure
  const invoiceRepository = new PostgresInvoiceRepository({ knex });

  // Application
  const createInvoiceUseCase = new CreateInvoiceUseCase({
    invoiceRepository,
  });

  const getInvoiceUseCase = new GetInvoiceUseCase({
    invoiceRepository,
  });

  // Presentation
  const router = createInvoiceRouter({
    createInvoiceUseCase,
    getInvoiceUseCase,
  });

  return {
    router,
    invoiceRepository,
    createInvoiceUseCase,
    getInvoiceUseCase,
  };
}