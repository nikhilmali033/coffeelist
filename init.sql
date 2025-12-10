-- Create roasteries table
CREATE TABLE IF NOT EXISTS roasteries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO roasteries (name, location, description) VALUES
    ('Blue Bottle Coffee', 'Oakland, CA', 'Known for their single-origin coffees and meticulous brewing methods'),
    ('Stumptown Coffee Roasters', 'Portland, OR', 'Pioneer of third-wave coffee with direct trade relationships'),
    ('Intelligentsia Coffee', 'Chicago, IL', 'Award-winning specialty coffee roaster focused on sustainability');

-- Create an index on location for faster searches
CREATE INDEX idx_roasteries_location ON roasteries(location);