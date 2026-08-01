import Joi from "joi";

/**
 * Shared validators
 */
const startDate = Joi.date()
    .iso()
    .greater("now")
    .required();

const endDate = Joi.date()
    .iso()
    .greater(Joi.ref("startDate"))
    .required();

/**
 * Base event fields
 */
const eventFields = {
    title: Joi.string()
        .min(3)
        .max(150)
        .required(),

    description: Joi.string()
        .max(2000)
        .allow("")
        .optional(),

    startDate,

    endDate,

    location: Joi.string()
        .min(2)
        .max(255)
        .required(),

    capacity: Joi.number()
        .integer()
        .min(1)
        .max(100000)
        .required(),
};

/**
 * Create Event
 */
export const createEventSchema = Joi.object(eventFields);

/**
 * Update Event
 */
export const updateEventSchema = createEventSchema.fork(
    Object.keys(eventFields),
    schema => schema.optional()
);

/**
 * Event identifier
 */
export const eventIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required(),
});

/**
 * Event query parameters
 */
export const eventQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),
});

/**
 * Event rescheduling
 */
export const rescheduleEventSchema = Joi.object({
    startDate,
    endDate,
});