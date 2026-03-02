const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testSMS() {
    const client = await pool.connect();
    try {
        // 1. Update card with phone number
        const cardNumber = '330300000001';
        const phone = '+918248973913';

        console.log(`Updating card ${cardNumber} with phone ${phone}...`);
        await client.query(
            'UPDATE ration_cards SET mobile_number = $1 WHERE card_number = $2',
            [phone, cardNumber]
        );
        console.log('Phone number updated!');

        // 2. Verify
        const res = await client.query(
            'SELECT card_number, head_of_family, mobile_number FROM ration_cards WHERE card_number = $1',
            [cardNumber]
        );
        console.log('Card details:', res.rows[0]);

        // 3. Clean up any existing active tokens for this card (so booking works)
        const cardId = await client.query('SELECT id FROM ration_cards WHERE card_number = $1', [cardNumber]);
        await client.query(
            "UPDATE tokens SET status = 'cancelled' WHERE ration_card_id = $1 AND status IN ('booked', 'confirmed')",
            [cardId.rows[0].id]
        );
        console.log('Cleared any active tokens.');
        console.log('\nReady! Now book a token from the portal to receive an SMS.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

testSMS();
