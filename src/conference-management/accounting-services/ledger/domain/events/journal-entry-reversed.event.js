// src/conference-management/accounting-services/ledger/domain/events/journal-entry-reversed.event.js

import { BaseDomainEvent } from "./base-domain.event.js";
import { InvalidArgumentError } from "../error/index.js";


export class JournalEntryReversedEvent extends BaseDomainEvent {

    static EVENT_NAME = "journal_entry.reversed";


    /**
     * @param {Object} props
     * @param {string} [props.eventId]
     * @param {string} props.originalJournalEntryId Entry being reversed
     * @param {string} props.reversalJournalEntryId Counter-entry created by reversal
     * @param {string} [props.reason]
     * @param {Object} [props.metadata]
     * @param {Date|string} [props.occurredAt]
     */
    constructor({
        eventId,
        originalJournalEntryId,
        reversalJournalEntryId,
        reason = "Unspecified reversal",
        metadata = {},
        occurredAt,
    }) {

        if (
            !originalJournalEntryId ||
            typeof originalJournalEntryId !== "string" ||
            !originalJournalEntryId.trim()
        ) {
            throw new InvalidArgumentError(
                "originalJournalEntryId is required"
            );
        }


        if (
            !reversalJournalEntryId ||
            typeof reversalJournalEntryId !== "string" ||
            !reversalJournalEntryId.trim()
        ) {
            throw new InvalidArgumentError(
                "reversalJournalEntryId is required"
            );
        }


        const cleanReason =
            typeof reason === "string" && reason.trim()
                ? reason.trim()
                : "Unspecified reversal";


        super({
            eventId,

            eventName: JournalEntryReversedEvent.EVENT_NAME,

            aggregateId: originalJournalEntryId,

            version: 1,

            occurredAt,

            metadata,

            payload: {
                originalJournalEntryId,
                reversalJournalEntryId,
                reason: cleanReason,
            },
        });


        Object.freeze(this);
    }
}