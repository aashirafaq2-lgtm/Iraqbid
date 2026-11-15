import fs from 'fs';
const path = '/var/www/bid-backend/Bid-app-Backend/src/server.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import { startSystemAutoBidder } from './services/systemAutoBidderService.js';\n", '');
content = content.replace("startSystemAutoBidder();\n", '');
fs.writeFileSync(path, content, 'utf8');
console.log('Cleaned server.js');

