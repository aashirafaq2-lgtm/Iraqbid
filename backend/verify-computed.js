
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
async function run() {
    const query = `
    SELECT 
      p.id, p.title, p.seller_id, u.role, u.name,
      CASE 
        WHEN p.seller_id IS NULL 
             OR COALESCE(u.role, '') IN ('company_products', 'employee', 'superadmin', 'moderator') 
             OR COALESCE(u.name, '') ILIKE '%Company Products%' 
             OR COALESCE(u.name, '') ILIKE '%Mazaadati%' 
             OR COALESCE(u.name, '') ILIKE '%BidMaster%' 
        THEN 'company' 
        ELSE 'seller' 
      END as computed_source
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.status = 'approved' AND p.auction_end_time > NOW()
  `;
    const res = await pool.query(query);
    console.table(res.rows);

    const company = res.rows.filter(r => r.computed_source === 'company');
    const seller = res.rows.filter(r => r.computed_source === 'seller');

    console.log('Total live:', res.rows.length);
    console.log('Company computed:', company.length);
    console.log('Seller computed:', seller.length);

    process.exit(0);
}
run();
