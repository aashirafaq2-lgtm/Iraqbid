import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * Role-Based Access Control Middleware
 * Checks if the authenticated user's role is in the allowed roles list
 * 
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const normalizeRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

export const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      let userRole = null;
      let userId = null;

      // ✅ OPTIMIZATION: Use req.user if already set by verifyAdmin middleware
      if (req.user && req.user.role) {
        userRole = normalizeRole(req.user.role);
        userId = req.user.id;
      } else {
        // Fallback for routes not using verifyAdmin (though admin panel routes should)
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
          return res.status(401).json({ success: false, message: "Unauthorized - Token required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;

        if (decoded.phone) {
          const userResult = await pool.query("SELECT role FROM users WHERE phone = $1", [decoded.phone]);
          userRole = normalizeRole(userResult.rows[0]?.role);
        } else {
          userRole = normalizeRole(decoded.role);
        }
      }

      // Map legacy 'admin' to 'superadmin'
      // Preserve distinct role
      // if (userRole === 'admin') userRole = 'superadmin';

      // Normalize allowed roles for comparison
      const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role));

      // ✅ SUPERPOWER: Superadmins and Admins can access everything in admin panel
      // Superadmin has full access across all routes
      if (userRole === 'superadmin') {
        return next();
      }

      // Check if user role is in allowed roles list
      // Check if user role is in allowed roles list
      if (!normalizedAllowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: insufficient privileges",
          required: normalizedAllowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error("Role authorization error:", error.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  };
};

/**
 * Helper function to check if user has any of the specified roles
 * Can be used in controllers for additional checks
 */
export const hasRole = (userRole, ...allowedRoles) => {
  const normalizedUserRole = userRole?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

  // Map legacy 'admin' to 'superadmin'
  const roleToCheck = normalizedUserRole === 'admin' ? 'superadmin' : normalizedUserRole;

  return normalizedAllowedRoles.includes(roleToCheck);
};

