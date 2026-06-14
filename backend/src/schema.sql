-- Pluto Cloud Computing Portal Database Schema
-- Run this file to initialize the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (clients + resellers + admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'reseller', 'finance_admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  totp_secret VARCHAR(255),
  totp_enabled BOOLEAN DEFAULT false,
  reseller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VM Plans
CREATE TABLE vm_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  min_vcpu INT DEFAULT 1,
  max_vcpu INT DEFAULT 4,
  min_ram_gb INT DEFAULT 1,
  max_ram_gb INT DEFAULT 16,
  min_storage_gb INT DEFAULT 20,
  max_storage_gb INT DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO vm_plans (name, description, min_vcpu, max_vcpu, min_ram_gb, max_ram_gb, min_storage_gb, max_storage_gb) VALUES
('Standard', 'Cloud VM for growing businesses - 500GB to 3TB storage', 2, 32, 4, 128, 500, 3000),
('Business', 'High-capacity VM for demanding workloads - 1TB to 10TB storage', 8, 64, 16, 256, 1000, 10000),
('Enterprise', 'Ultra-scale VM for enterprise workloads - 5TB to 100TB storage', 32, 256, 64, 1024, 5000, 100000);

-- VM Orders
CREATE TABLE vm_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES vm_plans(id),
  order_ref VARCHAR(50) UNIQUE NOT NULL,
  vcpu INT NOT NULL,
  ram_gb INT NOT NULL,
  storage_gb INT NOT NULL,
  os VARCHAR(50) NOT NULL CHECK (os IN ('ubuntu_22', 'ubuntu_20', 'centos_8', 'windows_server_2022', 'windows_server_2019')),
  hostname VARCHAR(255),
  status VARCHAR(30) DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'provisioning', 'active', 'suspended', 'terminated')),
  base_price_kobo BIGINT NOT NULL,
  vat_kobo BIGINT NOT NULL,
  paystack_fee_kobo BIGINT NOT NULL,
  total_kobo BIGINT NOT NULL,
  discount_kobo BIGINT DEFAULT 0,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  next_billing_date TIMESTAMPTZ,
  vm_ip VARCHAR(50),
  vm_username VARCHAR(100),
  vm_password_encrypted TEXT,
  vm_notes TEXT,
  provisioned_at TIMESTAMPTZ,
  provisioned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES vm_orders(id),
  paystack_reference VARCHAR(255) UNIQUE,
  paystack_transaction_id VARCHAR(255),
  amount_kobo BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_type VARCHAR(30) DEFAULT 'vm_order' CHECK (payment_type IN ('vm_order', 'renewal', 'topup')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reseller earnings
CREATE TABLE reseller_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES users(id),
  client_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES vm_orders(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount_kobo BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn')),
  available_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES users(id),
  amount_kobo BIGINT NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  paystack_transfer_code VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES vm_orders(id),
  payment_id UUID REFERENCES payments(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  subtotal_kobo BIGINT NOT NULL,
  vat_kobo BIGINT NOT NULL,
  paystack_fee_kobo BIGINT NOT NULL,
  discount_kobo BIGINT DEFAULT 0,
  total_kobo BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES vm_orders(id),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE email_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('verify_email', 'reset_password', 'vm_access')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_reseller_id ON users(reseller_id);
CREATE INDEX idx_vm_orders_user_id ON vm_orders(user_id);
CREATE INDEX idx_vm_orders_status ON vm_orders(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_reseller_earnings_reseller_id ON reseller_earnings(reseller_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert super admin (password: Admin@Pluto2026! - change immediately)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_email_verified)
VALUES (
  'eniola@plutocloudcomputing.ng',
  '$2b$12$LQv3c1yqBwEHXWRJLPn.0.4X4G9D8X8X8X8X8X8X8X8X8X8X8X8X',
  'Emmanuel',
  'Eniola',
  'super_admin',
  true,
  true
);

-- Insert finance admin
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_email_verified)
VALUES (
  'tobe@plutocloudcomputing.ng',
  '$2b$12$LQv3c1yqBwEHXWRJLPn.0.4X4G9D8X8X8X8X8X8X8X8X8X8X8X8X',
  'Tobechukwu',
  'Finance',
  'finance_admin',
  true,
  true
);
