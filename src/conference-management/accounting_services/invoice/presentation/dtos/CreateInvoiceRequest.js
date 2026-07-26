// modules/invoicing/application/dtos/CreateInvoiceRequest.js
import Joi from 'joi';

const lineItemSchema = Joi.object({
  category: Joi.string()
    .valid(
      'MANAGEMENT_FEE',
      'VENDOR_PASS_THROUGH',
      'TECHNOLOGY',
      'ON_SITE_STAFF',
      'INCIDENTAL'
    )
    .required()
    .messages({
      'any.only': 'Category must be a valid invoice category type.',
    }),

  description: Joi.string().trim().max(255).required(),

  quantity: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Line item quantity must be greater than zero.',
  }),

  unitPrice: Joi.number().min(0).precision(2).required().messages({
    'number.min': 'Unit price cannot be negative.',
  }),
});

export const createInvoiceSchema = Joi.object({
  conferenceName: Joi.string().trim().max(255).required(),
  clientName: Joi.string().trim().max(255).required(),
  clientEmail: Joi.string().email().trim().lowercase().required(),
  clientAddress: Joi.string().trim().required(),

  currency: Joi.string()
    .trim()
    .uppercase()
    .length(3)
    .default('NGN')
    .messages({
      'string.length': 'Currency must be a valid 3-letter ISO code (e.g., NGN, USD).',
    }),

  issueDate: Joi.date().iso().required(),
  dueDate: Joi.date()
    .iso()
    .min(Joi.ref('issueDate'))
    .required()
    .messages({
      'date.min': 'Due date cannot be earlier than issue date.',
    }),

  eventStartDate: Joi.date().iso().required(),
  eventEndDate: Joi.date()
    .iso()
    .min(Joi.ref('eventStartDate'))
    .required()
    .messages({
      'date.min': 'Event end date cannot be earlier than event start date.',
    }),

  taxRate: Joi.number().min(0).max(100).precision(2).default(7.50),
  depositPaid: Joi.number().min(0).precision(2).default(0.00),

  items: Joi.array().items(lineItemSchema).min(1).required().messages({
    'array.min': 'An invoice must contain at least one line item.',
  }),
});

export class CreateInvoiceRequest {
  /**
   * Validates and sanitizes incoming payload
   * @param {Object} payload 
   * @returns {Object} Sanitized DTO
   */
  static validate(payload) {
    const { error, value } = createInvoiceSchema.validate(payload, {
      abortEarly: false, // Capture all validation errors at once
      stripUnknown: true, // Clean out unexpected fields
      convert: true, // Coerce types (e.g., string numbers to numeric)
    });

    if (error) {
      const details = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 422;
      validationError.details = details;
      throw validationError;
    }

    return value; // Returns sanitized and coerced DTO payload
  }
}