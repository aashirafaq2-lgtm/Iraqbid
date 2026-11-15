import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function checkCategories() {
  const catRes = await pool.query("SELECT id, name FROM categories LIMIT 10");
  console.log('VALID_CATEGORIES:', catRes.rows);

  // If no category, create default
  let defaultCatId = catRes.rows[0]?.id;
  if (!defaultCatId) {
    const newCat = await pool.query("INSERT INTO categories (name) VALUES ('General') RETURNING id");
    defaultCatId = newCat.rows[0].id;
    console.log('Created default category:', defaultCatId);
  }

  process.exit(0);
}

checkCategories();

