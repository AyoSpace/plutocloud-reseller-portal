const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { calculateVMPrice } = require('../utils/pricing');
const { sendPaymentConfirmationEmail, sendVMProvisionedEmail, sendFinanceAlert, sendNOCProvisioningAlert, sendResellerEarningNotification } = require('../services/email');
const axios = require('axios');

const router = express.Router();

function generateOrderRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PLT-${ts}-${rand}`;
}

function generateInvoiceNumber() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${rand}`;
}

// Get VM plans
router.get('/plans', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM vm_plans WHERE is_active = true ORDER BY min_vcpu');
  res.json(rows);
});

// Calculate price
router.post('/calculate-price', authenticate, async (req, res) => {
  try {
    const { vcpu, ram_gb, storage_gb, os } = req.body;
    const isReseller = req.user.role === 'reseller';
    const pricing = calculateVMPrice(vcpu, ram_gb, storage_gb, os, isReseller);
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: 'Price calculation failed' });
  }
});

// Create order + initiate payment
router.post('/', authenticate, async (req, res) => {
  try {
    const { vcpu, ram_gb, storage_gb, os, plan_id, hostname } = req.body;

    if (!vcpu || !ram_gb || !storage_gb || !os || !plan_id) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const isReseller = req.user.role === 'reseller';
    const pricing = calculateVMPrice(vcpu, ram_gb, storage_gb, os, isReseller);
    const orderRef = generateOrderRef();
    const invoiceNumber = generateInvoiceNumber();
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: orderRows } = await client.query(
        `INSERT INTO vm_orders (user_id, plan_id, order_ref, vcpu, ram_gb, storage_gb, os, hostname,
          base_price_kobo, vat_kobo, paystack_fee_kobo, total_kobo, discount_kobo, next_billing_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [req.user.id, plan_id, orderRef, vcpu, ram_gb, storage_gb, os,
          hostname || `pluto-${orderRef.toLowerCase()}`,
          pricing.basePriceKobo, pricing.vatKobo, pricing.paystackFeeKobo,
          pricing.totalKobo, pricing.discountKobo, nextBilling]
      );
      const order = orderRows[0];

      const { rows: invRows } = await client.query(
        `INSERT INTO invoices (user_id, order_id, invoice_number, subtotal_kobo, vat_kobo, paystack_fee_kobo, discount_kobo, total_kobo, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW() + INTERVAL '7 days') RETURNING *`,
        [req.user.id, order.id, invoiceNumber, pricing.basePriceKobo, pricing.vatKobo,
          pricing.paystackFeeKobo, pricing.discountKobo, pricing.totalKobo]
      );

      // Initiate Paystack payment
      const paystackRes = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: req.user.email,
          amount: pricing.totalKobo,
          reference: orderRef,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
          metadata: {
            order_id: order.id,
            invoice_id: invRows[0].id,
            user_id: req.user.id,
          }
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      await client.query(
        `INSERT INTO payments (user_id, order_id, paystack_reference, amount_kobo, payment_type)
         VALUES ($1,$2,$3,$4,'vm_order')`,
        [req.user.id, order.id, orderRef, pricing.totalKobo]
      );

      await client.query('COMMIT');

      res.json({
        order,
        invoice: invRows[0],
        paymentUrl: paystackRes.data.data.authorization_url,
        reference: orderRef,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Paystack webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.body).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body);
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows: payRows } = await client.query(
          `UPDATE payments SET status = 'success', paystack_transaction_id = $1, paid_at = NOW()
           WHERE paystack_reference = $2 AND status = 'pending' RETURNING *`,
          [event.data.id, reference]
        );
        if (!payRows[0]) { await client.query('COMMIT'); return res.sendStatus(200); }

        const payment = payRows[0];
        await client.query(
          `UPDATE vm_orders SET status = 'provisioning' WHERE id = $1`,
          [payment.order_id]
        );
        await client.query(
          `UPDATE invoices SET status = 'paid', payment_id = $1, paid_at = NOW() WHERE order_id = $2`,
          [payment.id, payment.order_id]
        );

        // Handle reseller earnings
        const { rows: orderRows } = await client.query(
          `SELECT o.*, u.reseller_id FROM vm_orders o
           JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
          [payment.order_id]
        );
        const order = orderRows[0];

        if (order.reseller_id) {
          const earning = Math.round(order.base_price_kobo * 0.20);
          await client.query(
            `INSERT INTO reseller_earnings (reseller_id, client_id, order_id, payment_id, amount_kobo, status, available_at)
             VALUES ($1,$2,$3,$4,$5,'available',NOW())`,
            [order.reseller_id, order.user_id, order.id, payment.id, earning]
          );
        }

        await client.query('COMMIT');

        // Send emails
        const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [payment.user_id]);
        const { rows: invRows } = await pool.query('SELECT * FROM invoices WHERE order_id = $1', [payment.order_id]);
        if (userRows[0] && invRows[0]) {
          // 1. Client payment confirmation
          await sendPaymentConfirmationEmail(userRows[0], order, invRows[0]);
          // 2. Finance alert to Tobe + Eniola
          await sendFinanceAlert(`New Payment — ${order.order_ref}`, {
            'Customer': `${userRows[0].first_name} ${userRows[0].last_name}`,
            'Email': userRows[0].email,
            'Amount': `₦${(payment.amount_kobo / 100).toLocaleString()}`,
            'Reference': reference,
            'Order': order.order_ref,
            'VM Specs': `${order.vcpu} vCPU · ${order.ram_gb}GB RAM · ${order.storage_gb}GB`,
            'OS': order.os,
          });
          // 3. NOC provisioning alert to eniola + noc@
          await sendNOCProvisioningAlert(order, userRows[0]);
          // 4. Reseller commission notification
          if (order.reseller_id) {
            const { rows: resellerRows } = await pool.query('SELECT * FROM users WHERE id = $1', [order.reseller_id]);
            const earning = Math.round(order.base_price_kobo * 0.20);
            if (resellerRows[0]) {
              await sendResellerEarningNotification(resellerRows[0], userRows[0], order, earning);
            }
          }
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Webhook error:', err);
      } finally {
        client.release();
      }
    }
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(200);
  }
});

