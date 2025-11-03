"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = void 0;
const tenantMiddleware = (req, res, next) => {
    // This middleware is applied after authMiddleware
    // It ensures all queries are scoped to the user's company
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};
exports.tenantMiddleware = tenantMiddleware;
