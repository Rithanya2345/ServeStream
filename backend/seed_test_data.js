/**
 * Seed Test Data for IVR Simulator
 * Creates 1 District, 1 Taluk, 1 Shop, 2 Cards, and Stock.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('Seeding test data...');

        // 1. Get or Create District (Chennai)
        let res = await client.query("SELECT id FROM districts WHERE code = 'CHN'");
        let districtId = res.rows[0]?.id;
        if (!districtId) {
            res = await client.query(
                "INSERT INTO districts (name, code) VALUES ('Chennai', 'CHN') RETURNING id"
            );
            districtId = res.rows[0].id;
        }

        // 2. Get or Create Taluk (Egmore)
        res = await client.query("SELECT id FROM taluks WHERE code = 'CHN-EGM'");
        let talukId = res.rows[0]?.id;
        if (!talukId) {
            res = await client.query(
                "INSERT INTO taluks (district_id, name, code) VALUES ($1, 'Egmore', 'CHN-EGM') RETURNING id",
                [districtId]
            );
            talukId = res.rows[0].id;
        }

        // 3. Create Ration Shop (IVR: +919876543210)
        const ivrPhone = '+919876543210';
        res = await client.query("SELECT id FROM ration_shops WHERE ivr_phone_number = $1", [ivrPhone]);
        let shopId = res.rows[0]?.id;

        if (!shopId) {
            res = await client.query(`
        INSERT INTO ration_shops (
          taluk_id, shop_code, name, ivr_phone_number, operator_name, operator_phone
        ) VALUES ($1, '01GS001', 'Egmore FPS 001', $2, 'Ramesh Kumar', '+919876543211')
        RETURNING id
      `, [talukId, ivrPhone]);
            shopId = res.rows[0].id;
            console.log('Created Shop: Egmore FPS 001 (IVR: +919876543210)');
        } else {
            console.log('Shop already exists: Egmore FPS 001');
        }

        // 4. Create Ration Card 1 (PHH)
        const card1 = '330000000001';
        res = await client.query("SELECT id FROM ration_cards WHERE card_number = $1", [card1]);
        if (res.rows.length === 0) {
            await client.query(`
        INSERT INTO ration_cards (
          shop_id, card_number, card_type, head_of_family, mobile_number
        ) VALUES ($1, $2, 'PHH', 'Anitha', '+919000000001')
      `, [shopId, card1]);
            console.log(`Created Card: ${card1} (PHH)`);
        }

        // 5. Create Ration Card 2 (NPHH)
        const card2 = '330000000002';
        res = await client.query("SELECT id FROM ration_cards WHERE card_number = $1", [card2]);
        if (res.rows.length === 0) {
            await client.query(`
         INSERT INTO ration_cards (
          shop_id, card_number, card_type, head_of_family, mobile_number
        ) VALUES ($1, $2, 'NPHH', 'Suresh', '+919000000002')
      `, [shopId, card2]);
            console.log(`Created Card: ${card2} (NPHH)`);
        }

        // 6. Add Stock (Rice, Sugar)
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const commodities = [
            { name: 'Rice', qty: 1000 },
            { name: 'Sugar', qty: 500 },
            { name: 'Wheat', qty: 800 }
        ];

        for (const item of commodities) {
            // Get commodity ID
            const cRes = await client.query("SELECT id FROM commodities WHERE name = $1", [item.name]);
            if (cRes.rows.length > 0) {
                const cid = cRes.rows[0].id;
                // Check if stock exists
                const stockRes = await client.query(
                    "SELECT id FROM shop_stock WHERE shop_id=$1 AND commodity_id=$2 AND month=$3 AND year=$4",
                    [shopId, cid, currentMonth, currentYear]
                );

                if (stockRes.rows.length === 0) {
                    await client.query(`
                    INSERT INTO shop_stock (shop_id, commodity_id, month, year, allocated_qty)
                    VALUES ($1, $2, $3, $4, $5)
                 `, [shopId, cid, currentMonth, currentYear, item.qty]);
                    console.log(`Added Stock: ${item.name} - ${item.qty}`);
                }
            }
        }

        console.log('Seed Complete!');

    } catch (e) {
        console.error('Seed Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
