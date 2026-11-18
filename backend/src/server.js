import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import adminRoutes from "./Routes/adminRoutes.js";
import authRoutes from "./Routes/authRoutes.js";
import frontendRoutes from "./Routes/frontendRoutes.js"; // Frontend 1.0.1 Routes
import productRoutes from "./Routes/productRoutes.js";
import bidRoutes from "./Routes/bidRoutes.js";
import auctionRoutes from "./Routes/auctionRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import notificationRoutes from "./Routes/notificationRoutes.js";
import uploadRoutes from "./Routes/uploadRoutes.js";
import categoryRoutes from "./Routes/categoryRoutes.js";
import bannerRoutes from "./Routes/bannerRoutes.js";
import referralRoutes from "./Routes/referralRoutes.js";
import walletRoutes from "./Routes/walletRoutes.js";
import sellerRoutes from "./Routes/sellerRoutes.js";
import wishlistRoutes from "./Routes/wishlistRoutes.js";
import buyerBiddingHistoryRoutes from "./Routes/buyerBiddingHistoryRoutes.js";
import sellerEarningsRoutes from "./Routes/sellerEarningsRoutes.js";
import reportRoutes from "./Routes/reportRoutes.js";
import enterpriseRoutes from "./Routes/enterpriseRoutes.js";
import couponRoutes from "./Routes/couponRoutes.js";
import { initCouponTables } from "./controllers/couponController.js";
import specialBidderRoutes from "./Routes/specialBidderRoutes.js";
import { initSpecialBidderTables } from "./controllers/specialBidderController.js";
import { runAutoBidderCycle } from "./controllers/enterpriseOperationsController.js";
import cors from "cors";
import pool from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

/* ======================================================
   ✅ CORS FIX for Flutter Web + Render API
   Works for Express v5 (no crash on wildcard)
====================================================== */

// CORS configuration - allow localhost, Render, LAN IPs & future web app
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile, Postman
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }
    if (origin.includes("10.0.2.2")) {
      return callback(null, true); // Android emulator
    }
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
      return callback(null, true); // LAN IPs for physical devices
    }
    if (origin.includes("bidmaster-api.onrender.com")) {
      return callback(null, true);
    }
    if (origin.includes("api.mazaadati.com")) {
      return callback(null, true); // Production API domain
    }
    if (origin.includes("mazaadati.com")) {
      return callback(null, true); // Production domain
    }
    if (origin.includes("bidmaster")) {
      return callback(null, true); // Any bidmaster domain
    }
    // Allow all temporarily for development
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

// ✅ Handle preflight requests (Express v5 safe)
app.options(/.*/, cors(corsOptions), (req, res) => {
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Max-Age", "86400");
  return res.sendStatus(204); // no content
});

// ✅ Apply global CORS middleware
app.use(cors(corsOptions));

// ✅ Global Logging Middleware
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ Fallback header middleware (extra safety)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// ✅ JSON parsing after CORS
app.use(express.json());

// ✅ Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ======================================================
   ✅ Routes
====================================================== */
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api", frontendRoutes); // ✅ Frontend 1.0.1 Routes (company/seller separation)
app.use("/api/bids", bidRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/buyer/bidding-history", buyerBiddingHistoryRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/seller/earnings", sellerEarningsRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/enterprise", enterpriseRoutes); // ✅ Iraq Bid Enterprise Admin Panel API
app.use("/api/coupons", couponRoutes); // ✅ Influencer Coupons Management API
app.use("/api/special-bidders", specialBidderRoutes); // ✅ Special Bidders Management & Bidding API

// Health check routes
app.get("/", (req, res) => res.send("BidMaster Admin API running ✅"));

// API health check endpoint for monitoring
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'healthy-v3',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dbTime: dbTest.rows[0].current_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error.message
    });
  }
});

// ✅ Server Time Synchronization Endpoint
app.get("/api/time", (req, res) => {
  res.json({
    success: true,
    server_timestamp: new Date().toISOString(),
    timestamp_ms: Date.now()
  });
});

// ✅ Global Error Handler (must be last middleware)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);
  console.error('Error Stack:', err.stack);

  // Don't send response if already sent
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ✅ 404 Handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

/* ======================================================
   ✅ Error Handling for Unhandled Rejections
====================================================== */
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('Error Stack:', err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Error Stack:', err.stack);
  process.exit(1);
});

/* ======================================================
   ✅ Background Tasks (Cron-like)
====================================================== */
import processEndedAuctions from "./scripts/processEndedAuctions.js";

// Process ended auctions every 5 minutes
setInterval(() => {
  console.log('⏰ [Background] Running auction settlement...');
  processEndedAuctions().catch(err => console.error('❌ [Background] Auction settlement failed:', err));
}, 5 * 60 * 1000);

// Run Automatic Bidder check every 1 minute (for auctions in final 10 minutes)
setInterval(() => {
  runAutoBidderCycle().catch(err => console.error('❌ [Background] Auto-bidder error:', err));
}, 60 * 1000);

/* ======================================================
   ✅ Start Server with Socket.io
====================================================== */
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
});

// Make io accessible in controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Allow clients to join specific product rooms for real-time bid updates
  socket.on("join_room", (productId) => {
    const room = `product_${productId}`;
    socket.join(room);
    console.log(`👤 Client ${socket.id} joined room: ${room}`);
  });

  socket.on("join_product", (productId) => {
    const room = `product_${productId}`;
    socket.join(room);
    console.log(`👤 Client ${socket.id} joined room (join_product): ${room}`);
  });

  socket.on("leave_room", (productId) => {
    const room = `product_${productId}`;
    socket.leave(room);
    console.log(`👤 Client ${socket.id} left room: ${room}`);
  });

  socket.on("leave_product", (productId) => {
    const room = `product_${productId}`;
    socket.leave(room);
    console.log(`👤 Client ${socket.id} left room (leave_product): ${room}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server with Socket.io running on port ${PORT}`);
  initCouponTables();
  initSpecialBidderTables();
});