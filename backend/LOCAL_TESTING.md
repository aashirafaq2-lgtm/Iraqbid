# 💻 LOCALHOST TESTING GUIDE

Aap is backend ko apne laptop (localhost) par test kar sakte hain. Niche diye gaye steps follow karein:

## 1. Prerequisites (Zaroori cheezein)
- **Node.js**: Install hona chahiye (`node -v` check karein).
- **PostgreSQL**: Install hona chahiye aur chal raha ho.
- **Twilio Account**: Agar real OTP test karna hai (New registration ke liye).

## 2. Setup Steps

### Step 1: Dependencies Install karein
Folder mein terminal kholein aur ye command chalayein:
```bash
npm install
```

### Step 2: Environment Variables (.env)
Ek `.env` file banayein (agar nahi hai) aur ye values set karein:
```env
PORT=5000
DATABASE_URL=postgres://username:password@localhost:5432/database_name
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# Twilio Credentials (OTP ke liye)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_VERIFY_SERVICE_SID=your_service_sid

# OTP Bypass (Testing ke liye)
# Agar isko TRUE rakhenge toh existing users bina OTP ke login kar sakenge.
# New registration ke liye OTP hamesha forced rahega.
OTP_BYPASS=false
```

### Step 3: Database Migrations
Nayi tables aur columns banane ke liye ye command chalayein:
```bash
node run-notification-migration.js
```

### Step 4: Server Start karein
```bash
npm start
```
Ab aapka backend `http://localhost:5000` par chal raha hai.

---

## 3. Testing with Postman / Mobile App

### A. New Registration (OTP Test)
- **Endpoint**: `POST /api/auth/verify-otp`
- **Body**:
  ```json
  {
      "phone": "+9647701234567",
      "otp": "123456" 
  }
  ```
- **Note**: New user ke liye real OTP zarurat hogi jo Twilio bhejega.

### B. Existing User Login
- Agar `OTP_BYPASS=true` hai, toh aap koi bhi 6-digit OTP daal kar login kar sakte hain.

---

## 4. Key Features to Check
1. **Notifications**: Bid lagne par seller ko message jata hai ya nahi.
2. **Referral**: Signup ke waqt `referral_code` daal kar check karein ke `referrer_id` save ho raha hai.
3. **Product Visibility**: Kisi bhi account se saare "Approved" products nazar aane chahiye.
4. **Bids**: Ek product par multiple bids lagayein aur check karein ke latest bid hi wapas aa rahi hai.

---

## ⚠️ Troubleshooting
- **ECONNREFUSED**: Iska matlab database nahi chal raha ya URL galat hai.
- **Twilio Error**: SID ya Token galat hai.
- **Port 5000 busy**: Kisi aur app ne ye port occupy kiya hua hai (.env mein PORT change kar dein).
