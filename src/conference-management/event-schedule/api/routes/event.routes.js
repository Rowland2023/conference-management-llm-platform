// src/conference-management/event-schedule/api/routes/event.routes.js

import { Router } from "express";

import { authenticate } from "../../../authentication/presentation/middleware/authenticate.js";

import { correlationIdMiddleware } from "../../../../shared/infrastructure/middleware/correlationId.js";
import { validate } from "../../../../shared/infrastructure/middleware/validate.js";

import {
    createEventSchema,
    eventIdSchema,
    eventQuerySchema,
    rescheduleEventSchema,
} from "../validators/event.validators.js";

export default function createEventRouter({ eventController }) {
    const router = Router();

    // Cross-cutting middleware
    router.use(correlationIdMiddleware);
    router.use(authenticate);

    // Commands

    router.post(
        "/",
        validate(createEventSchema, "body"),
        eventController.createEvent
    );

    router.patch(
        "/:id/reschedule",
        validate(eventIdSchema, "params"),
        validate(rescheduleEventSchema, "body"),
        eventController.rescheduleEvent
    );

    router.delete(
        "/:id",
        validate(eventIdSchema, "params"),
        eventController.cancelEvent
    );

    // Queries

    router.get(
        "/",
        validate(eventQuerySchema, "query"),
        eventController.listEvents
    );

    router.get(
        "/:id",
        validate(eventIdSchema, "params"),
        eventController.getEventById
    );

    return router;
}