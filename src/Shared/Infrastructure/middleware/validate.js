import { ValidationError } from "../../application/errors/ApplicationErrors.js";

/**
 * Validate HTTP request input against a schema.
 *
 * @param {Object} schema Validation schema
 * @param {"body"|"query"|"params"} property Request property
 */
export const validate = (schema, property = "body") => {
    return (req, res, next) => {
        try {
            const input = extractInput(req, property);

            console.log("property:", property);
            console.log("input:", input);
            console.log("req.query:", req.query);

            req[property] = parse(schema, input);

            next();
        } catch (error) {
            next(error);
        }
    };
};

function extractInput(req, property) {

    return {
        body: req.body,
        query: req.query,
        params: req.params
    }[property] ?? {};
}


function parse(schema, input) {

    if (isZodSchema(schema)) {
        return parseZod(schema, input);
    }

    if (isJoiSchema(schema)) {
        return parseJoi(schema, input);
    }

    throw new ValidationError(
        "Unsupported validation schema"
    );
}


function isZodSchema(schema) {
    return typeof schema.safeParse === "function";
}


function isJoiSchema(schema) {
    return typeof schema.validate === "function";
}


function parseZod(schema, input) {

    const result = schema.safeParse(input);

    if (!result.success) {
        throw new ValidationError(
            formatZodError(result.error)
        );
    }

    return result.data;
}


function parseJoi(schema, input) {

    const result = schema.validate(input, {
        abortEarly: false,
        stripUnknown: true
    });

    if (result.error) {
        throw new ValidationError(
            formatJoiError(result.error)
        );
    }

    return result.value;
}


function formatZodError(error) {

    const issues = error.issues ?? error.errors ?? [];

    return issues
        .map(issue => {
            const field = issue.path.length
                ? issue.path.join(".")
                : "request";

            return `${field}: ${issue.message}`;
        })
        .join(", ");
}


function formatJoiError(error) {

    return error.details
        .map(detail => detail.message)
        .join(", ");
}