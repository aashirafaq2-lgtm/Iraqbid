const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixConstraintAndAuctions() {
  const client = await pool.connect();
  try {
    console.log('🔧 Checking and fixing products_status_check constraint...');
    
    // Drop old constraint
    try {
      await client.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check`);
      console.log('✅ Old constraint dropped');
    } catch (e) {
      console.log('No constraint to drop:', e.message);
    }
    
    // Add updated constraint
    await client.query(`
      ALTER TABLE products ADD CONSTRAINT products_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'ended', 'active', 'cancelled', 'completed'))
    `);
    console.log('✅ New constraint added with ended/active/cancelled/completed');
    
    // Check products 3,4,5
    const statusRes = await client.query(`SELECT id, status, auction_end_time FROM products WHERE id IN (3,4,5)`);
    console.log('\n📊 Products 3,4,5 current status:');
    statusRes.rows.forEach(r => {
      console.log(`  Product ${r.id}: status=${r.status}, end=${r.auction_end_time}`);
    });
    
    // Set ended status for past auctions
    const updateRes = await client.query(`
      UPDATE products 
      SET status = 'ended' 
      WHERE id IN (3,4,5) AND auction_end_time < NOW() AND status IN ('approved', 'active', 'pending')
      RETURNING id, status
    `);
    console.log('\n✅ Updated products:', updateRes.rows);
    
    // Check all ended auctions showing in bids
    const endedRes = await client.query(`
      SELECT COUNT(*) as count FROM products WHERE auction_end_time < NOW() AND status IN ('approved', 'active')
    `);
    console.log(`\n⚠️  Products still needing status update: ${endedRes.rows[0].count}`);
    if (endedRes.rows[0].count > 0) {
      const bulkUpdate = await client.query(`
        UPDATE products SET status = 'ended' WHERE auction_end_time < NOW() AND status IN ('approved', 'active')
        RETURNING id
      `);
      console.log('✅ Bulk updated products:', bulkUpdate.rows.map(r=>r.id));
    }
    
    console.log('\n✅ All done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraintAndAuctions();
