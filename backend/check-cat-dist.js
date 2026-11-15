
import pool from './src/config/db.js';

async function checkCounts() {
    try {
        const company = await pool.query("SELECT c.id, c.name, COUNT(p.id) FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.seller_id IS NULL AND p.status = 'approved' GROUP BY c.id, c.name HAVING COUNT(p.id) > 0");
        console.log('Company Categories:');
        console.table(company.rows);

        const seller = await pool.query("SELECT c.id, c.name, COUNT(p.id) FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.seller_id IS NOT NULL AND p.status = 'approved' GROUP BY c.id, c.name HAVING COUNT(p.id) > 0");
        console.log('Seller Categories:');
        console.table(seller.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCounts();
