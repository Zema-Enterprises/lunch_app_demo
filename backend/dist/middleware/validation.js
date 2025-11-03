"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            // Format validation errors into a user-friendly message
            const firstError = error.errors[0];
            let message = 'Validation error';
            if (firstError) {
                const field = firstError.path[firstError.path.length - 1];
                message = `${field} ${firstError.message}`.toLowerCase();
            }
            return res.status(400).json({
                message,
                errors: error.errors,
            });
        }
        next(error);
    }
};
exports.validate = validate;
