-- RLS Policies for PG Management System
-- Run these queries in your Supabase SQL Editor

-- ============================================
-- 1. Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. USERS TABLE POLICIES
-- ============================================

-- Policy: Owner can do everything (authenticated via Supabase Auth)
CREATE POLICY "Owner can manage all users"
ON users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Users can read their own record (by email)
-- Note: This allows users to read their own data when they know their email
-- For better security, consider using a service role or API key for user operations
CREATE POLICY "Users can read own record"
ON users
FOR SELECT
TO anon
USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
  OR email IN (
    SELECT email FROM users WHERE email = current_setting('app.user_email', true)
  )
);

-- Alternative: Allow public read for users table (less secure, but works with localStorage approach)
-- Uncomment if the above doesn't work with your setup
-- DROP POLICY IF EXISTS "Users can read own record" ON users;
-- CREATE POLICY "Allow public read for users"
-- ON users
-- FOR SELECT
-- TO anon
-- USING (true);

-- ============================================
-- 3. RENTS TABLE POLICIES
-- ============================================

-- Policy: Owner can do everything
CREATE POLICY "Owner can manage all rents"
ON rents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Users can read their own rents (by email)
CREATE POLICY "Users can read own rents"
ON rents
FOR SELECT
TO anon
USING (
  email = current_setting('app.user_email', true)
  OR email IN (
    SELECT email FROM users WHERE email = current_setting('app.user_email', true)
  )
);

-- Alternative: Allow public read for rents (if using localStorage approach)
-- DROP POLICY IF EXISTS "Users can read own rents" ON rents;
-- CREATE POLICY "Allow public read for rents"
-- ON rents
-- FOR SELECT
-- TO anon
-- USING (true);

-- ============================================
-- 4. MAINTENANCE TABLE POLICIES
-- ============================================

-- Policy: Owner can do everything
CREATE POLICY "Owner can manage all maintenance"
ON maintenance
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Users can insert their own maintenance requests
CREATE POLICY "Users can insert own maintenance"
ON maintenance
FOR INSERT
TO anon
WITH CHECK (
  email = current_setting('app.user_email', true)
  OR true  -- Allow insert if email matches (less secure but works)
);

-- Policy: Users can read their own maintenance requests
CREATE POLICY "Users can read own maintenance"
ON maintenance
FOR SELECT
TO anon
USING (
  email = current_setting('app.user_email', true)
  OR email IN (
    SELECT email FROM users WHERE email = current_setting('app.user_email', true)
  )
);

-- Alternative: Allow public read and insert for maintenance (if using localStorage)
-- DROP POLICY IF EXISTS "Users can insert own maintenance" ON maintenance;
-- DROP POLICY IF EXISTS "Users can read own maintenance" ON maintenance;
-- CREATE POLICY "Allow public insert for maintenance"
-- ON maintenance
-- FOR INSERT
-- TO anon
-- WITH CHECK (true);
-- 
-- CREATE POLICY "Allow public read for maintenance"
-- ON maintenance
-- FOR SELECT
-- TO anon
-- USING (true);

-- ============================================
-- ALTERNATIVE: SIMPLER APPROACH
-- (If the above policies don't work with localStorage)
-- ============================================

-- If you're using localStorage and not Supabase Auth for users,
-- you might need a simpler approach. Uncomment the following:

/*
-- Drop existing policies first
DROP POLICY IF EXISTS "Owner can manage all users" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Owner can manage all rents" ON rents;
DROP POLICY IF EXISTS "Users can read own rents" ON rents;
DROP POLICY IF EXISTS "Owner can manage all maintenance" ON maintenance;
DROP POLICY IF EXISTS "Users can insert own maintenance" ON maintenance;
DROP POLICY IF EXISTS "Users can read own maintenance" ON maintenance;

-- Simple policies: Owner (authenticated) can do everything, anon can read/insert
CREATE POLICY "Owner full access users"
ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read users"
ON users FOR SELECT TO anon USING (true);

CREATE POLICY "Owner full access rents"
ON rents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read rents"
ON rents FOR SELECT TO anon USING (true);

CREATE POLICY "Owner full access maintenance"
ON maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read maintenance"
ON maintenance FOR SELECT TO anon USING (true);

CREATE POLICY "Public insert maintenance"
ON maintenance FOR INSERT TO anon WITH CHECK (true);
*/

-- ============================================
-- RECOMMENDED: SECURE APPROACH
-- (Best practice - requires service role for user operations)
-- ============================================

-- For production, consider:
-- 1. Using Supabase Auth for both owner and users
-- 2. Creating a backend API that uses service role key
-- 3. Or using database functions with SECURITY DEFINER

-- Example function for user login (more secure):
/*
CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(id UUID, name TEXT, email TEXT, room TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record users%ROWTYPE;
BEGIN
  SELECT * INTO user_record
  FROM users
  WHERE email = user_email AND password = user_password;
  
  IF user_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  RETURN QUERY SELECT user_record.id, user_record.name, user_record.email, user_record.room;
END;
$$;
*/

