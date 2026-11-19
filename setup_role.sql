DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'iraqbid_user') THEN
    CREATE ROLE iraqbid_user WITH LOGIN PASSWORD 'IraqBid2026SecurePass!';
  ELSE
    ALTER ROLE iraqbid_user WITH PASSWORD 'IraqBid2026SecurePass!';
  END IF;
END
$$;
