// API Service - Express Server
// Location: services/api/src/server.js

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
    service: 'api',
    version: '1.0.0',
    endpoints: {
      'GET /roasteries': 'Get all roasteries',
      'POST /roasteries': 'Add a new roastery',
      'GET /users': 'Get all users',
      'POST /users': 'Add a new user',
      'GET /users/:id/roasteries': 'Get roasteries owned by a user',
      'GET /health': 'Check API health'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', service: 'api' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Add a new roastery (optionally with owner)
app.post('/roasteries', async (req, res) => {
  const { name, location, description, owner_id } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO roasteries (name, location, description, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, location, description, owner_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding roastery:', error);
    res.status(500).json({ error: 'Failed to add roastery' });
  }
});

// Add a new roastery (optionally with owner)
// Get all roasteries (with owner info)
app.get('/roasteries', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.location,
        r.description,
        r.created_at,
        r.owner_id,
        u.username as owner_username,
        u.email as owner_email
      FROM roasteries r
      LEFT JOIN users u ON r.owner_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roasteries:', error);
    res.status(500).json({ error: 'Failed to fetch roasteries' });
  }
});

// ============== USER ENDPOINTS ==============

// Get all users
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a specific user by ID
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create a new user
app.post('/users', async (req, res) => {
  const { username, email } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email, created_at',
      [username, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Check for unique constraint violation (duplicate username or email)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all roasteries owned by a specific user
app.get('/users/:id/roasteries', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT r.* 
      FROM roasteries r
      WHERE r.owner_id = $1
      ORDER BY r.created_at DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user roasteries:', error);
    res.status(500).json({ error: 'Failed to fetch roasteries' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Coffelist API Service running on http://localhost:${port}`);
});