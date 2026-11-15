import fs from 'fs';
const serverPath = '/var/www/bid-backend/Bid-app-Backend/src/server.js';
let code = fs.readFileSync(serverPath, 'utf8');
if (!code.includes('startSystemAutoBidder')) {
  code = "import { startSystemAutoBidder } from './services/systemAutoBidderService.js';\n" + code;
  code = code.replace('httpServer.listen(PORT, () => {', 'startSystemAutoBidder();\nhttpServer.listen(PORT, () => {');
  fs.writeFileSync(serverPath, code, 'utf8');
  console.log('Successfully injected startSystemAutoBidder into server.js');
} else {
  console.log('startSystemAutoBidder already registered in server.js');
}

