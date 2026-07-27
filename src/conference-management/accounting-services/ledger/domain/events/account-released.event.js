// src/conference-management/accounting-services/ledger/domain/events/account-released.event.js

import { BaseDomainEvent } from "./base-domain.event.js";
import { InvalidArgumentError } from "../error/index.js";


export class AccountReleasedEvent extends BaseDomainEvent {

    static EVENT_NAME = "account.released";


    /**
     * @param {Object} props
     * @param {string} [props.eventId]
     * @param {string} props.accountId
     * @param {string} props.holdId
     * @param {bigint|string|number} props.releasedAmount
     * @param {string} [props.reason]
     * @param {Object} [props.metadata]
     * @param {Date|string} [props.occurredAt]
     */
    constructor({
        eventId,
        accountId,
        holdId,
        releasedAmount,
        reason = "Hold released",
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


        const amount =
            AccountReleasedEvent.parseMinorUnitsStrict(
                releasedAmount
            );


        if (amount <= 0n) {
            throw new InvalidArgumentError(
                "releasedAmount must be greater than zero"
            );
        }


        const cleanReason =
            typeof reason === "string" && reason.trim()
                ? reason.trim()
                : "Hold released";


        super({

            eventId,

            eventName:
                AccountReleasedEvent.EVENT_NAME,

            aggregateId:
                accountId,

            version: 1,

            occurredAt,

            metadata,

            payload: {

                accountId,

                holdId,

                releasedAmount:
                    amount.toString(),

                reason: cleanReason,
            }
        });
    }


    /**
     * Strict financial amount parser.
     *
     * Ledger events MUST use minor units:
     *
     * 10025 = $100.25
     *
     * Decimal values are rejected.
     */
    static parseMinorUnitsStrict(value) {


        if (typeof value === "bigint") {
            return value;
        }


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            throw new InvalidArgumentError(
                "releasedAmount is required"
            );
        }


        const stringValue =
            String(value).trim();


        if (stringValue.includes(".")) {
            throw new InvalidArgumentError(
                "releasedAmount must be an integer minor-unit value"
            );
        }


        try {

            return BigInt(stringValue);

        } catch {

            throw new InvalidArgumentError(
                `Invalid releasedAmount '${stringValue}'`
            );
        }
    }
}