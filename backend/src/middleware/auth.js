const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active, totp_enabled FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

const requireAdmin = requireRole('super_admin');
const requireFinance = requireRole('super_admin', 'finance_admin');
const requireReseller = requireRole('super_admin', 'reseller');

module.exports = { authenticate, requireRole, requireAdmin, requireFinance, requireReseller };
