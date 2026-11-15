
import { Client } from 'ssh2';

const config = { host: '72.62.50.86', port: 22, username: 'root', password: 'IraqBid2026Root@' };
const conn = new Client();

conn.on('ready', () => {
    conn.exec('cat /var/www/bid-backend/Bid-app-Backend/src/controllers/mobileProductController.js', (err, stream) => {
        let out = '';
        stream.on('data', (d) => out += d).on('close', () => {
            const lines = out.split('\n');
            const startIndex = lines.findIndex(l => l.includes('async getAllProducts'));
            console.log(`Found at index: ${startIndex}`);
            if (startIndex !== -1) {
                console.log(lines.slice(startIndex, startIndex + 150).join('\n'));
            }
            conn.end();
        });
    });
}).connect(config);
