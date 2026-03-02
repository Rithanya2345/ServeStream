/**
 * PostgreSQL Connection Pool
 * Uses DATABASE_URL if available (Supabase / Railway), otherwise individual vars.
 */
const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
    };

// Connection pool — max 20 connections, idle timeout 30s
const pool = new Pool({
    ...poolConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Log pool errors (do not crash the process)
pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Convenience wrapper for parameterised queries.
 * @param {string} text  SQL query
 * @param {Array}  params  Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client from the pool (for transactions).
 * Caller MUST call client.release() when done.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
