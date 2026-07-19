import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (import.meta.env.DEV) {
    console.error(
      '[Supabase] VITE_SUPABASE_URL hoặc ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY chưa được cấu hình!'
    );
  }
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      // Persist session trong localStorage để tránh re-authenticate liên tục (giảm Auth egress)
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        // Gợi ý CDN cache responses (giảm egress từ Supabase Storage/API)
        'x-client-info': 'studyconnect-web',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 50, // Tăng băng thông xử lý sự kiện realtime lên 50 events/s
      },
      timeout: 15000, // Phát hiện kết nối chết và tự động kết nối lại nhanh hơn (15s thay vì mặc định 40s)
    },
  }
);
