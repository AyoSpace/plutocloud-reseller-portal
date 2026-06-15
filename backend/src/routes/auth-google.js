const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth - verify token from frontend
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub: googleId, picture } = payload;

    // Check if user exists
    let { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];

    if (!user) {
      // Create new user
      const { rows: newUser } = await pool.query(
        `INSERT INTO users (email, first_name, last_name, password_hash, is_email_verified, role, google_id)
         VALUES ($1, $2, $3, $4, true, 'client', $5)
         RETURNING *`,
        [email, given_name, family_name || '', 'GOOGLE_AUTH', googleId]
      );
      user = newUser[0];
    } else if (!user.google_id) {
      // Link Google account to existing user
      await pool.query(
        'UPDATE users SET google_id = $1, is_email_verified = true WHERE id = $2',
        [googleId, user.id]
      );
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        totp_enabled: user.totp_enabled || false,
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

module.exports = router;
