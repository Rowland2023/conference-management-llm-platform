import { ValidationError } from "../../application/errors/ApplicationErrors.js";

/**
 * Express middleware to validate request data against a schema.
 * @param {Object} schema - The validation schema (e.g., Zod or Joi schema).
 * @param {string} property - The request property to validate (e.g., 'body', 'query', 'params').
 */
export const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        try {
            const dataToValidate = req[property];

            // If using Zod: schema.parse(dataToValidate) or schema.safeParse(...)
            // If using Joi: schema.validate(dataToValidate)
            const result = schema.safeParse ? schema.safeParse(dataToValidate) : schema.validate(dataToValidate);

            // Handle Zod style
            if (schema.safeParse) {
                if (!result.success) {
                    const errorMessage = result.error.errors.map(err => err.message).join(', ');
                    throw new ValidationError(errorMessage);
                }
                req[property] = result.data; // Assign parsed/sanitized data
            } 
            // Handle Joi style
            else if (result.error) {
                const errorMessage = result.error.details.map(detail => detail.message).join(', ');
                throw new ValidationError(errorMessage);
            } else {
                req[property] = result.value;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};