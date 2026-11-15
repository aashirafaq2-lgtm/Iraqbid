import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
sed -i 's/SMS_PROVIDER=twilio/SMS_PROVIDER=standingtech/g' /var/www/bid-backend/Bid-app-Backend/.env
grep -q "STANDINGTECH_API_KEY" /var/www/bid-backend/Bid-app-Backend/.env || cat << 'EOF' >> /var/www/bid-backend/Bid-app-Backend/.env
STANDINGTECH_API_KEY=919|a7cd766f904c255159f33df057b975eb894e848c81c6480839657843886d2cd0
STANDINGTECH_SENDER_ID=YallaPasngr
EOF
tail -n 8 /var/www/bid-backend/Bid-app-Backend/.env
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '72.62.50.86',
  port: 22,
  username: 'root',
  privateKey: readFileSync('C:/Users/Administrator/.ssh/id_ed25519')
});
