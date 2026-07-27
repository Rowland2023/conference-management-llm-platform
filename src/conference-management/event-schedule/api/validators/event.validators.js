import Joi from 'joi';

/**
 * Validation schema and helper functions for Event creation and updates.
 */

export const createEventSchema = Joi.object({
  title: Joi.string().min(3).max(150).required().messages({
    'string.base': 'Event title must be a string.',
    'string.empty': 'Event title cannot be empty.',
    'string.min': 'Event title must be at least 3 characters long.',
    'string.max': 'Event title cannot exceed 150 characters.',
    'any.required': 'Event title is required.',
  }),
  description: Joi.string().max(2000).optional().allow('').messages({
    'string.base': 'Description must be a string.',
    'string.max': 'Description cannot exceed 2000 characters.',
  }),
  startDate: Joi.date().iso().greater('now').required().messages({
    'date.base': 'Start date must be a valid date.',
    'date.format': 'Start date must be in ISO format.',
    'date.greater': 'Start date must be in the future.',
    'any.required': 'Start date is required.',
  }),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'date.base': 'End date must be a valid date.',
    'date.format': 'End date must be in ISO format.',
    'date.greater': 'End date must be strictly greater than the start date.',
    'any.required': 'End date is required.',
  }),
  location: Joi.string().min(2).max(255).required().messages({
    'string.base': 'Location must be a string.',
    'string.empty': 'Location cannot be empty.',
    'any.required': 'Location is required.',
  }),
  capacity: Joi.number().integer().min(1).max(100000).required().messages({
    'number.base': 'Capacity must be a number.',
    'number.integer': 'Capacity must be an integer.',
    'number.min': 'Capacity must be at least 1.',
    'any.required': 'Capacity is required.',
  }),
});

export const updateEventSchema = createEventSchema.fork(
  ['title', 'startDate', 'endDate', 'location', 'capacity'],
  (schema) => schema.optional()
);

/**
 * Validates event creation payload.
 * 
 * @param {Object} data - Raw request body payload
 * @returns {Object} Result object containing value or error details
 */
export function validateEventCreation(data) {
  return createEventSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validates event update payload.
 * 
 * @param {Object} data - Raw request body payload
 * @returns {Object} Result object containing value or error details
 */
export function validateEventUpdate(data) {
  return updateEventSchema.validate(data, { abortEarly: false, stripUnknown: true });
}