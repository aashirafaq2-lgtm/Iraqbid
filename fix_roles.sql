ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'manager', 'editor', 'employee', 'moderator', 'viewer', 'company_products', 'seller_products', 'buyer', 'user'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c';
