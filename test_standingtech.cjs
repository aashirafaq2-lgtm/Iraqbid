const { StandingTechService } = require('/var/www/bid-backend/Bid-app-Backend/src/services/standingTechService.js');

async function testSMS() {
  console.log('Testing StandingTech SMS sending to 9647700914000...');
  const res = await StandingTechService.sendOTP('+9647700914000', '123456');
  console.log('StandingTech response:', res);
}

testSMS().catch(console.error);
