
import { Client } from 'ssh2';

const config = { host: '72.62.50.86', port: 22, username: 'root', password: 'IraqBid2026Root@' };
const conn = new Client();

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        sftp.fastPut('fix-schema-v2.js', '/var/www/bid-backend/Bid-app-Backend/fix-schema-v2.js', (err) => {
            conn.exec('cd /var/www/bid-backend/Bid-app-Backend && node fix-schema-v2.js', (err, stream) => {
                stream.on('close', () => conn.end())
                    .on('data', (d) => process.stdout.write(d))
                    .stderr.on('data', (d) => process.stderr.write(d));
            });
        });
    });
}).connect(config);
