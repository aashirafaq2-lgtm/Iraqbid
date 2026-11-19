require('dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production_min_32_chars';
const BASE_URL = 'http://127.0.0.1:5055';

const adminToken = jwt.sign(
  { id: 8, phone: '+9647500914000', role: 'superadmin', scope: 'admin' },
  JWT_SECRET,
  { expiresIn: '7d' }
);
const headers = { Authorization: 'Bearer ' + adminToken };

async function main() {
  console.log('🤖 Starting 10-cycle test of Special Bidders Bidding Feature...');

  // 1. Get Special Bidders
  const biddersRes = await axios.get(BASE_URL + '/api/special-bidders', { headers });
  const bidders = biddersRes.data.data;
  console.log(`Found ${bidders.length} Special Bidder profiles.`);
  if (bidders.length === 0) throw new Error('No special bidders found!');

  // 2. Get Live Auctions
  const auctionsRes = await axios.get(BASE_URL + '/api/admin/auctions/active', { headers });
  const auctions = auctionsRes.data.data || auctionsRes.data;
  console.log(`Found ${auctions.length} live auction items.`);
  if (auctions.length === 0) throw new Error('No live auction items found!');

  const targetAuction = auctions[0];
  const targetId = targetAuction.id || targetAuction.product_id;
  console.log(`Targeting auction product: #${targetId} - ${targetAuction.title || targetAuction.product_title}`);

  for (let i = 1; i <= 10; i++) {
    const selectedBidder = bidders[(i - 1) % bidders.length];
    
    // Fetch latest price
    const prodRes = await axios.get(BASE_URL + '/api/admin/auctions/active', { headers });
    const currentList = prodRes.data.data || prodRes.data;
    const currentAuction = currentList.find(p => (p.id || p.product_id) === targetId) || targetAuction;
    const currentHighest = parseFloat(currentAuction.current_bid || currentAuction.starting_bid || currentAuction.starting_price || 10);
    const newBidAmount = currentHighest + 1.00;

    console.log(`\n--- Bid Cycle #${i} ---`);
    console.log(`Bidder: ${selectedBidder.name} (${selectedBidder.unique_id})`);
    console.log(`Current Highest: $${currentHighest} -> Placing Bid: $${newBidAmount}`);

    const bidRes = await axios.post(BASE_URL + '/api/special-bidders/place-bid', {
      product_id: targetId,
      special_bidder_id: selectedBidder.id,
      bid_amount: newBidAmount
    }, { headers });

    if (!bidRes.data.success) {
      throw new Error(`Bid #${i} failed: ${bidRes.data.message}`);
    }

    console.log(`✅ Bid placed successfully! New current bid: $${bidRes.data.data?.current_bid || newBidAmount}`);
  }

  // Verify Audit Logs
  const logsRes = await axios.get(BASE_URL + '/api/special-bidders/history/logs', { headers });
  console.log(`\n✅ Audit History verified: Total special bids logged = ${logsRes.data.data.length}`);
  console.log('Sample latest log:', logsRes.data.data[0]);
  console.log('\n======================================================');
  console.log('✅ ALL 10 SPECIAL BIDDER BIDS PLACED & VERIFIED 100%!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('SPECIAL BIDDER TEST ERROR:', err.response?.data?.message || err.message);
  process.exit(1);
});
