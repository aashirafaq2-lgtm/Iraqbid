import pool from './src/config/db.js';

async function checkAndFix() {
    try {
        const staff = await pool.query("SELECT id, name, email, role, status FROM users WHERE role = 'employee'");
        console.log("Employees:", staff.rows);

        for (const emp of staff.rows) {
            const perms = await pool.query("SELECT * FROM employee_permissions WHERE employee_id = $1", [emp.id]);
            console.log(`Permissions count for ${emp.name} (ID: ${emp.id}):`, perms.rows.length);

            if (perms.rows.length === 0) {
                console.log(`Granting default full inventory & product permissions to ${emp.name}...`);
                const modules = ['inventory', 'auctions', 'customers', 'orders', 'system'];
                for (const m of modules) {
                    await pool.query(`
                        INSERT INTO employee_permissions (employee_id, module, can_view, can_create, can_edit, can_delete, can_approve, updated_at)
                        VALUES ($1, $2, true, true, true, true, true, NOW())
                        ON CONFLICT (employee_id, module) DO UPDATE SET
                            can_view = true, can_create = true, can_edit = true, can_delete = true, can_approve = true;
                    `, [emp.id, m]);
                }
                console.log(`✅ Granted permissions for ${emp.name}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAndFix();
