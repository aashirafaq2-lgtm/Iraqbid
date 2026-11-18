# 🇮🇶 Iraq Bid (مزاد العراق) - Complete Live Auction & Marketplace Platform

Welcome to the **Iraq Bid (مزاد العراق)** monorepo repository. This full-stack project is an end-to-end live digital auction, e-commerce, and inventory management platform designed specifically for the Iraqi marketplace. It powers real-time competitive bidding, instant product purchases ("Buy Now"), automated barcode generation/scanning, and administrative oversight.

---

## 🏛️ Project Architecture & Modules

The repository is structured as a full monorepo with 3 major interconnected components:

```
iraq-bid-app-master/
├── iraq-bid-app-master/      # 📱 Flutter Mobile Application (iOS & Android)
├── backend/                  # ⚙️ Node.js / Express / Socket.io Backend API
└── admin-panel/              # 🖥️ React.js Vite Administrative Dashboard
```

### 1. 📱 Mobile Application (`iraq-bid-app-master/`)
* **Technology:** Flutter (Dart 3.x), Material UI & Cupertino components.
* **Core Capabilities:**
  * **Live Bidding System:** Real-time auction tracking with WebSockets, instant bid increments/decrements, automated countdown timers, and live winning celebration animations.
  * **Instant "Buy Now":** Simplified purchase flow for users to immediately acquire listed inventory.
  * **Safety & Warnings System:** Dynamic defect inspection reports (highlighting condition details and photo inspections with severity indicator colors).
  * **Interactive Rewards & Challenges:** 3D Lucky Wheel spins, Daily Challenges, streak tracking, and referral reward point incentives.
  * **Multi-Language Support:** Fully localized in **Arabic (العربية)** with RTL support and **English**.
  * **Role-Based Workflows:** Seamless phone OTP authentication, automatic buyer onboarding, profile settings, active bids, and won auction tracking.

### 2. ⚙️ Backend API & Realtime Services (`backend/`)
* **Technology:** Node.js, Express.js, Socket.IO, MySQL / MariaDB (Sequelize).
* **Core Capabilities:**
  * **Real-time Auction Engine:** Socket.IO server handling instant bids, broadcast countdown events, room concurrency, and real-time outbid notifications.
  * **Authentication:** Phone-based OTP verification, pre-registration existence checks, and secure JWT authentication.
  * **Product & Order Management:** Automated auction expiry resolution, winner determination, order status pipelines, and transaction tracking.
  * **Enterprise Inventory & Barcodes:** Automated generation of `IQB-XXXXXX` barcodes, batch range creation, and stock tracking.
  * **Push Notifications:** OneSignal integration for outbid alerts, winning notices, and promotional campaigns.

### 3. 🖥️ Administrative Dashboard (`admin-panel/`)
* **Technology:** React 18, Vite, Tailwind CSS, Lucide Icons.
* **Core Capabilities:**
  * **Live Operations:** Product listing creation, image gallery management, starting bids, and auction duration controls.
  * **Defect & Quality Audit:** Flag defect alerts, attach inspection photos, and describe item grade conditions.
  * **Barcode Generator & Batch Printing:** Print-ready PDF generators for thermal label printers and A4 sticker sheets (Code 128 standards).
  * **User & Transaction Monitoring:** Oversee orders, bids, active auctions, and customer verification.

---

## 🚀 Getting Started & Setup Guide

### Prerequisites
* **Flutter SDK:** 3.24+ / 3.47+
* **Node.js:** v18.x or v20.x+
* **Database:** MySQL 8.0+
* **Package Managers:** `npm` / `yarn`, `flutter`

---

### ⚙️ Backend Setup
1. Open the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   PORT=5055
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASS=your_db_password
   DB_NAME=iraq_bid_db
   JWT_SECRET=your_jwt_secret
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

---

### 🖥️ Admin Panel Setup
1. Open the admin panel directory:
   ```bash
   cd admin-panel
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build or run dev server:
   ```bash
   # Development
   npm run dev

   # Production Build
   npm run build
   ```

---

### 📱 Flutter App Setup & Deployment
1. Open the mobile app directory:
   ```bash
   cd iraq-bid-app-master
   ```
2. Install Flutter packages:
   ```bash
   flutter pub get
   ```
3. Run on connected device / emulator:
   ```bash
   flutter run
   ```
4. Build release binaries:
   * **Direct Android APK:**
     ```bash
     flutter build apk --release --android-skip-build-dependency-validation
     ```
   * **Google Play Store AAB Bundle:**
     ```bash
     flutter build appbundle --release --android-skip-build-dependency-validation
     ```
   * **iOS / Apple App Store:**
     Synced via CI/CD (CodeMagic) linked to this repository (`master` branch).

---

## 📦 Releases & Versioning
* **Current Stable Release:** `v1.0.3` (Build `14`)
* **Status:** Tested & Deployed on Production VPS (`iraqbid-backend` & `iraqbid-admin`).

---

## 🔒 License & Ownership
Copyright © 2026 **Iraq Bid (مزad العراق)**. All Rights Reserved. Private & Proprietary Repository.
