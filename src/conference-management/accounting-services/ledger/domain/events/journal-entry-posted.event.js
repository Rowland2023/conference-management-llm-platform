// src/conference-management/accounting-services/ledger/domain/events/journal-entry-posted.event.js

import { BaseDomainEvent } from "./base-domain.event.js";
import { InvalidArgumentError } from "../error/index.js";


export class JournalEntryPostedEvent extends BaseDomainEvent {

    static EVENT_NAME = "journal_entry.posted";


    constructor({
        eventId,
        journalEntryId,
        idempotencyKey,
        lines,
        description = "",
        metadata = {},
        occurredAt
    }) {

        if (!journalEntryId || typeof journalEntryId !== "string" || !journalEntryId.trim()) {
            throw new InvalidArgumentError(
                "journalEntryId is required"
            );
        }


        if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
            throw new InvalidArgumentError(
                "idempotencyKey is required"
            );
        }


        if (!Array.isArray(lines) || lines.length < 2) {
            throw new InvalidArgumentError(
                "Journal entry requires at least two lines"
            );
        }


        const serializedLines = lines.map((line, index) => {

            if (
                !line.accountId ||
                !line.direction ||
                line.amount === undefined ||
                line.amount === null
            ) {
                throw new InvalidArgumentError(
                    `Invalid journal line at index ${index}`
                );
            }


            return {
                accountId: line.accountId,

                amount:
                    typeof line.amount === "bigint"
                        ? line.amount.toString()
                        : String(line.amount),

                direction: line.direction,

                currency: line.currency
            };
        });


        super({
            eventId,
            eventName: JournalEntryPostedEvent.EVENT_NAME,
            aggregateId: journalEntryId,

            payload: {
                journalEntryId,
                idempotencyKey,
                description,
                lines: serializedLines
            },

            metadata,

            occurredAt,

            version: 1
        });
    }
}