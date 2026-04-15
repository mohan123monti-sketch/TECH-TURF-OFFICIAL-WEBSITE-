-- Migration: Create Announcements Table for Admin Panel
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    notifyUsers BOOLEAN DEFAULT 1,
    startDate DATETIME,
    endDate DATETIME,
    pages TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
