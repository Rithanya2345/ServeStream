/**
 * ═══════════════════════════════════════════════════════════════════════
 * Centralized IVR-Enabled Ration Distribution Management System
 * Express.js Server Entry Point
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { pool } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// ─── Route Imports ───
const authRoutes = require('./routes/auth.routes');
const districtRoutes = require('./routes/district.routes');
const rationShopRoutes = require('./routes/rationShop.routes');
const rationCardRoutes = require('./routes/rationCard.routes');
const commodityRoutes = require('./routes/commodity.routes');
const shopStockRoutes = require('./routes/shopStock.routes');
const tokenRoutes = require('./routes/token.routes');
const ivrRoutes = require('./routes/ivr.routes');
const userRoutes = require('./routes/user.routes');
const auditRoutes = require('./routes/audit.routes');
const chatbotRoutes = require('./routes/chatbot.routes');

// ─── Express App ───
const app = express();

// ─── Security Middleware ───
app.use(helmet());

// ─── CORS ───
app.use(cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ─── Rate Limiting ───
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
});
app.use('/api/', limiter);

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ───
if (env.isDevelopment()) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ─── Health Check ───
app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW() AS server_time');
        res.json({
            success: true,
            message: 'Server is running',
            data: {
                status: 'healthy',
                environment: env.NODE_ENV,
                database: 'connected',
                serverTime: dbResult.rows[0].server_time,
                uptime: process.uptime(),
            },
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            message: 'Server is running but database is unreachable',
            data: { status: 'degraded', database: 'disconnected' },
        });
    }
});

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/ration-shops', rationShopRoutes);
app.use('/api/ration-cards', rationCardRoutes);
app.use('/api/commodities', commodityRoutes);
app.use('/api/shop-stock', shopStockRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/ivr', ivrRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/chatbot', chatbotRoutes); // Public Chatbot Routes

// ─── 404 Handler ───
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─── Global Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
const PORT = env.PORT;

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Ration Distribution Management System — Backend API');
    console.log(`  Environment : ${env.NODE_ENV}`);
    console.log(`  Port        : ${PORT}`);
    console.log(`  CORS Origin : ${env.CORS_ORIGIN}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  API Routes:');
    console.log('    POST   /api/auth/login');
    console.log('    POST   /api/auth/register');
    console.log('    GET    /api/auth/me');
    console.log('    GET    /api/districts');
    console.log('    GET    /api/ration-shops');
    console.log('    GET    /api/ration-cards');
    console.log('    GET    /api/commodities');
    console.log('    GET    /api/shop-stock');
    console.log('    GET    /api/tokens');
    console.log('    POST   /api/tokens/book');
    console.log('    POST   /api/ivr/incoming');
    console.log('    GET    /api/ivr/call-logs');
    console.log('    GET    /api/users');
    console.log('    GET    /api/audit-logs');
    console.log('    POST   /api/chatbot/card-details');
    console.log('    POST   /api/chatbot/book');
    console.log('    POST   /api/chatbot/status');
    console.log('    GET    /api/health');
    console.log('═══════════════════════════════════════════════════════════');
});

module.exports = app;
