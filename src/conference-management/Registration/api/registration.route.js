// src/conference-management/registration/api/registration.route.js

import { Router } from "express";

import { authenticate } from "../../authentication/presentation/middleware/authenticate.js";
import { validate } from "../../../shared/infrastructure/middleware/validate.js";

import {
    createRegistrationSchema,
    updateRegistrationSchema,
    registrationIdSchema,
    registrationQuerySchema,
    checkInRegistrationSchema,
    cancelRegistrationSchema,
} from "./validators/registration.schema.js";

export function getRegistrationRoutes(registrationController) {

    const router = Router();

    router.post(
        "/",
        authenticate,
        validate(createRegistrationSchema, "body"),
        registrationController.createRegistration,
    );

    router.get(
        "/",
        authenticate,
        validate(registrationQuerySchema, "query"),
        registrationController.getAllRegistrations,
    );

    router.get(
        "/:id",
        authenticate,
        validate(registrationIdSchema, "params"),
        registrationController.getRegistrationById,
    );

    router.patch(
        "/:id",
        authenticate,
        validate(updateRegistrationSchema, "body"),
        registrationController.updateRegistration,
    );

    router.post(
        "/:id/check-in",
        authenticate,
        validate(checkInRegistrationSchema, "params"),
        registrationController.checkInRegistration,
    );

    router.delete(
        "/:id",
        authenticate,
        validate(cancelRegistrationSchema, "params"),
        registrationController.cancelRegistration,
    );

    return router;
}