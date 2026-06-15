const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: #0A1628; padding: 30px; text-align: center; }
  .header img { height: 50px; }
  .header h1 { color: #ffffff; margin: 10px 0 0; font-size: 20px; }
  .body { padding: 30px; color: #333; line-height: 1.6; }
  .btn { display: inline-block; background: #2563EB; color: #ffffff !important; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
  .info-box { background: #f0f4ff; border-left: 4px solid #2563EB; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>☁️ Pluto Cloud Computing</h1>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© 2026 Pluto Cloud Computing. All rights reserved.</p>
    <p>portal.plutocloudcomputing.ng | noc@plutocloudcomputing.ng</p>
  </div>
</div>
</body>
</html>
`;

async function sendEmail(to, subject, html, cc = []) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'Pluto Cloud Computing <eniola@plutocloudcomputing.ng>',
    to,
    subject,
    html,
  };
  if (cc.length > 0) mailOptions.cc = cc.join(',');
  return transporter.sendMail(mailOptions);
}

async function sendVerificationEmail(user, token) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = baseTemplate(`
    <h2>Welcome to Pluto Cloud Computing!</h2>
    <p>Hi ${user.first_name},</p>
    <p>Thank you for registering with Pluto Cloud Computing. A verification email has been sent to your email address. Please check your inbox (and spam folder) and click the verification link to activate your account.</p>
    <a href="${url}" class="btn">Verify Email Address</a>
    <p>This link expires in 24 hours. If you did not create an account, please ignore this email.</p>
  `);
  return sendEmail(user.email, 'Verify Your Email — Pluto Cloud Computing', html);
}

async function sendPasswordResetEmail(user, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h2>Reset Your Password</h2>
    <p>Hi ${user.first_name},</p>
    <p>We received a request to reset your password. Click the button below to set a new password.</p>
    <a href="${url}" class="btn">Reset Password</a>
    <p>This link expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
  `);
  return sendEmail(user.email, 'Password Reset — Pluto Cloud Computing', html);
}

async function sendVMProvisionedEmail(user, order, vmDetails) {
  const isWindows = order.os.startsWith('windows');
  const html = baseTemplate(`
    <h2>Your VM is Ready! 🚀</h2>
    <p>Hi ${user.first_name},</p>
    <p>Your virtual machine has been provisioned and is ready to use.</p>
    <div class="info-box">
      <h3>VM Details</h3>
      <div class="info-row"><span>Hostname</span><strong>${order.hostname}</strong></div>
      <div class="info-row"><span>IP Address</span><strong>${vmDetails.ip}</strong></div>
      <div class="info-row"><span>vCPU</span><strong>${order.vcpu} Core(s)</strong></div>
      <div class="info-row"><span>RAM</span><strong>${order.ram_gb} GB</strong></div>
      <div class="info-row"><span>Storage</span><strong>${order.storage_gb} GB</strong></div>
      <div class="info-row"><span>OS</span><strong>${order.os.replace(/_/g, ' ').toUpperCase()}</strong></div>
      <div class="info-row"><span>Username</span><strong>${vmDetails.username}</strong></div>
      <div class="info-row"><span>Password</span><strong>${vmDetails.password}</strong></div>
      ${isWindows ? '<div class="info-row"><span>RDP Port</span><strong>3389</strong></div>' : '<div class="info-row"><span>SSH Port</span><strong>22</strong></div>'}
    </div>
    <p><strong>⚠️ Important:</strong> Please change your password immediately after first login.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
    <p>Need help? Contact us at <a href="mailto:noc@plutocloudcomputing.ng">noc@plutocloudcomputing.ng</a></p>
  `);
  return sendEmail(user.email, 'Your VM is Ready — Pluto Cloud Computing', html);
}

async function sendPaymentConfirmationEmail(user, order, invoice) {
  const html = baseTemplate(`
    <h2>Payment Confirmed ✅</h2>
    <p>Hi ${user.first_name},</p>
    <p>We have received your payment. Your VM is being provisioned and you will receive access details shortly.</p>
    <div class="info-box">
      <h3>Order Summary</h3>
      <div class="info-row"><span>Order Reference</span><strong>${order.order_ref}</strong></div>
      <div class="info-row"><span>Invoice Number</span><strong>${invoice.invoice_number}</strong></div>
      <div class="info-row"><span>Amount Paid</span><strong>₦${(invoice.total_kobo / 100).toLocaleString()}</strong></div>
      <div class="info-row"><span>Status</span><strong>Provisioning</strong></div>
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard/orders/${order.id}" class="btn">View Order</a>
  `);

  // CC finance admin on all payments
  return sendEmail(
    user.email,
    `Payment Confirmed — Order ${order.order_ref}`,
    html,
    [process.env.FINANCE_EMAIL]
  );
}

async function sendFinanceAlert(subject, details) {
  const rows = Object.entries(details).map(([k, v]) =>
    `<div class="info-row"><span>${k}</span><strong>${v}</strong></div>`
  ).join('');
  const html = baseTemplate(`
    <h2>💰 Finance Alert</h2>
    <div class="info-box">${rows}</div>
  `);
  return sendEmail(
    process.env.FINANCE_EMAIL,
    `[Finance Alert] ${subject}`,
    html,
    [process.env.ADMIN_EMAIL]
  );
}

async function sendWithdrawalRequestEmail(reseller, withdrawal) {
  const html = baseTemplate(`
    <h2>Withdrawal Request Received</h2>
    <p>Hi ${reseller.first_name},</p>
    <p>Your withdrawal request has been received and is being processed.</p>
    <div class="info-box">
      <div class="info-row"><span>Amount</span><strong>₦${(withdrawal.amount_kobo / 100).toLocaleString()}</strong></div>
      <div class="info-row"><span>Bank</span><strong>${withdrawal.bank_name}</strong></div>
      <div class="info-row"><span>Account</span><strong>${withdrawal.account_number}</strong></div>
      <div class="info-row"><span>Status</span><strong>Processing</strong></div>
    </div>
    <p>You will be notified when the transfer is complete (within 1-2 business days).</p>
  `);
  return sendEmail(reseller.email, 'Withdrawal Request — Pluto Cloud Computing', html);
}


async function sendNOCProvisioningAlert(order, user) {
  const html = baseTemplate(`
    <h2>🖥️ New VM Provisioning Request</h2>
    <p>A new VM order has been paid and requires provisioning.</p>
    <div class="info-box">
      <h3>Order Details</h3>
      <div class="info-row"><span>Customer</span><strong>${user.first_name} ${user.last_name}</strong></div>
      <div class="info-row"><span>Email</span><strong>${user.email}</strong></div>
      <div class="info-row"><span>Order Ref</span><strong>${order.order_ref}</strong></div>
      <div class="info-row"><span>Hostname</span><strong>${order.hostname}</strong></div>
      <div class="info-row"><span>vCPU</span><strong>${order.vcpu} Core(s)</strong></div>
      <div class="info-row"><span>RAM</span><strong>${order.ram_gb} GB</strong></div>
      <div class="info-row"><span>Storage</span><strong>${order.storage_gb} GB</strong></div>
      <div class="info-row"><span>OS</span><strong>${order.os.replace(/_/g, ' ').toUpperCase()}</strong></div>
      <div class="info-row"><span>Plan</span><strong>${order.plan_name || 'N/A'}</strong></div>
      <div class="info-row"><span>Amount</span><strong>₦${(order.total_kobo / 100).toLocaleString()}</strong></div>
    </div>
    <a href="${process.env.FRONTEND_URL}/admin/orders" class="btn">Go to Admin Panel → Provision VM</a>
    <p>Please provision this VM as soon as possible.</p>
  `);
  return sendEmail(
    process.env.ADMIN_EMAIL,
    `[ACTION REQUIRED] New VM Order — ${order.order_ref}`,
    html,
    ['noc@plutocloudcomputing.ng']
  );
}

async function sendResellerEarningNotification(reseller, client, order, earningKobo) {
  const html = baseTemplate(`
    <h2>💰 New Earning from Client Order</h2>
    <p>Hi ${reseller.first_name},</p>
    <p>One of your clients has just placed and paid for a VM order. Your commission has been credited.</p>
    <div class="info-box">
      <div class="info-row"><span>Client</span><strong>${client.first_name} ${client.last_name} (${client.email})</strong></div>
      <div class="info-row"><span>Order Reference</span><strong>${order.order_ref}</strong></div>
      <div class="info-row"><span>VM Specs</span><strong>${order.vcpu} vCPU · ${order.ram_gb}GB RAM · ${order.storage_gb}GB Storage</strong></div>
      <div class="info-row"><span>Order Value</span><strong>₦${(order.total_kobo / 100).toLocaleString()}</strong></div>
      <div class="info-row"><span>Your Commission (20%)</span><strong style="color:#22c55e">₦${(earningKobo / 100).toLocaleString()}</strong></div>
    </div>
    <a href="${process.env.FRONTEND_URL}/reseller/earnings" class="btn">View Earnings</a>
    <p>Keep sharing your referral link to earn more!</p>
  `);
  return sendEmail(reseller.email, `New Commission Earned — ₦${(earningKobo / 100).toLocaleString()}`, html);
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVMProvisionedEmail,
  sendPaymentConfirmationEmail,
  sendFinanceAlert,
  sendWithdrawalRequestEmail,
  sendNOCProvisioningAlert,
  sendResellerEarningNotification,
};
