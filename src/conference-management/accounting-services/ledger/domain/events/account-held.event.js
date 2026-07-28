// src/conference-management/accounting-services/ledger/domain/events/account-held.event.js

import { BaseDomainEvent } from "./base-domain.event.js";
import Money from "../value-objects/money.vo.js";
import { InvalidArgumentError } from "../error/index.js";


export class AccountHeldEvent extends BaseDomainEvent {

    static EVENT_NAME = "account.held";


    constructor({
        eventId,
        accountId,
        holdId,
        idempotencyKey,
        amount,
        currency,
        expiresAt,
        metadata = {},
        occurredAt,
    }) {


        if (
            !accountId ||
            typeof accountId !== "string" ||
            !accountId.trim()
        ) {
            throw new InvalidArgumentError(
                "accountId is required"
            );
        }


        if (
            !holdId ||
            typeof holdId !== "string" ||
            !holdId.trim()
        ) {
            throw new InvalidArgumentError(
                "holdId is required"
            );
        }


        if (
            !idempotencyKey ||
            typeof idempotencyKey !== "string" ||
            !idempotencyKey.trim()
        ) {
            throw new InvalidArgumentError(
                "idempotencyKey is required"
            );
        }


        const normalizedCurrency =
            AccountHeldEvent.normalizeCurrency(currency);


        const minorAmount =
            Money.parseMinorUnitsStrict(amount);


        Money.assertPositive(minorAmount);


        const normalizedExpiry =
            AccountHeldEvent.normalizeExpiry(expiresAt);



        super({

            eventId,

            eventName:
                AccountHeldEvent.EVENT_NAME,

            aggregateId:
                accountId,

            version: 1,

            occurredAt,

            metadata,

            payload: {

                accountId,

                holdId,

                idempotencyKey,

                amount:
                    minorAmount.toString(),

                currency:
                    normalizedCurrency,

                expiresAt:
                    normalizedExpiry
            }
        });
    }



    static normalizeCurrency(currency) {

        if (
            typeof currency !== "string"
        ) {
            throw new InvalidArgumentError(
                "currency is required"
            );
        }


        const normalized =
            currency.trim().toUpperCase();


        if (!/^[A-Z]{3}$/.test(normalized)) {
            throw new InvalidArgumentError(
                `Invalid currency '${currency}'`
            );
        }


        return normalized;
    }



    static normalizeExpiry(expiresAt) {

        if (!expiresAt) {
            return null;
        }


        const date =
            expiresAt instanceof Date
                ? expiresAt
                : new Date(expiresAt);


        if (
            Number.isNaN(date.getTime())
        ) {
            throw new InvalidArgumentError(
                "expiresAt must be a valid date"
            );
        }


        return date.toISOString();
    }
}