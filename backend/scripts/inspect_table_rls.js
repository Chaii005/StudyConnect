// backend/scripts/inspect_table_rls.js
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected.');

    // 1. Check if user_push_tokens exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'user_push_tokens'
      );
    `);
    console.log('Table user_push_tokens exists:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      return;
    }

    // 2. Check table details
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_push_tokens';
    `);
    console.log('\nColumns of user_push_tokens:', columns.rows);

    // 3. Check RLS status
    const rls = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname = 'user_push_tokens';
    `);
    console.log('\nRLS status of user_push_tokens:', rls.rows);

    // 4. Check policies
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'user_push_tokens';
    `);
    console.log('\nPolicies on user_push_tokens:', policies.rows);

    // 5. Check permissions/grants
    const grants = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'user_push_tokens';
    `);
    console.log('\nGrants on user_push_tokens:', grants.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
