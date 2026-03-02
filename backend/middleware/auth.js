/**
 * JWT Authentication Middleware
 * Verifies the Bearer token in the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET);

        // Attach user info to the request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            shopId: decoded.shopId || null,
            districtId: decoded.districtId || null,
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Token has expired'));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(new UnauthorizedError('Invalid token'));
        }
        next(err);
    }
};

/**
 * Optional authentication — does not reject if no token is present,
 * but populates req.user if a valid token exists.
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, env.JWT_SECRET);
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                shopId: decoded.shopId || null,
                districtId: decoded.districtId || null,
            };
        }
    } catch {
        // Silently ignore – user stays unauthenticated
    }
    next();
};

module.exports = { authenticate, optionalAuth };
