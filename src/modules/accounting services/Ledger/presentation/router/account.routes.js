const express = require('express');
const { validate } = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { createAccountSchema, getAccountBalanceSchema } = require('../validators/account.validator');

function createAccountRoutes(accountController) {
  const router = express.Router();

  router.use(authMiddleware); // req.actor set

  router.post('/', validate(createAccountSchema), accountController.createAccount);
  router.get('/:id/balance', validate(getAccountBalanceSchema), accountController.getBalance);
  router.get('/', accountController.listAccounts); // TODO

  return router;
}

module.exports = createAccountRoutes;