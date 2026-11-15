import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseOperationsController.js';
let code = fs.readFileSync(filePath, 'utf8');

const oldProductQuery = `      INSERT INTO products (
        title, description, starting_bid, current_bid, buy_now_price,
        image_url, images, category_id, status, auction_end_time,
        source_type, condition, defect_alert, defect_details, original_retail_price
      ) VALUES (
        $1, $2, $3, $3, $4,
        $5, $6, $7, 'active', $8,
        'company', $9, $10, $11, $12
      ) RETURNING id;`;

const newProductQuery = `      INSERT INTO products (
        title, description, starting_price, current_price, starting_bid, current_bid, buy_now_price,
        image_url, images, category_id, status, auction_end_time,
        source_type, condition, defect_alert, defect_details, original_retail_price
      ) VALUES (
        $1, $2, $3, $3, $3, $3, $4,
        $5, $6, $7, 'active', $8,
        'company', $9, $10, $11, $12
      ) RETURNING id;`;

if (!code.includes(oldProductQuery)) {
  console.error('oldProductQuery not found!');
  process.exit(1);
}

code = code.replace(oldProductQuery, newProductQuery);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated productQuery to set starting_price and current_price!');

