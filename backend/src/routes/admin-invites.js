const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../services/email');

// Generate an admin invite (super_admin only)
router.post('/invite', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !['finance_admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid email and role (finance_admin or super_admin) required' });
    }

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing[0]) return res.status(400).json({ error: 'A user with this email already exists' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO admin_invites (email, role, token, invited_by, expires_at) VALUES ($1,$2,$3,$4,$5)`,
      [email, role, token, req.user.id, expiresAt]
    );

    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to Pluto Cloud Computing Portal</h2>
        <p>You have been invited to join as a <strong>${role.replace('_', ' ')}</strong>.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Accept Invitation</a></p>
        <p>This link expires in 7 days. If you did not expect this invitation, please ignore this email.</p>
      </div>
    `;
    await sendEmail(email, 'Invitation to Pluto Cloud Computing Portal', html);

    res.json({ message: 'Invite sent successfully', inviteUrl });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// List all pending invites (super_admin only)
router.get('/invites', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ai.id, ai.email, ai.role, ai.expires_at, ai.used_at, ai.created_at,
              u.first_name as invited_by_name
       FROM admin_invites ai
       LEFT JOIN users u ON u.id = ai.invited_by
       ORDER BY ai.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load invites' });
  }
});

// Revoke a pending invite
router.delete('/invites/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM admin_invites WHERE id = $1 AND used_at IS NULL', [req.params.id]);
    res.json({ message: 'Invite revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
});

// Verify invite token (public - for the accept invite page)
router.get('/invite/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT email, role, expires_at, used_at FROM admin_invites WHERE token = $1`,
      [req.params.token]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invalid invite link' });
    if (rows[0].used_at) return res.status(400).json({ error: 'This invite has already been used' });
    if (new Date(rows[0].expires_at) < new Date()) return res.status(400).json({ error: 'This invite has expired' });
    res.json({ email: rows[0].email, role: rows[0].role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});

// Accept invite - create account (public)
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, first_name, last_name, password } = req.body;
    if (!token || !first_name || !last_name || !password || password.length < 8) {
      return res.status(400).json({ error: 'All fields required, password must be 8+ characters' });
    }

    const { rows } = await pool.query('SELECT * FROM admin_invites WHERE token = $1', [token]);
    const invite = rows[0];
    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
    if (invite.used_at) return res.status(400).json({ error: 'This invite has already been used' });
    if (new Date(invite.expires_at) < new Date()) return res.status(400).json({ error: 'This invite has expired' });

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query('BEGIN');
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_email_verified)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [invite.email, passwordHash, first_name, last_name, invite.role]
    );
    await pool.query('UPDATE admin_invites SET used_at = NOW() WHERE id = $1', [invite.id]);
    await pool.query('COMMIT');

    res.json({ message: 'Account created successfully. You can now log in.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

module.exports = router;
