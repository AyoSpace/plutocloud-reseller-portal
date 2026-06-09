const express = require('express');
const { pool } = require('../config/database');
const { authenticate, requireAdmin, requireFinance } = require('../middleware/auth');
const { sendWithdrawalRequestEmail, sendFinanceAlert } = require('../services/email');
const axios = require('axios');

const router = express.Router();

// Get reseller dashboard stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'reseller') {
      return res.status(403).json({ error: 'Resellers only' });
    }

    const [clients, earnings, pendingWithdrawals, recentOrders] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE reseller_id = $1', [req.user.id]),
      pool.query(
        `SELECT COALESCE(SUM(amount_kobo),0) as total,
                COALESCE(SUM(CASE WHEN status = 'available' THEN amount_kobo ELSE 0 END),0) as available,
                COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount_kobo ELSE 0 END),0) as withdrawn
         FROM reseller_earnings WHERE reseller_id = $1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount_kobo),0) as total FROM withdrawals
         WHERE reseller_id = $1 AND status IN ('pending','processing')`,
        [req.user.id]
      ),
      pool.query(
        `SELECT o.order_ref, o.status, o.total_kobo, o.created_at, u.email as client_email
         FROM vm_orders o JOIN users u ON u.id = o.user_id
         WHERE u.reseller_id = $1 ORDER BY o.created_at DESC LIMIT 10`,
        [req.user.id]
      ),
    ]);

    res.json({
      totalClients: parseInt(clients.rows[0].count),
      totalEarningsKobo: parseInt(earnings.rows[0].total),
      availableEarningsKobo: parseInt(earnings.rows[0].available),
      withdrawnEarningsKobo: parseInt(earnings.rows[0].withdrawn),
      pendingWithdrawalsKobo: parseInt(pendingWithdrawals.rows[0].total),
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get reseller clients
router.get('/clients', authenticate, async (req, res) => {
  if (req.user.role !== 'reseller') return res.status(403).json({ error: 'Resellers only' });
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
            COUNT(o.id) as vm_count
     FROM users u LEFT JOIN vm_orders o ON o.user_id = u.id
     WHERE u.reseller_id = $1 GROUP BY u.id ORDER BY u.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Get earnings history
router.get('/earnings', authenticate, async (req, res) => {
  if (req.user.role !== 'reseller') return res.status(403).json({ error: 'Resellers only' });
  const { rows } = await pool.query(
    `SELECT re.*, u.email as client_email, o.order_ref
     FROM reseller_earnings re
     JOIN users u ON u.id = re.client_id
     JOIN vm_orders o ON o.id = re.order_id
     WHERE re.reseller_id = $1 ORDER BY re.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Request withdrawal
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'reseller') return res.status(403).json({ error: 'Resellers only' });

    const { amount_kobo, bank_name, account_number, account_name } = req.body;
    const minWithdrawal = parseInt(process.env.MIN_WITHDRAWAL) || 1000000;

    if (amount_kobo < minWithdrawal) {
      return res.status(400).json({ error: `Minimum withdrawal is ₦${minWithdrawal / 100}` });
    }

    // Check available balance
    const { rows: balRows } = await pool.query(
      `SELECT COALESCE(SUM(amount_kobo),0) as available FROM reseller_earnings
       WHERE reseller_id = $1 AND status = 'available'`,
      [req.user.id]
    );
    if (parseInt(balRows[0].available) < amount_kobo) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const { rows } = await pool.query(
      `INSERT INTO withdrawals (reseller_id, amount_kobo, bank_name, account_number, account_name)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, amount_kobo, bank_name, account_number, account_name]
    );

    // Reserve the earnings
    let remaining = amount_kobo;
    const earnings = await pool.query(
      `SELECT id, amount_kobo FROM reseller_earnings WHERE reseller_id = $1 AND status = 'available' ORDER BY created_at ASC`,
      [req.user.id]
    );
    for (const earning of earnings.rows) {
      if (remaining <= 0) break;
      await pool.query(
        `UPDATE reseller_earnings SET status = 'withdrawn' WHERE id = $1`,
        [earning.id]
      );
      remaining -= earning.amount_kobo;
    }

    const { rows: resellerRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    await sendWithdrawalRequestEmail(resellerRows[0], rows[0]);
    await sendFinanceAlert('New Withdrawal Request', {
      'Reseller': resellerRows[0].email,
      'Amount': `₦${(amount_kobo / 100).toLocaleString()}`,
      'Bank': bank_name,
      'Account': account_number,
      'Account Name': account_name,
    });

    res.json({ message: 'Withdrawal request submitted', withdrawal: rows[0] });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Withdrawal request failed' });
  }
});

// Get withdrawal history
router.get('/withdrawals', authenticate, async (req, res) => {
  if (req.user.role !== 'reseller') return res.status(403).json({ error: 'Resellers only' });
  const { rows } = await pool.query(
    'SELECT * FROM withdrawals WHERE reseller_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

// Admin: Get all resellers
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.created_at,
            COUNT(DISTINCT c.id) as client_count,
            COALESCE(SUM(re.amount_kobo),0) as total_earnings_kobo
     FROM users u
     LEFT JOIN users c ON c.reseller_id = u.id
     LEFT JOIN reseller_earnings re ON re.reseller_id = u.id
     WHERE u.role = 'reseller' GROUP BY u.id ORDER BY u.created_at DESC`,
    []
  );
  res.json(rows);
});

// Admin: Process withdrawal
router.patch('/admin/withdrawals/:id', authenticate, requireFinance, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE withdrawals SET status = $1, notes = $2, processed_by = $3, processed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, notes, req.user.id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update withdrawal' });
  }
});

// Admin: Get all withdrawals
router.get('/admin/withdrawals', authenticate, requireFinance, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT w.*, u.email as reseller_email, u.first_name, u.last_name
     FROM withdrawals w JOIN users u ON u.id = w.reseller_id
     ORDER BY w.created_at DESC`
  );
  res.json(rows);
});

module.exports = router;
