/**
 * @file get-ledger-balance.usecase.js
 *
 * Application service responsible for retrieving ledger balances.
 * Enforces:
 * - Input validation
 * - Account status checks
 * - Currency consistency
 * - Safe money serialization
 * - Observability
 */

import {
  InvalidArgumentError,
  NotFoundError,
} from "../../../../shared/application/errors/ApplicationErrors.js";

/**
 * Safely converts database numeric values into BigInt minor units.
 *
 * Handles:
 * - bigint
 * - string
 * - number
 * - decimal database values
 *
 * Example:
 * "1000.50" => 1000n
 */
function toBigIntSafe(value) {
  if (typeof value === "bigint") {
    return value;
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0n;
  }

  const normalized = String(value)
    .trim()
    .split(".")[0];

  if (
    !normalized ||
    Number.isNaN(Number(normalized))
  ) {
    return 0n;
  }

  return BigInt(normalized);
}


export class GetLedgerBalanceUseCase {

  constructor({
    accountRepository,
    journalEntryRepository,
    logger,
    metrics,
  }) {
    this.accountRepository = accountRepository;
    this.journalEntryRepository = journalEntryRepository;
    this.logger = logger;
    this.metrics = metrics;
  }


  async execute({
    accountId,
    currency,
    asOfDate,
    requestedBy,
  }) {

    /*
     * 1. Validate input
     */
    if (
      !accountId ||
      typeof accountId !== "string"
    ) {
      throw new InvalidArgumentError(
        "accountId must be a valid string"
      );
    }


    const effectiveDate = asOfDate
      ? new Date(asOfDate)
      : new Date();


    if (
      Number.isNaN(
        effectiveDate.getTime()
      )
    ) {
      throw new InvalidArgumentError(
        "asOfDate must be a valid ISO-8601 date"
      );
    }


    if (
      effectiveDate.getTime() >
      Date.now()
    ) {
      throw new InvalidArgumentError(
        "asOfDate cannot be in the future"
      );
    }



    /*
     * 2. Load account
     */
    const account =
      await this.accountRepository.findById(
        accountId
      );


    if (!account) {
      throw new NotFoundError(
        `Account ${accountId} not found`
      );
    }


    if (
      account.status &&
      account.status !== "ACTIVE"
    ) {
      throw new InvalidArgumentError(
        `Account ${accountId} is inactive`
      );
    }



    /*
     * 3. Validate currency
     */
    const targetCurrency =
      (
        currency ||
        account.currency
      ).toUpperCase();


    if (
      account.currency &&
      targetCurrency !==
      account.currency.toUpperCase()
    ) {
      throw new InvalidArgumentError(
        `Currency mismatch. Account currency is ${account.currency}`
      );
    }



    /*
     * 4. Calculate ledger balance
     */
    const balanceDetails =
      await this.journalEntryRepository
        .calculateAccountBalance({
          accountId: account.id,
          currency: targetCurrency,
          asOfDate: effectiveDate,
        });



    const postedBalance =
      toBigIntSafe(
        balanceDetails.postedBalance
      );


    const pendingBalance =
      toBigIntSafe(
        balanceDetails.pendingBalance
      );


    const availableBalance =
      postedBalance - pendingBalance;



    /*
     * 5. Observability
     */
    const actorId =
      typeof requestedBy === "object"
        ? (
            requestedBy?.id ||
            requestedBy?.userId
          )
        : requestedBy;


    this.logger?.info(
      {
        event:
          "LEDGER_BALANCE_CHECKED",

        accountId:
          account.id,

        currency:
          targetCurrency,

        asOf:
          effectiveDate.toISOString(),

        requestedBy:
          actorId || "SYSTEM",
      }
    );


    this.metrics?.increment(
      "ledger.balance.checked",
      1,
      {
        currency:
          targetCurrency,
      }
    );



    /*
     * 6. Return immutable response
     */
    return {

      accountId:
        account.id,


      accountName:
        account.name,


      currency:
        targetCurrency,


      balance:
        postedBalance.toString(),


      pendingBalance:
        pendingBalance.toString(),


      availableBalance:
        availableBalance.toString(),


      asOf:
        effectiveDate.toISOString(),
    };
  }
}