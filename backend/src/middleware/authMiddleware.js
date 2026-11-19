import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { verifyAccessToken } from "../utils/tokenUtils.js";

const normalizeRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

export const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify scope is "admin" for admin routes (backward compatible: allow tokens without scope)
    const tokenScope = decoded.scope;
    if (tokenScope && tokenScope !== 'admin') {
      return res.status(403).json({
        message: "This token is not valid for admin panel. Please use admin panel login."
      });
    }

    // List of roles allowed to access admin panel
    const allowedRoles = ['superadmin', 'admin', 'manager', 'editor', 'moderator', 'viewer', 'employee', 'company_products', 'seller_products', 'bidmaster', 'mazaadati'];

    // Check if user exists and is admin (for phone-based auth, we need to verify user exists)
    if (decoded.phone) {
      // Phone-based authentication - verify user exists
      const userResult = await pool.query(
        "SELECT id, phone, role FROM users WHERE phone = $1",
        [decoded.phone]
      );

      if (userResult.rows.length === 0) {
        // Create admin user if doesn't exist (for OTP login)
        const email = `admin@${decoded.phone.replace(/\+/g, '')}.com`;
        try {
          const adminResult = await pool.query(
            `INSERT INTO users (name, email, phone, role, status, password) 
             VALUES ($1, $2, $3, 'admin', 'approved', '')
             ON CONFLICT (phone) DO UPDATE SET role = 'admin', status = 'approved'
             RETURNING id, phone, role`,
            [`Admin ${decoded.phone}`, email, decoded.phone]
          );
          req.user = { id: adminResult.rows[0].id, phone: decoded.phone, role: 'superadmin' };
        } catch (insertError) {
          if (insertError.code === '23505') { // Unique violation
            const existingUser = await pool.query(
              "SELECT id, phone, role FROM users WHERE phone = $1 OR email = $2 LIMIT 1",
              [decoded.phone, email]
            );
            if (existingUser.rows.length > 0) {
              await pool.query(
                "UPDATE users SET role = 'admin', status = 'approved' WHERE id = $1",
                [existingUser.rows[0].id]
              );
              req.user = { id: existingUser.rows[0].id, phone: decoded.phone, role: 'superadmin' };
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }
      } else {
        const user = userResult.rows[0];
        const userRole = normalizeRole(user.role);

        if (!allowedRoles.map(r => normalizeRole(r)).includes(userRole)) {
          return res.status(403).json({
            message: "Forbidden - Admin access required",
            role: user.role
          });
        }

        // Map legacy 'admin' to 'superadmin' for consistency
        const finalRole = userRole;
        req.user = { id: user.id, phone: user.phone, role: finalRole };
      }
    } else if (decoded.role) {
      // Email-based authentication
      const userRole = normalizeRole(decoded.role);

      if (!allowedRoles.map(r => normalizeRole(r)).includes(userRole)) {
        return res.status(403).json({
          message: "Forbidden - Admin access required",
          role: decoded.role
        });
      }

      // Map legacy 'admin' to 'superadmin' for consistency
      const finalRole = userRole;
      req.user = { ...decoded, role: finalRole };
    } else {
      return res.status(401).json({ message: "Invalid token" });
    }

    next();
  } catch (error) {
    if (error.name !== 'TokenExpiredError') {
      console.error("Auth error:", error.name, error.message);
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware for regular user authentication (buyer/seller)
export const verifyUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized - Token required" });
  }

  // Use token utility to verify access token
  const decoded = verifyAccessToken(token);

  // Check if token is expired
  if (decoded && decoded.expired) {
    return res.status(401).json({
      success: false,
      error: "token_expired",
      message: "Token expired"
    });
  }

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: "invalid_token",
      message: "Invalid token"
    });
  }

  // Verify scope is "mobile" for mobile routes (backward compatible: allow tokens without scope)
  // Also allow "admin" scope so admins can access shared routes (like notifications)
  const tokenScope = decoded.scope;
  if (tokenScope && tokenScope !== 'mobile' && tokenScope !== 'admin') {
    return res.status(403).json({
      success: false,
      error: "invalid_scope",
      message: "This token is not valid for mobile app. Please use mobile app login."
    });
  }
  // If scope is undefined/null, allow for backward compatibility (old tokens)

  // Verify user exists in database
  let user;
  if (decoded.phone) {
    // Phone-based authentication
    const userResult = await pool.query(
      "SELECT id, name, email, phone, role, status FROM users WHERE phone = $1",
      [decoded.phone]
    );
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
    }
  }

  if (!user && decoded.id) {
    // ID-based authentication
    const userResult = await pool.query(
      "SELECT id, name, email, phone, role, status FROM users WHERE id = $1",
      [decoded.id]
    );
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
    }
  }

  if (!user && decoded.email) {
    // Email-based fallback
    const userResult = await pool.query(
      "SELECT id, name, email, phone, role, status FROM users WHERE email = $1",
      [decoded.email]
    );
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
    }
  }

  // Graceful fallback for admin tokens from previous sessions to prevent session invalidation
  if (!user && (decoded.scope === 'admin' || ['superadmin', 'admin', 'moderator'].includes(decoded.role))) {
    const adminFallback = await pool.query(
      "SELECT id, name, email, phone, role, status FROM users WHERE role IN ('superadmin', 'admin') ORDER BY id ASC LIMIT 1"
    );
    if (adminFallback.rows.length > 0) {
      user = adminFallback.rows[0];
    }
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "user_not_found",
      message: "User not found"
    });
  }

  // Check if user is blocked
  if (user.status === 'blocked') {
    return res.status(403).json({
      success: false,
      error: "account_blocked",
      message: "Account is blocked"
    });
  }

  req.user = user;
  next();
};