import pool from "./src/config/db.js";

async function createReportsTable() {
    console.log("🛠️ Creating reports table...");
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        target_id INTEGER NOT NULL,
        target_type VARCHAR(50) NOT NULL, -- 'product', 'user', 'comment'
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    `);
        console.log("✅ Reports table created successfully!");
    } catch (error) {
        console.error("❌ Error creating reports table:", error);
    } finally {
        process.exit();
    }
}

createReportsTable();
