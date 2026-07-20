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

    // 1. Create app_settings table
    console.log('Creating app_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Create trigger function trigger_worker_poll
    console.log('Creating trigger function trigger_worker_poll...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.trigger_worker_poll()
      RETURNS trigger AS $$
      DECLARE
        api_url text;
        webhook_sec text;
      BEGIN
        SELECT value INTO api_url FROM public.app_settings WHERE key = 'api_url';
        SELECT value INTO webhook_sec FROM public.app_settings WHERE key = 'webhook_secret';
        
        IF api_url IS NOT NULL AND api_url <> '' THEN
          PERFORM net.http_post(
            url := api_url || '/api/notifications/poll',
            body := '{}'::jsonb,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-webhook-signature', COALESCE(webhook_sec, '')
            ),
            timeout_milliseconds := 10000
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 3. Bind trigger
    console.log('Binding Trigger Worker Poll on notification_queue...');
    await client.query(`
      DROP TRIGGER IF EXISTS "Trigger Worker Poll" ON public.notification_queue;
      CREATE TRIGGER "Trigger Worker Poll"
      AFTER INSERT ON public.notification_queue
      FOR EACH ROW EXECUTE FUNCTION public.trigger_worker_poll();
    `);

    await client.query('COMMIT');
    console.log('✅ Poll trigger successfully set up!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Set up failed:', err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
