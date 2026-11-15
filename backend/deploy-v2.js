
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const config = {
    host: '72.62.50.86',
    port: 22,
    username: 'root',
    password: 'IraqBid2026Root@',
    readyTimeout: 20000
};

const conn = new Client();

console.log('🚀 Deploying to /root TARGET...');

conn.on('ready', () => {
    console.log('✅ Connected');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('📡 Uploading to /root/Bid-app-Backend-main/update_vps.zip');
        sftp.fastPut('update_vps.zip', '/root/Bid-app-Backend-main/update_vps.zip', (err) => {
            if (err) {
                console.error('❌ Upload Failed:', err);
                conn.end();
                return;
            }
            console.log('✅ Upload Successful');
            const cmd = `
                cd /root/Bid-app-Backend-main; \
                unzip -o update_vps.zip; \
                npm install --production; \
                /usr/bin/pm2 stop bid-backend || true; \
                /usr/bin/pm2 delete bid-backend || true; \
                /usr/bin/pm2 start src/server.js --name bid-backend; \
                /usr/bin/pm2 save; \
            `;
            console.log('🛠️ Restarting PM2...');
            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log(`\n✅ Finished with code: ${code}`);
                    conn.end();
                }).on('data', (d) => process.stdout.write(d))
                    .stderr.on('data', (d) => process.stderr.write(d));
            });
        });
    });
}).connect(config);
