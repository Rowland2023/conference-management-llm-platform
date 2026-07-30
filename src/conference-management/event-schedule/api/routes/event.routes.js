// src/conference-management/event-schedule/api/routes/event.routes.js

import { Router } from "express";

export default function createEventRouter({
    eventController,
}) {
    const router = Router();

    const extractTracing = (req, res, next) => {
        const correlationId =
            req.headers["x-correlation-id"] ??
            req.headers["x-request-id"];

        const causationId =
            req.headers["x-causation-id"] ?? null;

        if (correlationId) {
            if (req.method === "GET" || req.method === "DELETE") {
                req.query.correlationId = correlationId;
                req.query.causationId = causationId;
            } else {
                req.body.correlationId = correlationId;
                req.body.causationId = causationId;
            }
        }

        next();
    };

    router.use(extractTracing);

    router.post("/", eventController.createEvent);
    router.get("/", eventController.listEvents);
    router.get("/:id", eventController.getEventById);
    router.patch("/:id/reschedule", eventController.rescheduleEvent);
    router.delete("/:id", eventController.cancelEvent);

    return router;
}