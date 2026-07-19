const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.izjbwiayemzdnnzxtmty',
  password: 'vanhai005Database2026',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PG.');

  try {
    await client.query('BEGIN');
    console.log('Transaction started.');

    // 1. Create notification_queue table
    console.log('Creating notification_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notification_queue (
        id BIGSERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        op_type VARCHAR(20) NOT NULL,
        record JSONB NOT NULL,
        old_record JSONB,
        status VARCHAR(20) DEFAULT 'pending' NOT NULL,
        error_message TEXT,
        attempts INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create index on status
    console.log('Creating index on status...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_queue_status 
      ON public.notification_queue(status);
    `);

    // 2. Create queue_notification trigger function
    console.log('Creating trigger function queue_notification...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.queue_notification()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.notification_queue (table_name, op_type, record, old_record)
        VALUES (
          TG_TABLE_NAME,
          TG_OP,
          row_to_json(NEW)::jsonb,
          CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 3. Drop old synchronous triggers (including those with tab chars in their names)
    console.log('Dropping old synchronous triggers...');
    const dropQueries = [
      // call_signals
      `DROP TRIGGER IF EXISTS "Push Call Signals" ON public.call_signals;`,
      `DROP TRIGGER IF EXISTS "Push Call Signals\t" ON public.call_signals;`,
      // deadlines
      `DROP TRIGGER IF EXISTS "Push Deadlines" ON public.deadlines;`,
      `DROP TRIGGER IF EXISTS "Push Deadlines\t" ON public.deadlines;`,
      // files
      `DROP TRIGGER IF EXISTS "Push Files" ON public.files;`,
      `DROP TRIGGER IF EXISTS "Push Files\t" ON public.files;`,
      // friendships
      `DROP TRIGGER IF EXISTS "Push Friendships" ON public.friendships;`,
      // group_invites
      `DROP TRIGGER IF EXISTS "Push Group Invites" ON public.group_invites;`,
      // group_join_requests
      `DROP TRIGGER IF EXISTS "Push Group Join Requests" ON public.group_join_requests;`,
      // messages
      `DROP TRIGGER IF EXISTS "Push Messages" ON public.messages;`,
      // schedules
      `DROP TRIGGER IF EXISTS "Push Schedules" ON public.schedules;`,
      `DROP TRIGGER IF EXISTS "Push Schedules\t" ON public.schedules;`
    ];

    for (const q of dropQueries) {
      await client.query(q);
    }

    // 4. Create new asynchronous triggers
    console.log('Creating new triggers calling queue_notification...');
    
    // call_signals (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Call Signals Queue"
      AFTER INSERT ON public.call_signals
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // deadlines (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Deadlines Queue"
      AFTER INSERT ON public.deadlines
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // files (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Files Queue"
      AFTER INSERT ON public.files
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // friendships (AFTER INSERT OR UPDATE)
    await client.query(`
      CREATE TRIGGER "Push Friendships Queue"
      AFTER INSERT OR UPDATE ON public.friendships
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // group_invites (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Group Invites Queue"
      AFTER INSERT ON public.group_invites
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // group_join_requests (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Group Join Requests Queue"
      AFTER INSERT ON public.group_join_requests
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // messages (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Messages Queue"
      AFTER INSERT ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    // schedules (AFTER INSERT)
    await client.query(`
      CREATE TRIGGER "Push Schedules Queue"
      AFTER INSERT ON public.schedules
      FOR EACH ROW EXECUTE FUNCTION public.queue_notification();
    `);

    await client.query('COMMIT');
    console.log('✅ Migration succeeded. All triggers moved to queue.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
