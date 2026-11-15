import pool from "../config/db.js";

/**
 * Middleware to verify custom granular employee permissions
 * @param {string} module - 'inventory' | 'auctions' | 'customers' | 'orders' | 'financial' | 'system'
 * @param {string} permissionType - 'view' | 'create' | 'edit' | 'delete' | 'approve'
 */
export const requirePermission = (module, permissionType) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Superadmin / Owner bypasses granular checks
      if (user.role === 'admin' || user.role === 'superadmin') {
        return next();
      }

      // Check user status
      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: "Account is inactive or suspended" });
      }

      const columnMap = {
        view: 'can_view',
        create: 'can_create',
        edit: 'can_edit',
        delete: 'can_delete',
        approve: 'can_approve'
      };

      const requiredCol = columnMap[permissionType];
      if (!requiredCol) {
        return res.status(500).json({ success: false, message: "Invalid permission requested" });
      }

      const query = `
        SELECT ${requiredCol} as has_perm 
        FROM employee_permissions 
        WHERE employee_id = $1 AND module = $2
      `;
      const result = await pool.query(query, [user.id, module]);

      if (result.rows.length === 0 || !result.rows[0].has_perm) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You do not have '${permissionType}' permission for '${module}' module.`
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ success: false, message: "Internal server error checking permissions" });
    }
  };
};

/**
 * Helper to log enterprise activities permanently
 */
export const logActivity = async ({
  employeeId,
  employeeName,
  actionType,
  entityType,
  entityId,
  previousStatus = null,
  newStatus = null,
  details = {},
  notes = null,
  ipAddress = null
}) => {
  try {
    const query = `
      INSERT INTO enterprise_activity_logs 
      (employee_id, employee_name, action_type, entity_type, entity_id, previous_status, new_status, details, notes, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await pool.query(query, [
      employeeId,
      employeeName,
      actionType,
      entityType,
      String(entityId),
      previousStatus,
      newStatus,
      JSON.stringify(details),
      notes,
      ipAddress
    ]);
  } catch (err) {
    console.error("Failed to write enterprise activity log:", err.message);
  }
};

