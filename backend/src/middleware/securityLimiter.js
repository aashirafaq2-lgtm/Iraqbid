// In-Memory High-Performance Rate Limiter with Sliding Window & IP Lockout

const loginAttempts = new Map(); // ip -> { count, firstAttemptTime, blockedUntil }
const apiRequests = new Map(); // ip -> { count, resetTime }

/**
 * Strict Rate Limiter for Admin Authentication (Anti-Brute Force)
 * Max 5 failed attempts per 15 minutes.
 * After 5 failures, the IP is locked out for 15 minutes.
 */
export const adminLoginLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  let record = loginAttempts.get(ip);

  if (!record) {
    record = { count: 0, firstAttemptTime: now, blockedUntil: 0 };
    loginAttempts.set(ip, record);
  }

  // Check if IP is currently blocked
  if (record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. Your IP has been temporarily locked out for security reasons. Please try again in ${remainingSeconds} seconds.`
    });
  }

  // Reset attempt count if window has passed
  if (now - record.firstAttemptTime > windowMs) {
    record.count = 0;
    record.firstAttemptTime = now;
    record.blockedUntil = 0;
  }

  // Attach record to request so login handler can track failure or reset on success
  req.loginAttemptTracker = {
    recordFailure: () => {
      record.count += 1;
      if (record.count >= maxAttempts) {
        record.blockedUntil = Date.now() + windowMs;
        console.warn(`🚨 [SECURITY ALERT] IP ${ip} blocked for 15 minutes due to ${record.count} failed login attempts.`);
      }
    },
    resetSuccess: () => {
      loginAttempts.delete(ip);
    }
  };

  next();
};

/**
 * General API DDoS / Spam Protection
 * Max 200 requests per minute per IP for administrative endpoints
 */
export const apiSecurityRateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 200;

  let record = apiRequests.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    apiRequests.set(ip, record);
    return next();
  }

  record.count += 1;
  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded. Please slow down your requests."
    });
  }

  next();
};

// Cleanup stale records every 30 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now - record.firstAttemptTime > 30 * 60 * 1000 && record.blockedUntil < now) {
      loginAttempts.delete(ip);
    }
  }
  for (const [ip, record] of apiRequests.entries()) {
    if (now > record.resetTime) {
      apiRequests.delete(ip);
    }
  }
}, 30 * 60 * 1000);

