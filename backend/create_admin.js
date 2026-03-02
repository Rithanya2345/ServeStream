require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
    const client = await pool.connect();
    try {
        const email = 'admin@ration.tn.gov.in';
        const password = 'admin123';
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);

        // Check if already exists
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
            console.log('Admin user already exists!');
            return;
        }

        const result = await client.query(
            `INSERT INTO users (email, password_hash, full_name, role, is_active)
             VALUES ($1, $2, $3, $4, TRUE)
             RETURNING id, email, full_name, role`,
            [email, hash, 'Super Admin', 'super_admin']
        );

        console.log('Admin user created:');
        console.log(JSON.stringify(result.rows[0], null, 2));
        console.log('\nLogin credentials:');
        console.log('  Email:', email);
        console.log('  Password:', password);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createAdmin();
