import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/adminController.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace('  // async getUsers(req, res) {', '  async getUsers(req, res) {');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed comment on getUsers!');

