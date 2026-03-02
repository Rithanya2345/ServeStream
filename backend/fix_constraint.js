const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixConstraint() {
    const client = await pool.connect();
    try {
        console.log('Dropping old constraint...');
        await client.query(`ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_booked_via_check`);

        console.log('Adding new constraint...');
        await client.query(`ALTER TABLE tokens ADD CONSTRAINT tokens_booked_via_check CHECK (booked_via IN ('ivr', 'admin', 'mobile', 'walk_in', 'chatbot'))`);

        console.log('Constraint updated successfully!');
    } catch (e) {
        console.error('Error updating constraint:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

fixConstraint();
