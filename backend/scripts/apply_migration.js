// backend/scripts/apply_migration.js
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, '../../supabase/migrations/16_add_deadline_submissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying migration 16_add_deadline_submissions.sql...');
    const res = await client.query(sql);
    
    // Find status row if printed
    if (Array.isArray(res)) {
      const statusRow = res.find(r => r.command === 'SELECT');
      if (statusRow && statusRow.rows.length > 0) {
        console.log(statusRow.rows[0].status);
      }
    } else if (res.command === 'SELECT' && res.rows.length > 0) {
      console.log(res.rows[0].status);
    } else {
      console.log('Migration applied successfully.');
    }

  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

main();
