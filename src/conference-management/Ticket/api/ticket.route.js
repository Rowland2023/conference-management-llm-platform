import { Router } from "express";

import { authenticate } from "../../authentication/presentation/middleware/authenticate.js";

import { correlationIdMiddleware } from "../../../shared/infrastructure/middleware/correlationId.js";
import { idempotency } from "../../../shared/infrastructure/middleware/idempotency.js";
import { validate } from "../../../shared/infrastructure/middleware/validate.js";

import {
    createTicketSchema,
    ticketIdSchema,
    reserveTicketSchema,
    releaseTicketSchema,
    cancelTicketSchema,
    ticketQuerySchema,
} from "./validators/ticket.schema.js";

export function createTicketRouter(ticketController) {
    const router = Router();

    // Cross-cutting middleware
    router.use(correlationIdMiddleware);
    router.use(authenticate);

    // Helper to preserve controller context
    const handler = (method) => (req, res, next) =>
        ticketController[method](req, res, next);

    // Commands

    router.post(
        "/",
        idempotency,
        validate(createTicketSchema, "body"),
        handler("createTicket")
    );

    router.post(
        "/:id/reserve",
        idempotency,
        validate(ticketIdSchema, "params"),
        validate(reserveTicketSchema, "body"),
        handler("reserveTicket")
    );

    router.post(
        "/:id/release",
        idempotency,
        validate(ticketIdSchema, "params"),
        validate(releaseTicketSchema, "body"),
        handler("releaseTicket")
    );

    router.post(
        "/:id/cancel",
        idempotency,
        validate(ticketIdSchema, "params"),
        validate(cancelTicketSchema, "body"),
        handler("cancelTicket")
    );

    // Queries

    router.get(
        "/",
        validate(ticketQuerySchema, "query"),
        handler("listTickets")
    );

    router.get(
        "/:id",
        validate(ticketIdSchema, "params"),
        handler("getTicketById")
    );

    return router;
}