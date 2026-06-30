const { z } = require('zod');
const { ValidationError } = require('../utils/errors');

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        });
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return next(new ValidationError(`Validation failed: ${messages}`));
        }
        next(err);
    }
};

module.exports = validate;
