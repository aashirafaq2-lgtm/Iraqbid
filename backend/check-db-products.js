
import { Client } from 'ssh2';

const config = { host: '72.62.50.86', port: 22, username: 'root', password: 'IraqBid2026Root@' };
const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Connected');
    const sql = `
    SELECT id, title, status, seller_id, auction_end_time,
           CASE WHEN seller_id IS NULL THEN 'company' ELSE 'seller' END as source
    FROM products
    WHERE status = 'approved'
    LIMIT 10;
  `;
    // Use a temporary js file on VPS to run the query
    const cmd = `node -e "import pool from './src/config/db.js'; pool.query(\\\`${sql}\\\`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect(config);
