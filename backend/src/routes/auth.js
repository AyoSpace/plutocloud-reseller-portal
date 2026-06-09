const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, reseller_code } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check reseller code
    let resellerId = null;
    let role = 'client';
    if (reseller_code) {
      const resellerCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
        [reseller_code, 'reseller']
      );
      if (resellerCheck.rows.length > 0) {
        resellerId = resellerCheck.rows[0].id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, reseller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), passwordHash, first_name, last_name, phone || null, role, resellerId]
    );

    // Store verification token
    await pool.query(
      `INSERT INTO email_tokens (user_id, token, type, expires_at)
       VALUES ($1, $2, 'verify_email', NOW() + INTERVAL '24 hours')`,
      [rows[0].id, verificationToken]
    );

    await sendVerificationEmail(rows[0], verificationToken);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: { id: rows[0].id, email: rows[0].email, role: rows[0].role }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const { rows } = await pool.query(
      `SELECT et.user_id FROM email_tokens et
       WHERE et.token = $1 AND et.type = 'verify_email' AND et.expires_at > NOW() AND et.used_at IS NULL`,
      [token]
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    await pool.query('UPDATE users SET is_email_verified = true WHERE id = $1', [rows[0].user_id]);
    await pool.query('UPDATE email_tokens SET used_at = NOW() WHERE token = $1', [token]);
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_email_verified) {
      return res.status(401).json({ error: 'Please verify your email first' });
    }

    // If 2FA enabled, return partial token
    if (user.totp_enabled) {
      const tempToken = jwt.sign(
        { userId: user.id, require2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ require2FA: true, tempToken });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      token,
      user: {
        id: user.id, email: user.email,
        first_name: user.first_name, last_name: user.last_name,
        role: user.role, totp_enabled: user.totp_enabled
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify 2FA token
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.require2FA) return res.status(400).json({ error: 'Invalid token' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) return res.status(401).json({ error: 'Invalid 2FA code' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      token,
      user: {
        id: user.id, email: user.email,
        first_name: user.first_name, last_name: user.last_name,
        role: user.role, totp_enabled: user.totp_enabled
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Setup 2FA
router.post('/setup-2fa', authenticate, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `PlutoCloud (${req.user.email})`,
      length: 20
    });
    await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Confirm 2FA setup
router.post('/confirm-2fa', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const { rows } = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [req.user.id]);
    const verified = speakeasy.totp.verify({
      secret: rows[0].totp_secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
    if (!verified) return res.status(400).json({ error: 'Invalid code' });
    await pool.query('UPDATE users SET totp_enabled = true WHERE id = $1', [req.user.id]);
    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm 2FA' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (rows[0]) {
      const token = uuidv4();
      await pool.query(
        `INSERT INTO email_tokens (user_id, token, type, expires_at)
         VALUES ($1, $2, 'reset_password', NOW() + INTERVAL '1 hour')`,
        [rows[0].id, token]
      );
      await sendPasswordResetEmail(rows[0], token);
    }
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const { rows } = await pool.query(
      `SELECT user_id FROM email_tokens WHERE token = $1 AND type = 'reset_password' AND expires_at > NOW() AND used_at IS NULL`,
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired token' });
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
    await pool.query('UPDATE email_tokens SET used_at = NOW() WHERE token = $1', [token]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, first_name, last_name, role, phone, totp_enabled, is_email_verified, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current, password } = req.body;
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await require('bcryptjs').compare(current, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await require('bcryptjs').hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, email, first_name, last_name, phone, role`,
      [first_name, last_name, phone, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Disable 2FA
router.post('/disable-2fa', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const { rows } = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [req.user.id]);
    const verified = require('speakeasy').totp.verify({
      secret: rows[0].totp_secret, encoding: 'base32', token: code, window: 2
    });
    if (!verified) return res.status(400).json({ error: 'Invalid code' });
    await pool.query('UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});
