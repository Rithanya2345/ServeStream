const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkCard() {
    const client = await pool.connect();
    try {
        const cardNumber = '330300000001';
        console.log(`Checking card: ${cardNumber}`);

        // 1. Get Card Details
        const cardRes = await client.query(
            `SELECT rc.id, rc.card_number, rc.shop_id, rc.is_active, rs.shop_code, rs.name as shop_name 
             FROM ration_cards rc 
             JOIN ration_shops rs ON rc.shop_id = rs.id 
             WHERE rc.card_number = $1`,
            [cardNumber]
        );

        if (cardRes.rowCount === 0) {
            console.log('Card NOT FOUND');
        } else {
            console.log('Card Found:', cardRes.rows[0]);

            // 2. Check tokens
            const tokenRes = await client.query(
                `SELECT * FROM tokens WHERE ration_card_id = $1`,
                [cardRes.rows[0].id]
            );
            console.log('Existing Tokens:', tokenRes.rows);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCard();
