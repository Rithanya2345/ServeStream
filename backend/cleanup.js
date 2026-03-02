const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
    const client = await pool.connect();
    try {
        const tokenId = '77acfb87-b76c-4445-a7e8-8512dfa85e92';
        console.log(`Deleting test token: ${tokenId}`);
        await client.query('DELETE FROM tokens WHERE id = $1', [tokenId]);
        console.log('Cleaned up successfully!');
    } catch (e) {
        console.error('Error cleaning up:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
