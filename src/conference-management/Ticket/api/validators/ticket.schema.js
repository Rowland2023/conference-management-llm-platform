// src/conference-management/ticket/api/validators/ticket.schema.js

import Joi from "joi";

/**
 * Shared validators
 */
const ticketId = Joi.string()
    .uuid()
    .required();

const seatNumber = Joi.string()
    .trim()
    .max(50);

const reservationId = Joi.string()
    .uuid();

/**
 * Ticket fields
 */
const ticketFields = {
    conferenceId: Joi.string()
        .uuid()
        .required(),

    attendeeId: Joi.string()
        .uuid()
        .required(),

    ticketTypeId: Joi.string()
        .uuid()
        .required(),

    seatNumber,

    price: Joi.number()
        .min(0)
        .required(),

    currency: Joi.string()
        .length(3)
        .uppercase()
        .required(),
};

/**
 * Create Ticket
 */
export const createTicketSchema = Joi.object(ticketFields);

/**
 * Ticket identifier
 */
export const ticketIdSchema = Joi.object({
    id: ticketId,
});

/**
 * Ticket listing
 */
export const ticketQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),

    conferenceId: Joi.string()
        .uuid()
        .optional(),

    attendeeId: Joi.string()
        .uuid()
        .optional(),

    status: Joi.string()
        .valid(
            "AVAILABLE",
            "RESERVED",
            "SOLD",
            "CANCELLED"
        )
        .optional(),
});

/**
 * Reserve Ticket
 */
export const reserveTicketSchema = Joi.object({
    reservationId: reservationId.required(),
});

/**
 * Release Ticket
 */
export const releaseTicketSchema = Joi.object({
    reservationId,
});

/**
 * Cancel Ticket
 */
export const cancelTicketSchema = Joi.object({
    reason: Joi.string()
        .max(500)
        .optional(),
});