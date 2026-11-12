-- Manage users: deactivated accounts cannot log in. Safe to run more than once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
