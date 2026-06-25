-- 🔧 ADD DELETE POLICY FOR USERS TABLE (ADMIN DELETION)
-- Run this in your Supabase SQL Editor if setting up a new project database.

DROP POLICY IF EXISTS "Allow delete users" ON users;
CREATE POLICY "Allow delete users" ON users 
  FOR DELETE USING (true);
