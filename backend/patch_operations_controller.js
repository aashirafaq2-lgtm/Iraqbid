import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseOperationsController.js';
let code = fs.readFileSync(filePath, 'utf8');

// Replace u.full_name with COALESCE(u.name, u.email, 'Customer')
code = code.replaceAll('u.full_name as customer_name', "COALESCE(u.name, u.email, 'Customer') as customer_name");
code = code.replaceAll('userUpdate.rows[0].full_name', "(userUpdate.rows[0].name || userUpdate.rows[0].email || 'Customer')");
code = code.replaceAll('RETURNING refusal_count, full_name, phone;', "RETURNING refusal_count, name, email, phone;");

// Fix JSON.stringify for images in products insert
code = code.replace('item.images || []', 'JSON.stringify(item.images || [])');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully patched enterpriseOperationsController.js!');

