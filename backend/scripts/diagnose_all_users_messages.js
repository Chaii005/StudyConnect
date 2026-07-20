const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://izjbwiayemzdnnzxtmty.supabase.co';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

const supabase = createClient(supabaseUrl, apiKey);

async function run() {
  const { data: users, error: uErr } = await supabase.from('users').select('id, full_name');
  if (uErr) {
    console.error('Error fetching users:', uErr);
    return;
  }
  console.log(`Found ${users.length} users:`, users);

  for (const user of users) {
    const uid = user.id;
    console.log(`\n--- Testing user ID: ${uid} (${user.full_name}) ---`);

    // 1. refreshCache query
    const res1 = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, file_attachment, is_read, created_at')
      .is('group_id', null)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (res1.error) {
      console.error(`[ERROR 500?] User ${uid} refreshCache failed:`, res1.error);
    } else {
      console.log(`User ${uid} refreshCache ok: count ${res1.data.length}`);
    }

    // 2. test conversation with other users
    for (const friend of users) {
      if (friend.id === uid) continue;
      const fid = friend.id;
      const res2 = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, file_attachment, is_read, created_at')
        .is('group_id', null)
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${fid}),and(sender_id.eq.${fid},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (res2.error) {
        console.error(`[ERROR 500?] User ${uid} with Friend ${fid} failed:`, res2.error);
      }
    }
  }
}

run().catch(console.error);
