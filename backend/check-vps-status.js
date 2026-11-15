
import { Client } from 'ssh2';

const config = {
    host: '72.62.50.86',
    port: 22,
    username: 'root',
    password: 'IraqBid2026Root@'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Connected');
    conn.exec('pm2 list && pm2 logs bid-backend --lines 20 --nostream', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect(config);
