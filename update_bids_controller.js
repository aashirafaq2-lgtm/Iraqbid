const fs = require('fs');

let code = fs.readFileSync('backend/src/controllers/bidsController.js', 'utf8');

// 1. Identify previous highest bidder BEFORE inserting the new bid inside transaction:
// Find where product is fetched inside transaction:
const lockTarget = 'const product = productResult.rows[0];';
const lockRepl = `const product = productResult.rows[0];
        // Capture the immediate previous highest bidder BEFORE updating
        const previousHighestBidderId = product.highest_bidder_id;
        const previousHighestBidAmount = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;`;

if (code.includes(lockTarget) && !code.includes('previousHighestBidderId')) {
  code = code.replace(lockTarget, lockRepl);
  console.log('Added previousHighestBidderId capture before bid insert');
}

// 2. Replace the outbid notification block to strictly notify ONLY the immediate previous highest bidder:
const oldNotifMarker = '// Notify previous bidders (Outbid)';
const oldNotifEndMarker = '// Prepare response data';

const startIdx = code.indexOf(oldNotifMarker);
const endIdx = code.indexOf(oldNotifEndMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newNotifBlock = `// Notify ONLY the immediately previous highest bidder (Exact Client Requirement)
        try {
          if (
            previousHighestBidderId && 
            previousHighestBidderId !== buyerId && 
            bidAmount > previousHighestBidAmount
          ) {
            await notifyUser(
              previousHighestBidderId,
              'You’ve Been Outbid!',
              \`Someone placed a higher bid of $\${bidAmount} on \${product.title}. Place a new bid now!\`,
              'outbid',
              productIdNum
            );
            console.log(\`✅ [BidPlace] Outbid notification sent ONLY to previous highest bidder: \${previousHighestBidderId}\`);
          } else {
            console.log('ℹ️ [BidPlace] No previous outbid notification needed (first bid or same bidder outbidding self)');
          }
        } catch (biddersNotifError) {
          console.log('⚠️ [BidPlace] Failed to notify previous highest bidder:', biddersNotifError.message);
        }

        `;

  code = code.substring(0, startIdx) + newNotifBlock + code.substring(endIdx);
  console.log('Replaced outbid block with strict immediate-previous-bidder logic');
}

// 3. Update getBidsByProduct to return full bidders list and unique bidders count (matching screenshot 2)
const oldGetBidsMarker = 'async getBidsByProduct(req, res) {';
const oldGetBidsEndMarker = '// GET /api/bids/mine';

const gbStart = code.indexOf(oldGetBidsMarker);
const gbEnd = code.indexOf(oldGetBidsEndMarker);

if (gbStart !== -1 && gbEnd !== -1) {
  const newGetBidsBlock = `async getBidsByProduct(req, res) {
    try {
      const { productId } = req.params;

      // 1. Fetch full bids history for product with bidder names and timestamps
      const result = await pool.query(
        \`SELECT 
          b.id,
          b.product_id,
          b.user_id,
          b.amount,
          b.created_at,
          COALESCE(u.name, 'Bidder ' || b.user_id) as bidder_name
        FROM bids b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.product_id = $1
        ORDER BY b.amount DESC, b.created_at DESC\`,
        [productId]
      );

      // 2. Count total bids and unique bidders
      const totalBids = result.rows.length;
      const uniqueBidders = new Set(result.rows.map(r => r.user_id)).size;
      const highestBid = result.rows[0] || null;

      res.json({
        success: true,
        data: result.rows,
        summary: {
          total_bids: totalBids,
          unique_bidders: uniqueBidders,
          highest_bid: highestBid,
          highest_bidder_name: highestBid?.bidder_name || null
        }
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  `;

  code = code.substring(0, gbStart) + newGetBidsBlock + code.substring(gbEnd);
  console.log('Upgraded getBidsByProduct to return full history + summary');
}

fs.writeFileSync('backend/src/controllers/bidsController.js', code, 'utf8');
console.log('bidsController.js successfully updated!');
