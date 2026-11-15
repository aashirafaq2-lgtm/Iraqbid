import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseInventoryController.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replaceAll('u.full_name as receiving_employee_name', "COALESCE(u.name, u.email, 'Employee') as receiving_employee_name");

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed u.full_name in local enterpriseInventoryController.js!');

