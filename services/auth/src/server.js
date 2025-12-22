// Auth Service - Passkey/WebAuthn Authentication
// Location: services/auth/src/server.js

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const app = express();
const port = 4000;

// Middleware
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffelist',
  user: process.env.DB_USER || 'coffeeadmin',
  password: process.env.DB_PASSWORD || 'coffeepass123',
});

// Session middleware with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'coffelist-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax'
  }
}));

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Auth Service database connected at:', res.rows[0].now);
  }
});

// WebAuthn configuration
// In production, use your actual domain
const rpName = 'Coffelist';
const rpID = 'localhost';
const origin = 'http://localhost:8080';

// Helper function to convert base64url to Buffer
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + '='.repeat(padLen), 'base64');
}

// Helper function to convert Buffer to base64url
function bufferToBase64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ============== ROUTES ==============

app.get('/', (req, res) => {
  res.json({
    message: 'Coffelist Auth Service - Passkey/WebAuthn',
    service: 'auth',
    version: '1.0.0',
    endpoints: {
      'POST /register/start': 'Start passkey registration',
      'POST /register/verify': 'Complete passkey registration',
      'POST /login/start': 'Start passkey authentication',
      'POST /login/verify': 'Complete passkey authentication',
      'GET /session': 'Get current session info',
      'POST /logout': 'Logout and destroy session',
      'GET /health': 'Health check'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', service: 'auth' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// ============== REGISTRATION FLOW ==============

// Step 1: Start registration - generate challenge
app.post('/register/start', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Generate a user ID (will be saved after successful registration)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId,
      userName: username,
      userDisplayName: username,
      // Attestation type
      attestationType: 'none',
      // Authenticator selection
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in session (will be verified later)
    req.session.currentChallenge = options.challenge;
    req.session.registrationUser = { userId, username, email };

    res.json(options);
  } catch (error) {
    console.error('Registration start error:', error);
    res.status(500).json({ error: 'Failed to start registration' });
  }
});

// Step 2: Complete registration - verify response
app.post('/register/verify', async (req, res) => {
  try {
    const { credential } = req.body;
    const expectedChallenge = req.session.currentChallenge;
    const userData = req.session.registrationUser;

    if (!expectedChallenge || !userData) {
      return res.status(400).json({ error: 'No registration in progress' });
    }

    // Verify the credential
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Start a transaction to create user and credential
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const userResult = await client.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email, created_at',
        [userData.username, userData.email]
      );
      const user = userResult.rows[0];

      // Insert credential
      await client.query(
        `INSERT INTO credentials 
         (user_id, credential_id, public_key, counter, transports) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          bufferToBase64url(credentialID),
          bufferToBase64url(credentialPublicKey),
          counter,
          JSON.stringify(credential.response.transports || [])
        ]
      );

      await client.query('COMMIT');

      // Clear registration data from session
      delete req.session.currentChallenge;
      delete req.session.registrationUser;

      // Set user session
      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({
        verified: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration verify error:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

// ============== AUTHENTICATION FLOW ==============

// Step 1: Start authentication - generate challenge
app.post('/login/start', async (req, res) => {
  try {
    const { username } = req.body;

    let allowCredentials = undefined;

    // If username provided, get their credentials
    if (username) {
      const result = await pool.query(
        `SELECT c.credential_id, c.transports 
         FROM credentials c 
         JOIN users u ON c.user_id = u.id 
         WHERE u.username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      allowCredentials = result.rows.map(row => ({
        id: base64urlToBuffer(row.credential_id),
        type: 'public-key',
        transports: JSON.parse(row.transports || '[]'),
      }));
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials,
    });

    // Store challenge in session
    req.session.currentChallenge = options.challenge;

    res.json(options);
  } catch (error) {
    console.error('Login start error:', error);
    res.status(500).json({ error: 'Failed to start authentication' });
  }
});

// Step 2: Complete authentication - verify response
app.post('/login/verify', async (req, res) => {
  try {
    const { credential } = req.body;
    const expectedChallenge = req.session.currentChallenge;

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No authentication in progress' });
    }

    const credentialID = bufferToBase64url(credential.rawId);

    // Get the credential from database
    const result = await pool.query(
      `SELECT c.*, u.id as user_id, u.username, u.email 
       FROM credentials c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.credential_id = $1`,
      [credentialID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    const credentialRecord = result.rows[0];

    // Verify the authentication
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: base64urlToBuffer(credentialRecord.credential_id),
        credentialPublicKey: base64urlToBuffer(credentialRecord.public_key),
        counter: credentialRecord.counter,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    // Update counter (prevents replay attacks)
    await pool.query(
      'UPDATE credentials SET counter = $1 WHERE credential_id = $2',
      [verification.authenticationInfo.newCounter, credentialID]
    );

    // Clear challenge from session
    delete req.session.currentChallenge;

    // Set user session
    req.session.userId = credentialRecord.user_id;
    req.session.username = credentialRecord.username;

    res.json({
      verified: true,
      user: {
        id: credentialRecord.user_id,
        username: credentialRecord.username,
        email: credentialRecord.email
      }
    });
  } catch (error) {
    console.error('Login verify error:', error);
    res.status(500).json({ error: 'Failed to verify authentication' });
  }
});

// ============== SESSION MANAGEMENT ==============

// Get current session
app.get('/session', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🔐 Coffelist Auth Service running on http://localhost:${port}`);
});