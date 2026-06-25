import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow sync of relatively large encrypted JSON state

// JWT Verification Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Authorization: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key', (err, userPayload) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired' });
    }
    req.user = userPayload; // Contains id and username
    next();
  });
}

// 1. Get user salt and verification token for local password validation
app.get('/api/auth/salt', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username parameter is required' });
  }

  try {
    const result = await pool.query('SELECT security_salt, security_verify FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User does not exist' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch salt error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Register user
app.post('/api/auth/register', async (req, res) => {
  const { username, auth_hash, security_salt, security_verify } = req.body;
  if (!username || !auth_hash || !security_salt || !security_verify) {
    return res.status(400).json({ error: 'Missing required registration parameters' });
  }

  try {
    const hashed = await bcrypt.hash(auth_hash, 10);
    const result = await pool.query(
      `INSERT INTO users (username, auth_hash, security_salt, security_verify) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [username.trim(), hashed, security_salt, security_verify]
    );
    const userId = result.rows[0].id;
    
    // Create initial empty vault
    await pool.query('INSERT INTO vaults (user_id, data_blob) VALUES ($1, $2)', [userId, '{}']);

    const token = jwt.sign(
      { id: userId, username: username.trim() },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '2h' }
    );

    res.status(201).json({ success: true, token, userId });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration database error' });
  }
});

// 3. Login verify & token generation
app.post('/api/auth/login', async (req, res) => {
  const { username, auth_hash } = req.body;
  if (!username || !auth_hash) {
    return res.status(400).json({ error: 'Username and auth_hash are required' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(auth_hash, user.auth_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '2h' }
    );

    res.json({ success: true, token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// 4. Get encrypted vault
app.get('/api/vault/get', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT data_blob, last_updated FROM vaults WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ data_blob: null, last_updated: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Vault fetch error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Sync / update encrypted vault
app.post('/api/vault/sync', authenticate, async (req, res) => {
  const { data_blob } = req.body;
  if (!data_blob) {
    return res.status(400).json({ error: 'data_blob is required' });
  }

  try {
    await pool.query(
      `INSERT INTO vaults (user_id, data_blob, last_updated) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET data_blob = EXCLUDED.data_blob, last_updated = CURRENT_TIMESTAMP`,
      [req.user.id, data_blob]
    );
    res.json({ success: true, last_updated: new Date() });
  } catch (err) {
    console.error('Vault sync error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Zero-Knowledge sync server running on port ${PORT}`);
});
