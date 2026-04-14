-- Enhanced Admin Features Database Schema
-- Run this to create all necessary tables for enhanced admin functionality

-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    manager_name TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product Branch Inventory Table
CREATE TABLE IF NOT EXISTS product_branch_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    UNIQUE(product_id, branch_id)
);

-- Order History Table
CREATE TABLE IF NOT EXISTS order_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    user_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Groups Table
CREATE TABLE IF NOT EXISTS user_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Group Memberships Table
CREATE TABLE IF NOT EXISTS user_group_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES user_groups(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE(user_id, group_id)
);

-- Access Logs Table
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    email_config TEXT,
    backup_config TEXT,
    api_config TEXT,
    security_config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    variables TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled Tasks Table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    schedule TEXT NOT NULL,
    parameters TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_run DATETIME,
    next_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    resource_type TEXT,
    resource_id INTEGER,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Promo Codes Table (Enhanced)
CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    min_order_value REAL DEFAULT 0,
    max_discount REAL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    valid_from DATETIME,
    valid_until DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total_amount REAL DEFAULT 0,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_delivery DATETIME,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    category TEXT,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Support Ticket Responses Table
CREATE TABLE IF NOT EXISTS support_ticket_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER,
    response TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Knowledge Base Articles Table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    tags TEXT,
    views INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Media Library Table
CREATE TABLE IF NOT EXISTS media_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    alt_text TEXT,
    caption TEXT,
    tags TEXT,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (id, email_config, backup_config, api_config, security_config) 
VALUES (1, 
    '{"smtpServer": "", "smtpPort": "587", "username": "", "fromEmail": "noreply@techturf.com"}',
    '{"autoBackup": false, "frequency": "daily", "retention": 30, "location": "/backups"}',
    '{"rateLimit": 1000, "jwtSecret": "", "keyAuth": false, "corsOrigins": "http://localhost:3000"}',
    '{"require2FA": false, "passwordPolicy": "basic", "sessionTimeout": 30, "allowedIPs": ""}'
);

-- Insert default user groups
INSERT OR IGNORE INTO user_groups (name, description, permissions) VALUES
('Administrators', 'Full system access', '["users.view", "users.edit", "products.view", "products.edit", "orders.view", "orders.edit", "analytics.view", "settings.edit"]'),
('Managers', 'Limited management access', '["users.view", "products.view", "orders.view", "orders.edit", "analytics.view"]'),
('Staff', 'Basic access', '["products.view", "orders.view"]');

-- Insert default email templates
INSERT OR IGNORE INTO email_templates (name, subject, content, variables) VALUES
('order_confirmation', 'Order Confirmation', 'Thank you for your order! Your order #{{order_id}} has been received.', '["order_id", "customer_name"]'),
('password_reset', 'Password Reset', 'Click here to reset your password: {{reset_link}}', '["reset_link", "user_name"]'),
('welcome_email', 'Welcome to Tech Turf', 'Welcome {{user_name}}! Thank you for joining Tech Turf.', '["user_name", "login_url"]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_branch_inventory_product ON product_branch_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_product_branch_inventory_branch ON product_branch_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_user ON order_history(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_by ON media_library(uploaded_by);
