import fs from 'fs';

// 1. Update authMiddleware.js
let authCode = fs.readFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/middleware/authMiddleware.js', 'utf8');
authCode = authCode.replace(
  "const allowedRoles = ['admin', 'superadmin', 'subadmin', 'moderator', 'viewer', 'employee', 'company_products', 'seller_products', 'bidmaster', 'mazaadati'];",
  "const allowedRoles = ['superadmin', 'admin', 'manager', 'editor', 'moderator', 'viewer', 'employee', 'company_products', 'seller_products', 'bidmaster', 'mazaadati'];"
);
authCode = authCode.replaceAll(
  "const finalRole = userRole === 'admin' ? 'superadmin' : userRole;",
  "const finalRole = userRole;"
);
fs.writeFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/middleware/authMiddleware.js', authCode, 'utf8');

// 2. Update roleMiddleware.js
let roleCode = fs.readFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/middleware/roleMiddleware.js', 'utf8');
roleCode = roleCode.replace(
  "if (userRole === 'admin') userRole = 'superadmin';",
  "// Preserve distinct role\n      // if (userRole === 'admin') userRole = 'superadmin';"
);
roleCode = roleCode.replace(
  "if (userRole === 'superadmin') {",
  "// Superadmin has full access across all routes\n      if (userRole === 'superadmin') {"
);
fs.writeFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/middleware/roleMiddleware.js', roleCode, 'utf8');

// 3. Update adminRoutes.js
let routesCode = fs.readFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/Routes/adminRoutes.js', 'utf8');
if (!routesCode.includes('adminLoginLimiter')) {
  routesCode = "import { adminLoginLimiter, apiSecurityRateLimiter } from '../middleware/securityLimiter.js';\n" + routesCode;
  routesCode = routesCode.replace(
    'router.post("/login", AdminController.login);',
    'router.post("/login", adminLoginLimiter, AdminController.login);'
  );
  routesCode = routesCode.replace(
    '// 🔒 All routes require admin authentication',
    '// 🛡️ Global Rate Limiter for all Admin API endpoints\nrouter.use(apiSecurityRateLimiter);\n\n// 🔒 All routes require admin authentication'
  );
  // Add staff routes
  const staffRouteAdd = `
// --- 4-TIER STAFF MANAGEMENT ---
router.get("/staff", authorizeRoles("superadmin", "admin", "manager"), AdminController.getStaff);
router.post("/staff", authorizeRoles("superadmin", "admin", "manager"), AdminController.createStaff);
`;
  routesCode = routesCode.replace('// --- USERS ---', staffRouteAdd + '\n// --- USERS ---');
  fs.writeFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/Routes/adminRoutes.js', routesCode, 'utf8');
}

// 4. Update enterpriseRoutes.js to enforce 4-tier RBAC
let entCode = fs.readFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/Routes/enterpriseRoutes.js', 'utf8');
if (!entCode.includes('apiSecurityRateLimiter')) {
  entCode = "import { apiSecurityRateLimiter } from '../middleware/securityLimiter.js';\nimport { authorizeRoles } from '../middleware/roleMiddleware.js';\n" + entCode;
  entCode = entCode.replace(
    'router.use((req, res, next) => {',
    'router.use(apiSecurityRateLimiter);\nrouter.use((req, res, next) => {'
  );
  fs.writeFileSync('e:/Ahmed work/iraq-bid-app-master/backend/src/Routes/enterpriseRoutes.js', entCode, 'utf8');
}

console.log('ALL_BACKEND_FILES_PATCHED_SUCCESSFULLY');

