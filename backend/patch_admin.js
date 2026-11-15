import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/adminController.js';
let code = fs.readFileSync(filePath, 'utf8');

// Find and replace login method
const loginStart = code.indexOf('async login(req, res) {');
if (loginStart === -1) {
  console.error('Could not find async login(req, res) {');
  process.exit(1);
}

// Find end of login method
const nextMethod = code.indexOf('async getUsers(req, res) {', loginStart);
if (nextMethod === -1) {
  console.error('Could not find async getUsers(req, res) {');
  process.exit(1);
}

const replacementLogin = `async login(req, res) {
    const { email, password } = req.body;
    const tracker = req.loginAttemptTracker;

    if (!email || !password) {
      if (tracker) tracker.recordFailure();
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await UserModel.findByEmail(email.trim().toLowerCase());

    const allowedRoles = ['superadmin', 'admin', 'manager', 'editor', 'moderator', 'viewer', 'employee'];
    const userRole = user?.role?.toLowerCase()?.trim();

    if (!user || !allowedRoles.includes(userRole)) {
      if (tracker) tracker.recordFailure();
      return res.status(400).json({ message: "Invalid credentials or unauthorized role" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      if (tracker) tracker.recordFailure();
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Reset failed attempts on success
    if (tracker) tracker.resetSuccess();

    // Preserve exact 4-tier role
    const finalRole = userRole;

    // Generate token with scope="admin" for admin panel
    const token = jwt.sign(
      { id: user.id, role: finalRole, name: user.name, email: user.email, scope: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: finalRole
      }
    });
  },

  // `;

code = code.slice(0, loginStart) + replacementLogin + code.slice(nextMethod);

// Add getStaff and createStaff before the last closing };
const lastBraceIndex = code.lastIndexOf('};');
if (lastBraceIndex === -1) {
  console.error('Could not find last };');
  process.exit(1);
}

const staffCode = `
  // ✅ 4-Tier Staff Management: List Administrative Staff
  async getStaff(req, res) {
    try {
      const staffRoles = ['superadmin', 'admin', 'manager', 'editor', 'moderator', 'viewer', 'employee'];
      const result = await pool.query(
        "SELECT id, name, email, phone, role, status, created_at FROM users WHERE role = ANY($1::text[]) ORDER BY id DESC",
        [staffRoles]
      );
      res.json({ success: true, staff: result.rows });
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ✅ 4-Tier RBAC Staff Creation with Strict Server Hierarchy Enforcement
  async createStaff(req, res) {
    try {
      const creatorRole = (req.user?.role || '').toLowerCase().trim();
      const { name, email, password, phone, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, error: "Name, email, password, and role are required" });
      }

      const targetRole = role.toLowerCase().trim();

      // Strict Hierarchy Rules:
      // Superadmin can create: admin, manager, editor
      // Admin can create: manager, editor (CANNOT create superadmin or admin)
      // Manager can create: editor only
      // Editor cannot create anyone
      if (creatorRole === 'superadmin') {
        if (!['admin', 'manager', 'editor'].includes(targetRole)) {
          return res.status(400).json({ success: false, error: "Invalid staff role. Permitted: admin, manager, editor" });
        }
      } else if (creatorRole === 'admin') {
        if (!['manager', 'editor'].includes(targetRole)) {
          return res.status(403).json({
            success: false,
            error: "Admins cannot create Admin or Superadmin accounts. You may only create Manager or Editor accounts."
          });
        }
      } else if (creatorRole === 'manager') {
        if (targetRole !== 'editor') {
          return res.status(403).json({
            success: false,
            error: "Managers are restricted to creating Editor accounts only."
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: "Access denied: insufficient privileges to create administrative staff."
        });
      }

      // Check if user already exists
      const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertResult = await pool.query(
        "INSERT INTO users (name, email, password, phone, role, status, created_at) VALUES ($1, $2, $3, $4, $5, 'approved', CURRENT_TIMESTAMP) RETURNING id, name, email, phone, role, status, created_at",
        [name.trim(), email.trim().toLowerCase(), hashedPassword, phone || null, targetRole]
      );

      // Log activity
      try {
        await pool.query(
          "INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details) VALUES ($1, 'Staff member created', 'staff', $2, $3)",
          [req.user?.id || 1, insertResult.rows[0].id, JSON.stringify({ role: targetRole, creatorRole })]
        );
      } catch (e) {
        console.warn('Logging skipped:', e.message);
      }

      res.status(201).json({
        success: true,
        message: 'Staff account (' + targetRole + ') created successfully',
        staff: insertResult.rows[0]
      });
    } catch (error) {
      console.error("Error in createStaff:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
`;

code = code.slice(0, lastBraceIndex) + staffCode;
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully modified adminController.js');

