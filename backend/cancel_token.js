const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    const res = await pool.query(
        "UPDATE tokens SET status = 'cancelled', cancelled_at = NOW() WHERE ration_card_id = (SELECT id FROM ration_cards WHERE card_number = '330300000001') AND status IN ('booked', 'confirmed') RETURNING token_number, status"
    );
    console.log('Cancelled tokens:', res.rows);
    await pool.end();
})();
