const { Client } = require('pg');

const client = new Client({
  host: 'db.auiksrjvcxbzemwdgmpb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'vanhai005@@$$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();

    // Create pomodoro_rooms
    await client.query(`
      CREATE TABLE IF NOT EXISTS pomodoro_rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        focus_time INTEGER DEFAULT 25,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create pomodoro_room_members
    await client.query(`
      CREATE TABLE IF NOT EXISTS pomodoro_room_members (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES pomodoro_rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'studying',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, user_id)
      );
    `);

    console.log("Pomodoro tables created successfully!");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
