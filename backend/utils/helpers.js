/**
 * Utility Helpers
 * Date formatting, pagination parsing, and common validators.
 */

/**
 * Parse pagination params from query string.
 * Defaults: page 1, limit 20, max limit 100.
 */
const parsePagination = (query) => {
    let page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

/**
 * Format a Date object as YYYY-MM-DD (IST-safe).
 */
const formatDate = (date = new Date()) => {
    return date.toISOString().split('T')[0];
};

/**
 * Get current month and year as integers.
 */
const getCurrentPeriod = () => {
    const now = new Date();
    return {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
    };
};

/**
 * Sanitize string — trim and collapse whitespace.
 */
const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' ');
};

/**
 * Check if a value looks like a valid UUID v4.
 */
const isUUID = (str) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

module.exports = {
    parsePagination,
    formatDate,
    getCurrentPeriod,
    sanitize,
    isUUID,
};
