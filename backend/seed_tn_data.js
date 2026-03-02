const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const districtsList = [
    { name: 'Ariyalur', code: 'ARI' },
    { name: 'Chengalpattu', code: 'CGL' },
    { name: 'Chennai', code: 'CHN' },
    { name: 'Coimbatore', code: 'CBE' },
    { name: 'Cuddalore', code: 'CUD' },
    { name: 'Dharmapuri', code: 'DPI' },
    { name: 'Dindigul', code: 'DIN' },
    { name: 'Erode', code: 'ERD' },
    { name: 'Kallakurichi', code: 'KCU' },
    { name: 'Kanchipuram', code: 'KPM' },
    { name: 'Kanyakumari', code: 'KKI' },
    { name: 'Karur', code: 'KAR' },
    { name: 'Krishnagiri', code: 'KRI' },
    { name: 'Madurai', code: 'MDU' },
    { name: 'Mayiladuthurai', code: 'MYD' },
    { name: 'Nagapattinam', code: 'NGP' },
    { name: 'Namakkal', code: 'NMK' },
    { name: 'Nilgiris', code: 'NIL' },
    { name: 'Perambalur', code: 'PBL' },
    { name: 'Pudukkottai', code: 'PDK' },
    { name: 'Ramanathapuram', code: 'RMD' },
    { name: 'Ranipet', code: 'RPT' },
    { name: 'Salem', code: 'SLM' },
    { name: 'Sivaganga', code: 'SVG' },
    { name: 'Tenkasi', code: 'TSI' },
    { name: 'Thanjavur', code: 'TNJ' },
    { name: 'Theni', code: 'THN' },
    { name: 'Thoothukudi', code: 'THO' },
    { name: 'Tiruchirappalli', code: 'TRY' },
    { name: 'Tirunelveli', code: 'TNV' },
    { name: 'Tirupathur', code: 'TPT' },
    { name: 'Tiruppur', code: 'TPR' },
    { name: 'Tiruvallur', code: 'TVL' },
    { name: 'Tiruvannamalai', code: 'TVM' },
    { name: 'Tiruvarur', code: 'TVR' },
    { name: 'Vellore', code: 'VEL' },
    { name: 'Viluppuram', code: 'VUP' },
    { name: 'Virudhunagar', code: 'VNR' }
];

const seedTNData = async () => {
    const client = await pool.connect();
    const dataset = [];

    try {
        await client.query('BEGIN');
        console.log('Starting Tamil Nadu Data Seeding...');

        for (const dist of districtsList) {
            console.log(`Processing ${dist.name}...`);

            // 1. District
            const distRes = await client.query(
                `INSERT INTO districts (name, code) VALUES ($1, $2) 
                 ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name 
                 RETURNING id`,
                [dist.name, dist.code]
            );
            const distId = distRes.rows[0].id;

            // 2. Taluk (One per district for demo)
            const talukCode = `${dist.code}-HQ`;
            const talukRes = await client.query(
                `INSERT INTO taluks (district_id, name, code) VALUES ($1, $2, $3)
                 ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id`,
                [distId, `${dist.name} Taluk`, talukCode]
            );
            const talukId = talukRes.rows[0].id;

            // 3. Ration Shop
            // Generate a fake IVR number based on index to ensure uniqueness
            // e.g., 919800000001 onwards
            const idx = districtsList.indexOf(dist) + 1;
            const ivrPhone = `+9198${String(idx).padStart(2, '0')}000000`; // +919801000000, +919802000000...
            const shopCode = `${dist.code}-S01`;

            const shopRes = await client.query(
                `INSERT INTO ration_shops (taluk_id, shop_code, name, ivr_phone_number, address) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (ivr_phone_number) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id, name, shop_code`,
                [talukId, shopCode, `${dist.name} FPS 001`, ivrPhone, `Main Road, ${dist.name}`]
            );
            const shop = shopRes.rows[0];

            // 4. Beneficiaries (2 per shop)
            const users = [];
            for (let i = 1; i <= 2; i++) {
                // Card Format: 33 + DistrictCodeInt(index) + 000000 + UserIndex
                // e.g. Ariyalur (1) -> 330100000001, 330100000002
                // Must be 12 digits
                const districtPart = String(idx).padStart(2, '0');
                const userPart = String(i).padStart(2, '0');
                const cardNum = `33${districtPart}000000${userPart}`; // 2 + 2 + 6 + 2 = 12 digits

                // Generate a unique mobile number per card
                const mobileNum = `+9190${String(idx).padStart(2, '0')}${String(i).padStart(2, '0')}00001`;

                const cardRes = await client.query(
                    `INSERT INTO ration_cards (shop_id, card_number, card_type, head_of_family, total_members, mobile_number)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (card_number) DO UPDATE SET head_of_family = EXCLUDED.head_of_family, mobile_number = EXCLUDED.mobile_number
                     RETURNING id, card_number, head_of_family`,
                    [shop.id, cardNum, i === 1 ? 'PHH' : 'NPHH', `User ${dist.code} ${i}`, 4, mobileNum]
                );
                const card = cardRes.rows[0];

                // Add Family Members
                await client.query(
                    `INSERT INTO family_members (ration_card_id, name, age, gender, relationship)
                     VALUES 
                     ($1, $2, 45, 'male', 'Head'),
                     ($1, $3, 40, 'female', 'Spouse')`,
                    [card.id, `User ${dist.code} ${i}`, `Spouse ${dist.code} ${i}`]
                );

                users.push({
                    card_number: card.card_number,
                    head_of_family: card.head_of_family
                });
            }

            dataset.push({
                district: dist.name,
                shop: {
                    name: shop.name,
                    code: shop.shop_code,
                    ivr: ivrPhone
                },
                users: users
            });
        }

        await client.query('COMMIT');
        console.log('Seeding Complete!');

        // Write dataset to file
        fs.writeFileSync('tn_ration_data.json', JSON.stringify(dataset, null, 2));
        console.log('Dataset written to tn_ration_data.json');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Seeding Failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
};

seedTNData();
