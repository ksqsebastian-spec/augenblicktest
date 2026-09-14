PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS identity_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','lead','inspector')), password TEXT NOT NULL, salt TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS identity_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES identity_users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS identity_invites (token TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS identity_records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, updated TEXT NOT NULL, author TEXT NOT NULL REFERENCES identity_users(id));
CREATE INDEX IF NOT EXISTS identity_records_kind ON identity_records(kind);
CREATE TABLE IF NOT EXISTS identity_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS identity_files (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, author TEXT NOT NULL, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS identity_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS identity_invite_scopes (token TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS identity_external_access (user_id TEXT PRIMARY KEY, data TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS identity_password_resets (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES identity_users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS identity_email_deliveries (id TEXT PRIMARY KEY, status TEXT NOT NULL, lease_until INTEGER NOT NULL, sent_at TEXT);

CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY,name TEXT NOT NULL,created TEXT NOT NULL);
INSERT OR IGNORE INTO workspaces VALUES ('main','Eigener Arbeitsbereich',datetime('now'));
CREATE TABLE IF NOT EXISTS workspace_memberships (workspace_id TEXT NOT NULL REFERENCES workspaces(id),account_id TEXT NOT NULL,PRIMARY KEY(workspace_id,account_id));
CREATE TABLE IF NOT EXISTS workspace_invites (token TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id));
INSERT OR IGNORE INTO identity_users SELECT * FROM users;
INSERT OR IGNORE INTO identity_sessions SELECT * FROM sessions;
INSERT OR IGNORE INTO workspace_memberships SELECT 'main',id FROM users;
INSERT OR IGNORE INTO workspace_invites SELECT token,'main' FROM invites;
