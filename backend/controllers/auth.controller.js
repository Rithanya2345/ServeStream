/**
 * Auth Controller
 * Handles user login and registration.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const { success } = require('../utils/response');
const { UnauthorizedError, ConflictError } = require('../utils/errors');
const auditService = require('../services/audit.service');

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const result = await query(
            `SELECT u.*, rs.shop_code, rs.name AS shop_name
       FROM users u
       LEFT JOIN ration_shops rs ON rs.id = u.shop_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
            [email]
        );

        if (result.rowCount === 0) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const user = result.rows[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Generate JWT
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            shopId: user.shop_id,
            districtId: user.district_id,
        };

        const token = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });

        // Update last login
        await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

        return success(res, {
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                shop_id: user.shop_id,
                shop_code: user.shop_code,
                shop_name: user.shop_name,
                district_id: user.district_id,
            },
        }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/register
 * Creates a new user account. Only super_admin can create users.
 */
const register = async (req, res, next) => {
    try {
        const { email, password, full_name, full_name_ta, phone, role, shop_id, district_id } = req.body;

        // Check if email exists
        const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (existing.rowCount > 0) {
            throw new ConflictError('A user with this email already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await query(
            `INSERT INTO users (email, password_hash, full_name, full_name_ta, phone, role, shop_id, district_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, full_name, role, shop_id, district_id, created_at`,
            [email, passwordHash, full_name, full_name_ta || null, phone || null, role, shop_id || null, district_id || null]
        );

        const newUser = result.rows[0];

        // Audit
        auditService.log({
            userId: req.user?.id,
            action: 'user.registered',
            entityType: 'users',
            entityId: newUser.id,
            newValues: { email, full_name, role, shop_id, district_id },
            ipAddress: req.ip,
        });

        return success(res, newUser, 'User registered successfully', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getProfile = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT u.id, u.email, u.full_name, u.full_name_ta, u.phone, u.role,
              u.shop_id, u.district_id, u.last_login_at, u.created_at,
              rs.shop_code, rs.name AS shop_name,
              d.name AS district_name
       FROM users u
       LEFT JOIN ration_shops rs ON rs.id = u.shop_id
       LEFT JOIN districts d ON d.id = u.district_id
       WHERE u.id = $1`,
            [req.user.id]
        );

        return success(res, result.rows[0], 'Profile retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = { login, register, getProfile };
