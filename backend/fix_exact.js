import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseOperationsController.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace('targetCatId, status, auction_end_time,', 'category_id, status, auction_end_time,');
code = code.replace('JSON.stringify(item.images || []),\n      category_id,', 'JSON.stringify(item.images || []),\n      targetCatId,');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed accurately!');

