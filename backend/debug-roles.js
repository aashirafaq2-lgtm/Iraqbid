
import pool from './src/config/db.js';

async function checkSpecificRoles() {
    try {
        const res = await pool.query("SELECT id, phone, role, status FROM users WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000')");
        console.log('--- TARGET USERS ---');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error checking roles:', err.message);
        process.exit(1);
    }
}

checkSpecificRoles();
