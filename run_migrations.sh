#!/bin/bash
set -e
cd /tmp/migrations

files=(
  001_create_users_table.sql
  002_create_products_table.sql
  003_seed_admin.sql
  004_seed_test_users.sql
  005_create_complete_schema.sql
  006_enhance_products_table.sql
  006_seed_dummy_data.sql
  007_add_referral_system.sql
  007_update_users_table_uuid.sql
  008_fix_categories_schema.sql
  008_seed_admin_users.sql
  009_update_role_names.sql
  010_add_employee_role_and_product_separation.sql
  011_add_missing_tables_columns.sql
  012_fix_employee_role_constraint.sql
  013_add_notifications_and_referrer_id.sql
  014_add_auction_processed.sql
  015_add_onesignal_id.sql
  016_premium_features.sql
  017_iraqbid_enterprise_admin.sql
)

for f in "${files[@]}"; do
  echo "--- Running $f ---"
  sudo -u postgres psql -d iraqbid_production -f "$f" || true
done
echo "=== Migrations finished successfully ==="
