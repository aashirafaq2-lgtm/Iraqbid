import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH');

  conn.sftp((err, sftp) => {
    if (err) throw err;

    // 1. Upload standingTechService.js
    console.log('📡 Uploading standingTechService.js...');
    sftp.fastPut(
      'src/services/standingTechService.js',
      '/var/www/bid-backend/Bid-app-Backend/src/services/standingTechService.js',
      (err) => {
        if (err) throw err;
        console.log('✅ Uploaded standingTechService.js');

        // 2. Upload authController.js
        console.log('📡 Uploading authController.js...');
        sftp.fastPut(
          'src/controllers/authController.js',
          '/var/www/bid-backend/Bid-app-Backend/src/controllers/authController.js',
          (err) => {
            if (err) throw err;
            console.log('✅ Uploaded authController.js');

            // 3. Restart PM2 on VPS
            conn.exec('pm2 restart iraqbid-backend && pm2 save', (err, stream) => {
              if (err) throw err;
              stream.on('data', d => process.stdout.write(d));
              stream.on('close', () => {
                console.log('🚀 VPS Backend Reloaded Successfully!');
                conn.end();
              });
            });
          }
        );
      }
    );
  });
}).connect({
  host: '72.62.50.86',
  port: 22,
  username: 'root',
  privateKey: readFileSync('C:/Users/Administrator/.ssh/id_ed25519')
});
