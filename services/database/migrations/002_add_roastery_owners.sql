-- Migration: Add owner relationship to roasteries
-- Run this AFTER 001_add_users.sql

-- Add owner_id column (nullable for now, since existing roasteries don't have owners)
ALTER TABLE roasteries 
ADD COLUMN owner_id INT;

-- Add foreign key constraint
ALTER TABLE roasteries
ADD CONSTRAINT fk_roasteries_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index on owner_id for fast lookups
CREATE INDEX idx_roasteries_owner_id ON roasteries(owner_id);

-- Assign existing roasteries to users (optional - you can skip this)
UPDATE roasteries SET owner_id = 1 WHERE name = 'Blue Bottle Coffee';
UPDATE roasteries SET owner_id = 2 WHERE name = 'Stumptown Coffee Roasters';
UPDATE roasteries SET owner_id = 1 WHERE name = 'Intelligentsia Coffee';

-- Show what we did
SELECT 'Foreign key added to roasteries!' as status;
SELECT 
    r.name as roastery,
    u.username as owner
FROM roasteries r
LEFT JOIN users u ON r.owner_id = u.id;