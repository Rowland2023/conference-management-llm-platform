import express from "express";

import { validate } from "../../../../../shared/infrastructure/middleware/validate.js";
import { authGuard } from "../../../../../shared/infrastructure/middleware/authGuard.js";
import {
  createAccountSchema,
  getAccountBalanceSchema,
} from "../validators/account.validator.js";

export default function createAccountRoutes(accountController) {
  const router = express.Router();

  router.use(authMiddleware); // req.actor set

  router.post(
    "/",
    validate(createAccountSchema),
    accountController.createAccount
  );

  router.get(
    "/:id/balance",
    validate(getAccountBalanceSchema),
    accountController.getBalance
  );

  router.get(
    "/",
    accountController.listAccounts
  ); // TODO

  return router;
}