/**
 * Seed Script
 * Creates a super_admin user for initial login.
 * Run: node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function seed() {
    const client = await pool.connect();
    try {
        const email = 'admin@ration.tn.gov.in';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if admin already exists
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log('Admin user already exists. Skipping.');
        } else {
            await client.query(
                `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
                [email, hashedPassword, 'System Administrator', 'super_admin', true]
            );
            console.log('Admin user created:');
            console.log('  Email:    ' + email);
            console.log('  Password: ' + password);
            console.log('  Role:     super_admin');
        }
    } catch (e) {
        console.error('Seed error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
