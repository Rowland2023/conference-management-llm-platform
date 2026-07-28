/**
 * @file src/presentation/controllers/account.controller.js
 *
 * Account HTTP Controller handling account lifecycle and balance query orchestration.
 */

import AccountSerializer from "../serializers/account.serializer.js";

export default class AccountController {
  constructor({
    createAccountUseCase,
    getAccountBalanceUseCase,
  }) {
    this.createAccountUseCase = createAccountUseCase;
    this.getAccountBalanceUseCase = getAccountBalanceUseCase;
  }

  /**
   * Handles HTTP POST /accounts
   * Uses arrow syntax to preserve class instance binding during Express router delegation.
   */
  createAccount = async (req, res, next) => {
    try {
      // Enforce tenant boundary from authenticated actor context
      const commandPayload = {
        ...req.body,
        tenantId: req.actor.tenantId,
        createdBy: req.actor.id,
      };

      const account =
        await this.createAccountUseCase.execute(commandPayload);

      return res.status(201).json({
        success: true,
        data: AccountSerializer.serialize(account),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles HTTP GET /accounts/:id/balance
   */
  getBalance = async (req, res, next) => {
    try {
      const queryPayload = {
        id: req.params.id,
        tenantId: req.actor.tenantId,
      };

      const account =
        await this.getAccountBalanceUseCase.execute(queryPayload);

      return res.status(200).json({
        success: true,
        data: AccountSerializer.serialize(account),
      });
    } catch (err) {
      next(err);
    }
  };
}