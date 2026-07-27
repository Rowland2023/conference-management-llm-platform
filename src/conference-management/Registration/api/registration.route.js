import { Router } from "express";
import { authenticate } from "../../../shared-security-starter/presentation/authenticate.js";
import { validate } from "../../../shared/Infrastructure/middleware/validate.js";

import {
  createRegistrationSchema,
  updateRegistrationSchema,
  registrationIdSchema,
  registrationQuerySchema,
  checkInRegistrationSchema,
  cancelRegistrationSchema,
} from "./validators/registration.schema.js";

export const getRegistrationRoutes = (registrationController) => {
  const router = Router();

  router.post(
    "/",
    authenticate,
    validate(createRegistrationSchema),
    registrationController.createRegistration
  );

  router.get(
    "/",
    authenticate,
    validate(registrationQuerySchema),
    registrationController.getAllRegistrations
  );

  router.get(
    "/:id",
    authenticate,
    validate(registrationIdSchema),
    registrationController.getRegistrationById
  );

  router.patch(
    "/:id",
    authenticate,
    validate(updateRegistrationSchema),
    registrationController.updateRegistration
  );

  router.post(
    "/:id/check-in",
    authenticate,
    validate(checkInRegistrationSchema),
    registrationController.checkInRegistration
  );

  router.delete(
    "/:id",
    authenticate,
    validate(cancelRegistrationSchema),
    registrationController.cancelRegistration
  );

  return router;
};