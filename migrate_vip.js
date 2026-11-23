import pool from './src/config/db.js';

async function migrateVip() {
    try {
        console.log("🚀 Running VIP auctions database migration...");

        // 1. Alter products table
        await pool.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS container_type VARCHAR(50) DEFAULT NULL;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS container_code VARCHAR(50) DEFAULT NULL;
        `);
        console.log("✅ Products table updated with VIP columns (is_vip, container_type, container_code)");

        // 2. Alter users table
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip_bidder BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_avatar_id VARCHAR(50) DEFAULT 'avatar_009';
        `);
        console.log("✅ Users table updated with VIP columns (is_vip_bidder, vip_avatar_id)");

        // 3. Create containers table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vip_containers (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                tier VARCHAR(50) NOT NULL, -- 'gold', 'silver', 'normal'
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                category_label VARCHAR(255),
                image_url TEXT,
                starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 hour',
                ends_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
                status VARCHAR(50) DEFAULT 'active', -- 'upcoming', 'active', 'ended'
                registered_bidders_count INT DEFAULT 20,
                viewers_count INT DEFAULT 1428,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ vip_containers table created/verified");

        // 4. Seed initial containers if table empty
        const countRes = await pool.query("SELECT COUNT(*) FROM vip_containers");
        if (parseInt(countRes.rows[0].count, 10) === 0) {
            await pool.query(`
                INSERT INTO vip_containers (code, tier, title, subtitle, category_label, starts_at, registered_bidders_count)
                VALUES 
                ('#G-102', 'gold', 'Container #G-102', 'Premium & Exclusive', 'Premium Electronics & More', CURRENT_TIMESTAMP + INTERVAL '14 minutes', 20),
                ('#S-205', 'silver', 'Container #S-205', 'Higher Value', 'High Value Items', CURRENT_TIMESTAMP + INTERVAL '4 minutes', 20),
                ('#N-308', 'normal', 'Container #N-308', 'Great Products', 'Various Products', CURRENT_TIMESTAMP + INTERVAL '2 minutes', 20);
            `);
            console.log("✅ Initial VIP containers seeded (#G-102 Gold, #S-205 Silver, #N-308 Normal)");
        }

        console.log("🎉 VIP Database Migration Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ VIP Migration Error:", err);
        process.exit(1);
    }
}

migrateVip();
