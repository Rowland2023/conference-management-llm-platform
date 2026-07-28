/**
 * @file create-hold.usecase.js
 *
 * Creates a funds hold on an account.
 */

import {
  InvalidArgumentError,
  EntityNotFoundError,
  InsufficientFundsError,
} from "../domain/error/index.js";

const toBigIntSafe = (value) => {
  if (typeof value === "bigint") {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return 0n;
  }

  const normalized = String(value).trim().split(".")[0];

  if (!normalized || Number.isNaN(Number(normalized))) {
    return 0n;
  }

  return BigInt(normalized);
};

export class CreateHoldUseCase {
  constructor({
    holdRepository,
    accountRepository,
    journalEntryRepository,
    unitOfWork,
    logger,
    metrics,
  }) {
    this.holdRepository = holdRepository;
    this.accountRepository = accountRepository;
    this.journalEntryRepository = journalEntryRepository;
    this.unitOfWork = unitOfWork;
    this.logger = logger;
    this.metrics = metrics;
  }

  async execute({
    idempotencyKey,
    accountId,
    amount,
    currency,
    description,
    expiresAt,
    requestedBy,
  }) {
    const amountInMinorUnits = this.validateInput({
      idempotencyKey,
      accountId,
      amount,
      expiresAt,
    });

    const duplicate =
      await this.findDuplicate(idempotencyKey);

    if (duplicate) {
      return duplicate;
    }

    const hold =
      await this.unitOfWork.execute(async (session) => {

        const account =
          await this.loadAccount(
            accountId,
            session
          );

        const targetCurrency =
          this.resolveCurrency(
            account,
            currency
          );

        await this.ensureSufficientFunds({
          account,
          currency: targetCurrency,
          amount: amountInMinorUnits,
          session,
        });

        return this.holdRepository.create(
          {
            idempotencyKey,
            accountId: account.id,
            amount: amountInMinorUnits.toString(),
            currency: targetCurrency,
            description,
            status: "ACTIVE",
            expiresAt:
              expiresAt
                ? new Date(expiresAt)
                : null,
            createdAt: new Date(),
          },
          { session }
        );
      });

    this.recordMetrics({
      hold,
      accountId,
      amount: amountInMinorUnits,
      requestedBy,
    });

    return {
      ...hold,
      isDuplicate: false,
    };
  }

  validateInput({
    idempotencyKey,
    accountId,
    amount,
    expiresAt,
  }) {
    if (!idempotencyKey) {
      throw new InvalidArgumentError(
        "idempotencyKey is required"
      );
    }

    if (!accountId) {
      throw new InvalidArgumentError(
        "accountId is required"
      );
    }

    const amountValue =
      toBigIntSafe(amount);

    if (amountValue <= 0n) {
      throw new InvalidArgumentError(
        "Hold amount must be greater than zero"
      );
    }

    if (expiresAt) {
      const expiry =
        new Date(expiresAt);

      if (
        Number.isNaN(
          expiry.getTime()
        )
      ) {
        throw new InvalidArgumentError(
          "expiresAt must be a valid ISO-8601 date"
        );
      }

      if (
        expiry.getTime() <= Date.now()
      ) {
        throw new InvalidArgumentError(
          "expiresAt must be in the future"
        );
      }
    }

    return amountValue;
  }

  async findDuplicate(idempotencyKey) {
    const hold =
      await this.holdRepository
        .findByIdempotencyKey(
          idempotencyKey
        );

    if (!hold) {
      return null;
    }

    this.logger?.info({
      event: "HOLD_DUPLICATE_IGNORED",
      idempotencyKey,
    });

    return {
      ...hold,
      isDuplicate: true,
    };
  }

  async loadAccount(
    accountId,
    session
  ) {
    const [account] =
      await this.accountRepository
        .findAndLockByIds(
          [accountId],
          { session }
        );

    if (!account) {
      throw new EntityNotFoundError(
        `Account ${accountId} not found`
      );
    }

    if (
      account.status &&
      account.status !== "ACTIVE"
    ) {
      throw new InvalidArgumentError(
        `Account is ${account.status}`
      );
    }

    return account;
  }

  resolveCurrency(
    account,
    requestedCurrency
  ) {
    const currency =
      (
        requestedCurrency ??
        account.currency
      )?.toUpperCase();

    if (
      account.currency &&
      currency !==
        account.currency.toUpperCase()
    ) {
      throw new InvalidArgumentError(
        `Currency mismatch. Account uses ${account.currency}`
      );
    }

    return currency;
  }

  async ensureSufficientFunds({
    account,
    currency,
    amount,
    session,
  }) {
    const balances =
      await this.journalEntryRepository
        .calculateAccountBalance(
          {
            accountId: account.id,
            currency,
          },
          { session }
        );

    const posted =
      toBigIntSafe(
        balances.postedBalance
      );

    const pending =
      toBigIntSafe(
        balances.pendingBalance
      );

    const available =
      posted - pending;

    if (available < amount) {
      throw new InsufficientFundsError(
        `Available ${available} < Requested ${amount}`
      );
    }
  }

  recordMetrics({
    hold,
    accountId,
    amount,
    requestedBy,
  }) {
    const actor =
      typeof requestedBy === "object"
        ? requestedBy?.id ??
          requestedBy?.userId
        : requestedBy;

    this.logger?.info({
      event: "FUNDS_HELD",
      holdId: hold.id,
      accountId,
      amount: amount.toString(),
      currency: hold.currency,
      requestedBy: actor ?? "SYSTEM",
    });

    this.metrics?.increment(
      "ledger.hold.created",
      1,
      {
        currency: hold.currency,
      }
    );
  }
}