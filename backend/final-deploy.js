
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

console.log('🚀 Finalizing Deployment...');

conn.on('ready', () => {
    console.log('✅ Connected');

    conn.sftp((err, sftp) => {
        if (err) throw err;

        console.log('📡 Re-uploading package...');
        sftp.fastPut('update_vps.zip', '/var/www/bid-backend/Bid-app-Backend/update_vps.zip', (err) => {
            if (err) {
                console.error('❌ Upload Failed:', err);
                conn.end();
                return;
            }

            console.log('✅ Upload Successful');

            const cmd = `
        cd /var/www/bid-backend/Bid-app-Backend; \
        /usr/bin/pm2 stop all || true; \
        /usr/bin/pm2 delete all || true; \
        pkill -9 node || true; \
        rm -rf src; \
        unzip -o update_vps.zip; \
        npm install --production; \
        /usr/bin/pm2 start src/server.js --name bid-backend; \
        /usr/bin/pm2 save; \
        /usr/bin/pm2 list
      `;

            console.log('🛠️ Running remote commands...');
            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log(`\n✅ Remote execution finished with code: ${code}`);
                    conn.end();
                }).on('data', (d) => process.stdout.write(d))
                    .stderr.on('data', (d) => process.stderr.write(d));
            });
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err);
}).connect(config);
