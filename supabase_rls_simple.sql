-- SIMPLE RLS POLICIES FOR PG MANAGEMENT SYSTEM
-- This version works with localStorage-based user authentication
-- Run these in Supabase SQL Editor

-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: USERS TABLE POLICIES
-- ============================================

-- Owner (authenticated via Supabase Auth) can do everything
CREATE POLICY "owner_full_access_users"
ON users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public to read users (needed for user login check)
-- In production, you might want to restrict this further
CREATE POLICY "public_read_users"
ON users
FOR SELECT
TO anon
USING (true);

-- Allow public to insert users (only owner should do this, but RLS allows it)
-- Consider restricting this in production
CREATE POLICY "public_insert_users"
ON users
FOR INSERT
TO anon
WITH CHECK (true);

-- ============================================
-- STEP 3: RENTS TABLE POLICIES
-- ============================================

-- Owner can do everything
CREATE POLICY "owner_full_access_rents"
ON rents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public to read rents (users need to see their rents)
CREATE POLICY "public_read_rents"
ON rents
FOR SELECT
TO anon
USING (true);

-- Allow public to insert rents (owner generates rents)
CREATE POLICY "public_insert_rents"
ON rents
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public to update rents (owner marks as paid)
CREATE POLICY "public_update_rents"
ON rents
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 4: MAINTENANCE TABLE POLICIES
-- ============================================

-- Owner can do everything
CREATE POLICY "owner_full_access_maintenance"
ON maintenance
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public to read maintenance requests
CREATE POLICY "public_read_maintenance"
ON maintenance
FOR SELECT
TO anon
USING (true);

-- Allow public to insert maintenance requests (users submit requests)
CREATE POLICY "public_insert_maintenance"
ON maintenance
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public to update maintenance (owner updates status)
CREATE POLICY "public_update_maintenance"
ON maintenance
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- ============================================
-- NOTES:
-- ============================================
-- 1. These policies allow public (anon) access because users authenticate
--    via localStorage, not Supabase Auth
-- 2. For better security in production:
--    - Use Supabase Auth for all users
--    - Or create a backend API with service role key
--    - Or use database functions with SECURITY DEFINER
-- 3. The owner policies (authenticated) will only work if the owner
--    is logged in via Supabase Auth

