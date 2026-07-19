-- 🔒 Fix RLS policies and permissions for user_push_tokens
-- This ensures device tokens can be registered correctly for both Supabase Auth and legacy users.

-- 1. Enable RLS (just to be sure)
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage their own tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Allow public read user_push_tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Allow public insert user_push_tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Allow public update user_push_tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Allow public delete user_push_tokens" ON user_push_tokens;

-- 3. Create open policies consistent with other tables in the codebase
CREATE POLICY "Allow public read user_push_tokens" ON user_push_tokens 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert user_push_tokens" ON user_push_tokens 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update user_push_tokens" ON user_push_tokens 
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete user_push_tokens" ON user_push_tokens 
    FOR DELETE USING (true);

-- 4. Ensure permissions are granted to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO anon, authenticated;

-- 5. Grant sequence usage permission (for primary key auto-increment if used)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

SELECT '✅ user_push_tokens RLS policies and permissions updated successfully!' as status;