// Get user orders
router.get('/', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.*, p.name as plan_name FROM vm_orders o
     JOIN vm_plans p ON p.id = o.plan_id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.*, p.name as plan_name FROM vm_orders o
     JOIN vm_plans p ON p.id = o.plan_id
     WHERE o.id = $1 AND (o.user_id = $2 OR $3 IN ('super_admin','finance_admin'))`,
    [req.params.id, req.user.id, req.user.role]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0]);
});

// Admin: Provision VM (mark as active + send details)
router.post('/:id/provision', authenticate, requireAdmin, async (req, res) => {
  try {
    const { vm_ip, vm_username, vm_password, vm_notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE vm_orders SET status = 'active', vm_ip = $1, vm_username = $2,
       vm_password_encrypted = $3, vm_notes = $4, provisioned_at = NOW(), provisioned_by = $5
       WHERE id = $6 RETURNING *`,
      [vm_ip, vm_username, vm_password, vm_notes || null, req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });

    // Send access email to customer
    const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [rows[0].user_id]);
    if (userRows[0]) {
      await sendVMProvisionedEmail(userRows[0], rows[0], {
        ip: vm_ip, username: vm_username, password: vm_password
      });
    }
    res.json({ message: 'VM provisioned and customer notified', order: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Provisioning failed' });
  }
});

// Admin: Get all orders
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let query = `SELECT o.*, p.name as plan_name, u.email as user_email, u.first_name, u.last_name
               FROM vm_orders o JOIN vm_plans p ON p.id = o.plan_id JOIN users u ON u.id = o.user_id`;
  const params = [];
  if (status) { query += ` WHERE o.status = $1`; params.push(status); }
  query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

module.exports = router;

// Retry payment for pending order
router.post('/:id/retry-payment', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vm_orders WHERE id = $1 AND user_id = $2 AND status = $3',
      [req.params.id, req.user.id, 'pending_payment']
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found or not pending' });
    const order = rows[0];

    const paystackRes = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: req.user.email,
      amount: order.total_kobo,
      reference: order.paystack_reference,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
    }, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });

    res.json({ authorization_url: paystackRes.data.data.authorization_url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retry payment' });
  }
});

// Cancel pending order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vm_orders WHERE id = $1 AND user_id = $2 AND status = $3',
      [req.params.id, req.user.id, 'pending_payment']
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    // Delete invoice first (foreign key), then order
    await pool.query('DELETE FROM invoices WHERE order_id = $1', [req.params.id]);
    await pool.query('DELETE FROM vm_orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});
