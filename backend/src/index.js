require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const resellerRoutes = require('./routes/reseller');
const { pool } = require('./config/database');

const app = express();
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://portal.plutocloudcomputing.ng',
  credentials: true,
}));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Webhook needs raw body
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reseller', resellerRoutes);

// Admin routes
app.get('/api/admin/stats', require('./middleware/auth').authenticate, require('./middleware/auth').requireAdmin, async (req, res) => {
  try {
    const [users, orders, revenue, pendingOrders] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['client']),
      pool.query('SELECT COUNT(*) FROM vm_orders'),
      pool.query(`SELECT COALESCE(SUM(amount_kobo),0) as total FROM payments WHERE status = 'success'`),
      pool.query(`SELECT COUNT(*) FROM vm_orders WHERE status = 'provisioning'`),
    ]);
    res.json({
      totalClients: parseInt(users.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count),
      totalRevenueKobo: parseInt(revenue.rows[0].total),
      pendingProvisioning: parseInt(pendingOrders.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Users admin
app.get('/api/admin/users', require('./middleware/auth').authenticate, require('./middleware/auth').requireAdmin, async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let query = 'SELECT id, email, first_name, last_name, role, is_active, is_email_verified, created_at FROM users';
  const params = [];
  if (role) { query += ' WHERE role = $1'; params.push(role); }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// Make user a reseller
app.patch('/api/admin/users/:id/make-reseller', require('./middleware/auth').authenticate, require('./middleware/auth').requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE users SET role = 'reseller' WHERE id = $1 AND role = 'client' RETURNING id, email, role`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Pluto Cloud Portal API running on port ${PORT}`);
});

module.exports = app;
