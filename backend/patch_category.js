import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseOperationsController.js';
let code = fs.readFileSync(filePath, 'utf8');

// Ensure category_id defaults to 5 (Electronics) if not found or 1
code = code.replace('const { inventory_id, duration_hours = 24, category_id = 1 } = req.body;', `const { inventory_id, duration_hours = 24, category_id } = req.body;
    let targetCatId = category_id;
    if (!targetCatId) {
      const firstCat = await client.query("SELECT id FROM categories ORDER BY id ASC LIMIT 1");
      targetCatId = firstCat.rows[0]?.id || 2;
    }`);

code = code.replace('category_id,', 'targetCatId,');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully fixed category_id in enterpriseOperationsController.js!');

