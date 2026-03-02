const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function reproduce() {
    const client = await pool.connect();
    try {
        const cardNumber = '330100000002'; // From user screenshot
        console.log(`Checking card: ${cardNumber}`);

        // 1. Get Card Details
        const cardRes = await client.query(
            `SELECT rc.id, rc.card_number, rc.shop_id, rs.shop_code 
             FROM ration_cards rc 
             JOIN ration_shops rs ON rc.shop_id = rs.id 
             WHERE rc.card_number = $1`,
            [cardNumber]
        );

        if (cardRes.rowCount === 0) {
            console.log('Card NOT FOUND');
            return;
        }

        const card = cardRes.rows[0];
        console.log('Card Found:', card);

        // 2. Attempt "Booking" Logic manually (replicating token.service.js)
        // We will try to execute the EXACT insert that likely fails

        const shopId = card.shop_id;
        const bookingDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        console.log(`Attempting to book for Shop: ${shopId} on ${bookingDate}`);

        // Generate Token Number (simulated)
        const tokenNum = `TEST-${Date.now()}`;
        const queueNum = 999;

        // INSERT
        console.log('Inserting token...');
        const insertRes = await client.query(
            `INSERT INTO tokens (ration_card_id, shop_id, token_number, queue_number, booking_date, collection_date, booked_via)
             VALUES ($1, $2, $3, $4, $5::date, $5::date, $6)
             RETURNING *`,
            [card.id, shopId, tokenNum, queueNum, bookingDate, 'chatbot']
        );

        console.log('Success!', insertRes.rows[0]);

    } catch (e) {
        console.error('---------------------------------------------------');
        console.error('CAUGHT ERROR:', e.message);
        console.error('CODE:', e.code);
        console.error('DETAIL:', e.detail);
        console.error('CONSTRAINT:', e.constraint);
        console.error('---------------------------------------------------');
    } finally {
        client.release();
        await pool.end();
    }
}

reproduce();
