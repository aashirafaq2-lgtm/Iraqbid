
import { Client } from 'ssh2';

const config = { host: '72.62.50.86', port: 22, username: 'root', password: 'IraqBid2026Root@' };
const conn = new Client();

conn.on('ready', () => {
    conn.exec('pm2 logs bid-backend --lines 50', (err, stream) => {
        stream.on('close', () => conn.end())
            .on('data', (d) => process.stdout.write(d))
            .stderr.on('data', (d) => process.stderr.write(d));
    });
}).connect(config);
