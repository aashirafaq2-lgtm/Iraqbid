require('dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

async function run() {
  try {
    const processEndedAuctions = (await import('/var/www/bid-backend/Bid-app-Backend/src/scripts/processEndedAuctions.js')).default;
    await processEndedAuctions();
    console.log("Ran processEndedAuctions successfully!");
    process.exit(0);
  } catch (e) {
    console.error("Error running processEndedAuctions:", e);
    process.exit(1);
  }
}
run();
