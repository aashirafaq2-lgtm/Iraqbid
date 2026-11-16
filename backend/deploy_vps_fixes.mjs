import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();
const keyPath = 'C:/Users/Administrator/.ssh/id_ed25519';
const privateKey = fs.readFileSync(keyPath);

console.log('Connecting to VPS (72.62.50.86)...');

conn.on('ready', () => {
  console.log('✅ SSH Connection established.');

  conn.sftp((err, sftp) => {
    if (err) throw err;

    const filesToUpload = [
      {
        local: 'E:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseInventoryController.js',
        remote: '/var/www/bid-backend/Bid-app-Backend/src/controllers/enterpriseInventoryController.js'
      },
      {
        local: 'E:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseOperationsController.js',
        remote: '/var/www/bid-backend/Bid-app-Backend/src/controllers/enterpriseOperationsController.js'
      },
      {
        local: 'E:/Ahmed work/iraq-bid-app-master/backend/src/Routes/enterpriseRoutes.js',
        remote: '/var/www/bid-backend/Bid-app-Backend/src/Routes/enterpriseRoutes.js'
      },
      {
        local: 'E:/Ahmed work/iraq-bid-app-master/backend/src/controllers/mobileProductController.js',
        remote: '/var/www/bid-backend/Bid-app-Backend/src/controllers/mobileProductController.js'
      },
      {
        local: 'E:/Ahmed work/iraq-bid-app-master/backend/src/Routes/productRoutes.js',
        remote: '/var/www/bid-backend/Bid-app-Backend/src/Routes/productRoutes.js'
      },
      {
        local: 'E:/Ahmed work/iraq-bid-app-master/backend/src/controllers/orderController.js',
        remote: '/var/www/bid-backend/Bid-app-Backend/src/controllers/orderController.js'
      }
    ];

    let pending = filesToUpload.length;

    filesToUpload.forEach(f => {
      console.log(`Uploading ${f.local} -> ${f.remote}`);
      sftp.fastPut(f.local, f.remote, (putErr) => {
        if (putErr) console.error(`Error uploading ${f.remote}:`, putErr);
        else console.log(`✅ Uploaded ${f.remote}`);

        pending--;
        if (pending === 0) {
          uploadAdminDist(sftp);
        }
      });
    });
  });
}).connect({
  host: '72.62.50.86',
  port: 22,
  username: 'root',
  privateKey
});

function uploadAdminDist(sftp) {
  const localDist = 'E:/Ahmed work/iraq-bid-app-master/admin-panel/dist';
  const remoteDist = '/var/www/bid-backend/Bid-app-Backend/public-admin';

  console.log('Uploading admin-panel dist directory...');

  function uploadDir(localDir, remoteDir, onDone) {
    fs.readdir(localDir, (err, items) => {
      if (err) return onDone(err);
      let count = items.length;
      if (count === 0) return onDone();

      items.forEach(item => {
        const lPath = path.join(localDir, item);
        const rPath = remoteDir + '/' + item;

        fs.stat(lPath, (statErr, stat) => {
          if (stat.isDirectory()) {
            sftp.mkdir(rPath, () => {
              uploadDir(lPath, rPath, () => {
                count--;
                if (count === 0) onDone();
              });
            });
          } else {
            sftp.fastPut(lPath, rPath, (fErr) => {
              if (fErr) console.error('Upload err:', rPath, fErr);
              count--;
              if (count === 0) onDone();
            });
          }
        });
      });
    });
  }

  uploadDir(localDist, remoteDist, (distErr) => {
    if (distErr) console.error('Dist upload error:', distErr);
    else console.log('✅ Admin panel dist uploaded successfully.');

    // Restart pm2
    conn.exec('pm2 restart iraqbid-backend', (cmdErr, stream) => {
      if (cmdErr) throw cmdErr;
      stream.on('close', (code) => {
        console.log(`✅ PM2 iraqbid-backend restarted with code ${code}.`);
        conn.end();
      }).on('data', (d) => process.stdout.write(d.toString()));
    });
  });
}
