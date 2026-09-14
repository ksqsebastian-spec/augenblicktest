CREATE TABLE IF NOT EXISTS password_resets (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS email_deliveries (id TEXT PRIMARY KEY, status TEXT NOT NULL, lease_until INTEGER NOT NULL, sent_at TEXT);
