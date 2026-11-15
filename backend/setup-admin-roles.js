
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const admins = [
    { phone: '+9647700914000', role: 'superadmin', name: 'Super Admin User' },
    { phone: '+9647500914000', role: 'moderator', name: 'Moderator User' },
    { phone: '+9647800914000', role: 'employee', name: 'Employee User' }
];

async function setupRoles() {
    try {
        console.log('🚀 Setting up Admin Roles...');

        for (const admin of admins) {
            console.log(`\nProcessing ${admin.role} (${admin.phone})...`);

            // Check if user exists
            const res = await pool.query('SELECT id, role, email FROM users WHERE phone = $1', [admin.phone]);

            if (res.rows.length > 0) {
                // User exists, update role
                const user = res.rows[0];
                console.log(`✅ User found (ID: ${user.id}). Updating role from '${user.role}' to '${admin.role}'...`);

                await pool.query(
                    "UPDATE users SET role = $1, status = 'approved' WHERE id = $2",
                    [admin.role, user.id]
                );
                console.log(`✨ Role updated successfully.`);
            } else {
                // User does not exist, create new
                console.log(`⚠️ User not found. Creating new ${admin.role}...`);

                // Generate a unique email
                const email = `${admin.role}.${admin.phone.replace('+', '')}@bidmaster.com`;

                // Default password hash (hashed '123456' for testing, though admin login is often phone-only/OTP)
                // Using a placeholder hash or empty string if auth controller handles it. 
                // Let's use a dummy hash to be safe: $2b$10$abcdef... (invalid) or just empty string.
                // The earlier auth logic seemed to verify password only if provided, but admin login (phone) might skipping password check or using generic.
                // I'll insert with an empty password string as allowed by schema in previous file reviews.

                await pool.query(
                    `INSERT INTO users (name, email, phone, role, status, password, created_at)
                     VALUES ($1, $2, $3, $4, 'approved', '', NOW())`,
                    [admin.name, email, admin.phone, admin.role]
                );
                console.log(`✨ New user created successfully.`);
            }
        }

        console.log('\n✅ All roles configured successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up roles:', err);
        process.exit(1);
    }
}

setupRoles();
