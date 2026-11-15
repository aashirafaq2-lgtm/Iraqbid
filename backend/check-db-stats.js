
import { Client } from 'ssh2';

const config = { host: '72.62.50.86', port: 22, username: 'root', password: 'IraqBid2026Root@' };
const conn = new Client();

conn.on('ready', () => {
    // Show all products with their status and seller/company info
    const sql = `
      SELECT 
        status, 
        COUNT(*) as count,
        CASE WHEN seller_id IS NULL THEN 'company' ELSE 'seller' END as source,
        MIN(auction_end_time) as min_end,
        MAX(auction_end_time) as max_end
      FROM products 
      GROUP BY status, source;
    `;

    conn.exec(`export PGPASSWORD='IraqBid2026Root@'; psql -h localhost -U root -d bidmaster -c "${sql}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect(config);
