const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
// In docker-compose, services can talk to each other using service names
// So 'postgres' is the hostname (not 'localhost')
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffelist',
  user: process.env.DB_USER || 'coffeeadmin',
  password: process.env.DB_PASSWORD || 'coffeepass123',
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Coffelist API!',
    endpoints: {
      'GET /roasteries': 'Get all roasteries',
      'POST /roasteries': 'Add a new roastery',
      'GET /health': 'Check API health'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Get all roasteries
app.get('/roasteries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roasteries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roasteries:', error);
    res.status(500).json({ error: 'Failed to fetch roasteries' });
  }
});

// Add a new roastery
app.post('/roasteries', async (req, res) => {
  const { name, location, description } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO roasteries (name, location, description) VALUES ($1, $2, $3) RETURNING *',
      [name, location, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding roastery:', error);
    res.status(500).json({ error: 'Failed to add roastery' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Coffelist API running on http://localhost:${port}`);
});