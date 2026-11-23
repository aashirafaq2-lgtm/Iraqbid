import pool from './src/config/db.js';

async function checkDetails() {
    try {
        const perms = await pool.query("SELECT * FROM employee_permissions WHERE employee_id IN (240, 241, 242)");
        console.table(perms.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDetails();
