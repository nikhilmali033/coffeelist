-- Migration: Add users table
-- Run this to add user functionality to your database

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for fast lookups (login, etc.)
CREATE INDEX idx_users_email ON users(email);

-- Add some sample users
INSERT INTO users (username, email) VALUES
    ('james', 'james@bluebottle.com'),
    ('duane', 'duane@stumptown.com'),
    ('nikhil', 'nikhil@coffelist.com');

-- Show what we created
SELECT 'Users table created!' as status;
SELECT * FROM users;