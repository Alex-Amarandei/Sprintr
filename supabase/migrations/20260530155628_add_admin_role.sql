-- Migration 7: add 'admin' to the app role enum.
-- Reverses the original "admin = dashboard only, not in the enum" decision (CLAUDE.md).
-- Admins are app users with elevated rights (see migration 8 for what that grants).
alter type public.user_role add value if not exists 'admin';
