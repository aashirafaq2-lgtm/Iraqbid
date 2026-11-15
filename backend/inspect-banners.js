
import pool from './src/config/db.js';

async function checkBanners() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'banners'");
        console.table(res.rows);
        const data = await pool.query("SELECT * FROM banners LIMIT 5");
        console.log('Banners Sample:');
        console.table(data.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkBanners();
