require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    try {
        // Cancel ALL active tokens for all cards
        const r = await pool.query(
            "UPDATE tokens SET status = 'expired' WHERE status IN ('booked', 'confirmed')"
        );
        console.log('Expired tokens:', r.rowCount);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await pool.end();
})();
