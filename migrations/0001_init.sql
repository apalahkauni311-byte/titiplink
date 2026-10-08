PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),created_at INTEGER NOT NULL,disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS pastes(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,password_hash TEXT,password_salt TEXT,visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','unlisted')),created_at INTEGER NOT NULL,expires_at INTEGER,views INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS pastes_expiry ON pastes(expires_at);
CREATE INDEX IF NOT EXISTS pastes_owner ON pastes(owner_id);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS blocked_domains(domain TEXT PRIMARY KEY,created_at INTEGER NOT NULL DEFAULT 0);
