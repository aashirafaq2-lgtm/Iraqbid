# QUICK DEPLOYMENT GUIDE

## 🚀 Deploy in 5 Steps

### Step 1: Run Migrations
```bash
# Option A: Using psql directly
psql -U your_user -d your_database -f migrations/013_add_notifications_and_referrer_id.sql
psql -U your_user -d your_database -f migrations/014_add_auction_processed.sql

# Option B: Using Node script (requires .env with DATABASE_URL)
node run-notification-migration.js
```

### Step 2: Set Up Cron Job
```bash
# Add to crontab (every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * cd /path/to/Bid-app-Backend-main && node src/scripts/processEndedAuctions.js >> logs/auction.log 2>&1
```

### Step 3: Restart Server
```bash
npm start
# OR
pm2 restart all
```

### Step 4: Test Endpoints
```bash
# Test OTP bypass (should work without OTP)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647701234567"}'

# Test notifications
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Monitor
```bash
# Check server logs
tail -f logs/auction.log

# Check for errors
pm2 logs
```

---

## ✅ What Changed

1. **OTP Disabled** - Users can register without OTP
2. **Referral System** - Stores referrer_id when referral code provided
3. **Product Visibility** - All users see approved products
4. **Bid API** - Returns only highest bid per product
5. **Notifications** - Auto-created for bids, approvals, rejections, auction ends

---

## ⚠️ Important

- **Migrations MUST run before code deployment**
- **Cron job MUST be set up for auction notifications**
- **No Firebase** - notifications are database-only
- **No breaking changes** - all existing endpoints still work

---

## 🆘 Troubleshooting

**Migration fails:**
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Check user has CREATE TABLE permissions

**Cron job not working:**
- Check cron logs: `grep CRON /var/log/syslog`
- Verify path is absolute
- Ensure node is in PATH

**Server won't start:**
- Run `npm install` first
- Check .env file exists
- Verify port 5000 is available

---

## 📞 Support

See `IMPLEMENTATION_SUMMARY.md` for full details.
