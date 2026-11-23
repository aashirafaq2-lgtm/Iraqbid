import pool from './src/config/db.js';

async function checkEmployees() {
    try {
        const res = await pool.query(`
            SELECT id, name, email, phone, role, status 
            FROM users 
            WHERE role NOT IN ('buyer', 'user') 
            ORDER BY id DESC 
            LIMIT 15;
        `);
        console.log("👥 Found Staff & Employees in Database:");
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkEmployees();
