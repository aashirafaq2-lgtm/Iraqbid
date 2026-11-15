import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseOperationsController.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace('targetCatId, status, auction_end_time,', 'category_id, status, auction_end_time,');
code = code.replace('category_id,', 'targetCatId,');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed category_id column name in SQL query!');

