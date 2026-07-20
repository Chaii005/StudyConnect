const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://izjbwiayemzdnnzxtmty.supabase.co';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

const supabase = createClient(supabaseUrl, apiKey);

async function run() {
  console.log('--- Step 1: Testing getConversation query ---');
  // test query with valid IDs 16 and 38
  const { data: d1, error: e1 } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, file_attachment, is_read, created_at')
    .is('group_id', null)
    .or(`and(sender_id.eq.16,receiver_id.eq.38),and(sender_id.eq.38,receiver_id.eq.16)`)
    .order('created_at', { ascending: false })
    .limit(100);

  console.log('Query 1 error:', e1, 'count:', d1?.length);

  console.log('--- Step 2: Testing notification queries for user 16 ---');
  const { data: d2, error: e2 } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at, users:users!sender_id(full_name)')
    .eq('receiver_id', 16)
    .neq('sender_id', 16)
    .is('group_id', null)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Query 2 (private msgs) error:', e2, 'count:', d2?.length);

  console.log('--- Step 3: Testing outgoing missed calls for user 16 ---');
  const { data: d3, error: e3 } = await supabase
    .from('messages')
    .select('id, receiver_id, content, created_at, users:users!receiver_id(full_name)')
    .eq('sender_id', 16)
    .is('group_id', null)
    .like('content', '📵%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Query 3 (missed calls) error:', e3, 'count:', d3?.length);
}

run().catch(console.error);
