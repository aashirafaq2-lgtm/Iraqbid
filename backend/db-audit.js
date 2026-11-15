
import pool from './src/config/db.js';

async function audit() {
    try {
        console.log('--- Database Integrity Audit ---');

        // 1. Check for products without categories
        const noCat = await pool.query('SELECT COUNT(*) FROM products WHERE category_id IS NULL AND status != \'rejected\'');
        console.log(`Products without category: ${noCat.rows[0].count}`);

        // 2. Check for products with invalid seller_id
        const invalidSeller = await pool.query('SELECT COUNT(*) FROM products p LEFT JOIN users u ON p.seller_id = u.id WHERE p.seller_id IS NOT NULL AND u.id IS NULL');
        console.log(`Products with invalid seller_id: ${invalidSeller.rows[0].count}`);

        // 3. Check for users with multiple roles (if stored as string, check for weird values)
        const roles = await pool.query('SELECT DISTINCT role FROM users');
        console.log('Existing roles in DB:', roles.rows.map(r => r.role));

        // 4. Check for products that should have ended but are still 'approved'
        const stillLive = await pool.query('SELECT id, title, auction_end_time FROM products WHERE status = \'approved\' AND auction_end_time < NOW()');
        console.log('Approved products with past end time:', stillLive.rows.map(p => ({ id: p.id, title: p.title })));

        // 5. Check for null prices
        const nullPrices = await pool.query('SELECT COUNT(*) FROM products WHERE starting_price IS NULL OR current_price IS NULL');
        console.log(`Products with null prices: ${nullPrices.rows[0].count}`);

        // 6. Check for bids on non-approved products
        const invalidBids = await pool.query('SELECT COUNT(*) FROM bids b JOIN products p ON b.product_id = p.id WHERE p.status != \'approved\' AND p.status != \'sold\'');
        console.log(`Bids on non-approved/sold products: ${invalidBids.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

audit();
