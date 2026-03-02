/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Usage in routes:
 *   router.get('/admin-only', authenticate, authorize('super_admin'), handler);
 *   router.get('/shop-or-admin', authenticate, authorize('super_admin', 'shop_operator'), handler);
 * 
 * Role hierarchy (highest to lowest):
 *   super_admin > district_admin > shop_operator > auditor
 */
const { ForbiddenError } = require('../utils/errors');

/**
 * Returns middleware that checks if req.user.role is in the allowed list.
 * @param  {...string} allowedRoles  One or more role strings
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ForbiddenError('Authentication required'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new ForbiddenError(
                    `Role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
                )
            );
        }

        next();
    };
};

/**
 * Middleware that restricts shop_operators to their own shop's data.
 * Checks req.params.shopId or req.query.shopId against req.user.shopId.
 * super_admin and district_admin can access any shop.
 */
const restrictToOwnShop = (req, res, next) => {
    if (!req.user) {
        return next(new ForbiddenError('Authentication required'));
    }

    // Super admins and district admins can access any shop
    if (['super_admin', 'district_admin', 'auditor'].includes(req.user.role)) {
        return next();
    }

    // Shop operators can only access their own shop
    const requestedShopId = req.params.shopId || req.query.shopId || req.body.shop_id;

    if (requestedShopId && requestedShopId !== req.user.shopId) {
        return next(new ForbiddenError('You can only access data for your own shop'));
    }

    next();
};

module.exports = { authorize, restrictToOwnShop };
