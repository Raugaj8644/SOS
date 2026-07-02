-- PostGIS initialization for CERP
-- Runs once on first container start (via /docker-entrypoint-initdb.d/)

-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Row-Level Security helper function
CREATE OR REPLACE FUNCTION set_current_area_ids(area_ids uuid[])
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_area_ids', array_to_string(area_ids, ','), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify PostGIS
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', postgis_full_version();
END;
$$;
