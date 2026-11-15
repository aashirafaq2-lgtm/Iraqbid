
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const config = {
    host: '72.62.50.86',
    port: 22,
    username: 'root',
    password: 'IraqBid2026Root@'
};

const conn = new Client();

console.log('🚀 Connecting to VPS...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready');

    conn.sftp((err, sftp) => {
        if (err) throw err;

        const localFile = 'update_vps.zip';
        const remoteFile = '/var/www/bid-backend/Bid-app-Backend/update_vps.zip';

        console.log(`📡 Uploading ${localFile}...`);

        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) {
                console.error('❌ Upload Failed:', err);
                conn.end();
                return;
            }

            console.log('✅ Upload Successful');

            const commands = [
                'cd /var/www/bid-backend/Bid-app-Backend',
                'echo "--- Stopping PM2 ---"',
                'pm2 delete all || true',
                'echo "--- Extracting ---"',
                'rm -rf src',
                'unzip -o update_vps.zip',
                'echo "--- Dependencies ---"',
                'npm install --production',
                'echo "--- DB Setup ---"',
                'node setup-otp-table.js',
                'node fix-roles.js',
                'echo "--- Starting ---"',
                'pm2 start src/server.js --name bid-backend',
                'pm2 save',
                'pm2 list'
            ];

            const fullCommand = commands.join(' && ');

            console.log('🛠️ Running commands...');

            conn.exec(fullCommand, (err, stream) => {
                if (err) throw err;

                stream.on('close', (code, signal) => {
                    console.log(`\n✅ Finished with exit code: ${code}`);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data);
                }).stderr.on('data', (data) => {
                    process.stderr.write(data);
                });
            });
        });
    });
}).connect(config);
