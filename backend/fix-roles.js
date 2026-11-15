
import pool from './src/config/db.js';

async function fixRoles() {
    try {
        console.log('🛠️ Fixing Admin Roles...');

        // 1. Set +9647500914000 to superadmin
        await pool.query("UPDATE users SET role = 'superadmin', status = 'approved' WHERE phone = '+9647500914000'");
        console.log('✅ +9647500914000 set to superadmin');

        // 2. Set +9647800914000 to moderator
        await pool.query("UPDATE users SET role = 'moderator', status = 'approved' WHERE phone = '+9647800914000'");
        console.log('✅ +9647800914000 set to moderator');

        // 3. Set +9647700914000 to employee (company_products)
        // The previous migration used company_products, but employee role exists in code
        await pool.query("UPDATE users SET role = 'employee', status = 'approved' WHERE phone = '+9647700914000'");
        console.log('✅ +9647700914000 set to employee');

        const check = await pool.query("SELECT id, phone, role FROM users WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000')");
        console.table(check.rows);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing roles:', err.message);
        process.exit(1);
    }
}

fixRoles();
