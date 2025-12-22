-- Migration: Add session table for authentication
-- This table stores user sessions for the auth service
-- Run this migration: docker exec -i coffelist-db psql -U coffeeadmin -d coffelist < services/database/migrations/003_add_session_table.sql

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

SELECT 'Session table created!' as status;