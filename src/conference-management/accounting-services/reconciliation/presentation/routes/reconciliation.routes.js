// reconciliation/presentation/routes/reconciliation.routes.js

import { Router } from "express";

export function createReconciliationRouter({

    controller,

    authMiddleware,

    validate,

    validators,

}) {

    const router = Router();

    router.post(
        "/",
        authMiddleware,
        validate(validators.start),
        controller.start
    );

    router.post(
        "/:id/resolve",
        authMiddleware,
        validate(validators.resolve),
        controller.resolve
    );

    router.post(
        "/:id/complete",
        authMiddleware,
        controller.complete
    );

    router.get(
        "/",
        authMiddleware,
        controller.list
    );

    return router;

}