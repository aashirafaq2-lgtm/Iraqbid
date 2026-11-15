import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/auctionController.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace("WHERE p.status = 'approved'", "WHERE p.status IN ('approved', 'active')");

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed getActiveAuctions to include both approved and active products!');

