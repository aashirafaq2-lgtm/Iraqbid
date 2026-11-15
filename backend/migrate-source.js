
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function migrate() {
    try {
        console.log('🚀 Starting Robust Separation Migration...');

        // 1. Add product_source column
        console.log('Adding product_source column...');
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS product_source VARCHAR(20) DEFAULT 'company';
        `);

        // 1.1 Add real_price column
        console.log('Adding real_price column...');
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS real_price NUMERIC DEFAULT 0;
        `);

        // 2. Populate product_source based on existing data
        console.log('Populating product_source based on current logic...');
        // logic: if seller_id is null OR seller's role is admin/moderator/employee -> company
        // otherwise -> seller
        await pool.query(`
            UPDATE products p
            SET product_source = 'company'
            FROM users u
            WHERE p.seller_id = u.id
            AND (u.role IN ('admin', 'superadmin', 'subadmin', 'moderator', 'employee', 'company_products', 'bidmaster', 'mazaadati')
                 OR u.name ILIKE '%Company Products%'
                 OR u.name ILIKE '%Mazaadati%'
                 OR u.name ILIKE '%BidMaster%');
        `);

        await pool.query(`
            UPDATE products p
            SET product_source = 'seller'
            FROM users u
            WHERE p.seller_id = u.id
            AND (u.role NOT IN ('admin', 'superadmin', 'subadmin', 'moderator', 'employee', 'company_products', 'bidmaster', 'mazaadati')
                 AND u.name NOT ILIKE '%Company Products%'
                 AND u.name NOT ILIKE '%Mazaadati%'
                 AND u.name NOT ILIKE '%BidMaster%');
        `);

        // Products with NO seller_id are always company
        await pool.query(`
            UPDATE products SET product_source = 'company' WHERE seller_id IS NULL;
        `);

        // 3. Add city and area columns to users table
        console.log('Adding city and area columns to users...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS city VARCHAR(100),
            ADD COLUMN IF NOT EXISTS area VARCHAR(100);
        `);

        console.log('✅ Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
