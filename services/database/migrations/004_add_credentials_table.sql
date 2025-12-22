-- Migration: Add credentials table for passkey/WebAuthn authentication
-- This stores the public keys and metadata for user passkeys
-- Run this migration: docker exec -i coffelist-db psql -U coffeeadmin -d coffelist < services/database/migrations/004_add_credentials_table.sql

CREATE TABLE IF NOT EXISTS credentials (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  transports TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast credential lookups during authentication
CREATE INDEX IF NOT EXISTS idx_credentials_credential_id ON credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);

SELECT 'Credentials table created!' as status;
SELECT 'Users can now register and authenticate with passkeys!' as info;