import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../config/supabaseClient';
import { sendMessage } from '../services/chatServiceTEMP';
import AppLayout from '../layouts/AppLayout';

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#845EC2', '#FF9671', '#00C9A7'];
const getAvatarColor = (id) => COLORS[id % COLORS.length];

export default function Match() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' | 'right'
  const [matchData, setMatchData] = useState(null); // The user we just matched with
  const [loading, setLoading] = useState(true);
  const [myMajor, setMyMajor] = useState(user?.major || '');

  // Fetch real users from Supabase matching the user's major
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const uid = parseInt(user?.id, 10);
        
        const { data: latestCurrentUser } = await supabase
          .from('users')
          .select('major')
          .eq('id', uid)
          .single();

        const currentMajor = latestCurrentUser?.major || user?.major || '';
        setMyMajor(currentMajor);

        // Get existing friendship IDs to filter them out
        const { data: friendships } = await supabase
          .from('friendships')
          .select('from_user_id, to_user_id')
          .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
        
        const excludedIds = new Set([uid]);
        if (friendships) {
          friendships.forEach(f => {
            excludedIds.add(f.from_user_id);
            excludedIds.add(f.to_user_id);
          });
        }

        // Build Supabase query with database-side filtering
        let query = supabase.from('users').select('*');

        // Filter by major case-insensitively on database side if user has a major
        if (currentMajor.trim()) {
          query = query.ilike('major', `%${currentMajor.trim()}%`);
        }

        // Exclude current user and friends directly on database query
        const excludedList = Array.from(excludedIds);
        if (excludedList.length > 0) {
          query = query.not('id', 'in', `(${excludedList.join(',')})`);
        }

        const { data: dbUsers, error } = await query.limit(100);

        if (error) throw error;

        const mappedCandidates = (dbUsers || []).map(u => ({
          id: u.id,
          full_name: u.full_name,
          university: u.university || 'Chưa cập nhật',
          major: u.major || 'Chưa cập nhật',
          bio: u.bio || 'Tìm kiếm bạn học tập tại StudyConnect!',
          avatar: u.avatar,
          avatar_color: getAvatarColor(u.id)
        }));

        setCandidates(mappedCandidates);
      } catch (err) {
        console.error('Error fetching match candidates:', err);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchCandidates();
    }
  }, [user]);

  const currentCandidate = candidates[currentIndex];

  const handleSwipe = async (direction) => {
    if (swipeDirection || !currentCandidate) return;

    setSwipeDirection(direction);

    // After animation finishes (300ms)
    setTimeout(async () => {
      if (direction === 'right') {
        const isMatch = Math.random() < 0.85;

        if (isMatch) {
          try {
            const fid = parseInt(user.id, 10);
            const tid = parseInt(currentCandidate.id, 10);

            await supabase.from('friendships').insert([
              {
                from_user_id: fid,
                to_user_id: tid,
                status: 'accepted',
                accepted_at: new Date().toISOString()
              }
            ]);
            
            await sendMessage(fid, tid, 'Chào bạn! Chúng ta đã ghép đôi học tập thành công trên StudyConnect. Hãy cùng học nhé! 🤝');
            setMatchData(currentCandidate);
          } catch (err) {
            console.error('Failed saving match:', err);
            addToast('Lỗi ghép đôi học tập, vui lòng thử lại.', 'error');
          }
        } else {
          addToast(`Đã gửi lời mời học cùng đến ${currentCandidate.full_name}!`, 'info');
        }
      }

      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 400);
  };

  return (
    <AppLayout>
      <div className="match-page-container">
        <style>{`
          .match-page-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 20px 12px;
            width: 100%;
            min-height: calc(100vh - 80px);
            position: relative;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
          }
          /* Subtle ambient background glow */
          .match-page-container::before {
            content: '';
            position: absolute;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(108,99,255,0.15) 0%, rgba(0,0,0,0) 70%);
            z-index: 0;
            pointer-events: none;
          }

          .header-section {
            text-align: center;
            margin-bottom: 24px;
            z-index: 10;
            position: relative;
          }

          .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(90deg, rgba(108,99,255,0.1), rgba(62,207,207,0.1));
            border: 1px solid rgba(108,99,255,0.2);
            padding: 6px 14px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            backdrop-filter: blur(8px);
          }
          
          .header-title {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(to right, #ffffff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }

          .header-subtitle {
            color: #94a3b8;
            font-size: 14px;
            max-width: 320px;
            margin: 0 auto;
            line-height: 1.5;
          }

          .major-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: #fbbf24;
            margin-top: 12px;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.05);
          }

          .card-container {
            position: relative;
            width: 100%;
            max-width: 360px;
            height: 500px;
            z-index: 10;
            perspective: 1000px;
          }

          .match-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 0;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.4s ease;
            transform-origin: 50% 100%;
          }

          .swipe-left-anim {
            transform: translate3d(-120%, 50px, 0) rotate(-15deg);
            opacity: 0;
          }
          .swipe-right-anim {
            transform: translate3d(120%, 50px, 0) rotate(15deg);
            opacity: 0;
          }

          .card-image-wrapper {
            position: relative;
            width: 100%;
            height: 55%;
            background: #1a1d29;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .card-image-bg-blur {
            position: absolute;
            top: -20%; left: -20%; width: 140%; height: 140%;
            filter: blur(40px);
            opacity: 0.6;
            z-index: 1;
          }

          .card-avatar-main {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            border: 4px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 2;
            object-fit: cover;
            background: #2d3748;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: 800;
            color: #fff;
          }

          .card-content {
            padding: 24px 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            background: linear-gradient(to bottom, rgba(15,23,42,0.8), rgba(15,23,42,0.95));
          }

          .candidate-name {
            font-size: 24px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .candidate-bio {
            font-size: 14px;
            color: #cbd5e1;
            line-height: 1.5;
            margin-bottom: 16px;
            font-style: italic;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .tags-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: auto;
          }

          .info-tag {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            color: #e2e8f0;
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .action-buttons-container {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 16px;
            padding-bottom: 8px;
          }

          .action-btn {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
          }

          .action-btn::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 50%;
            opacity: 0;
            transition: opacity 0.2s;
          }

          .btn-nope {
            background: rgba(244, 63, 94, 0.1);
            color: #f43f5e;
            border: 2px solid rgba(244, 63, 94, 0.3);
            box-shadow: 0 8px 24px rgba(244, 63, 94, 0.15);
          }
          .btn-nope:hover {
            transform: scale(1.1);
            background: rgba(244, 63, 94, 0.2);
            border-color: rgba(244, 63, 94, 0.5);
            box-shadow: 0 12px 32px rgba(244, 63, 94, 0.3);
          }

          .btn-like {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
            border: 2px solid rgba(16, 185, 129, 0.5);
          }
          .btn-like:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
            border-color: rgba(16, 185, 129, 0.8);
          }
          
          .action-btn:active {
            transform: scale(0.95);
          }

          /* Empty State */
          .empty-state-card {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(12px);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            border-radius: 24px;
            padding: 40px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            height: 100%;
            box-shadow: inset 0 0 40px rgba(0,0,0,0.2);
          }

          .empty-icon {
            font-size: 64px;
            margin-bottom: 16px;
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }

          .empty-title {
            color: #fff;
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 12px;
          }

          .empty-desc {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 24px;
          }

          .btn-restart {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 14px;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
            transition: all 0.2s;
          }
          .btn-restart:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(99, 102, 241, 0.4);
          }

          /* Match Modal Overlay */
          @keyframes modalPop {
            0% { transform: scale(0.8) translateY(20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 30px rgba(255, 107, 107, 0.3); }
            50% { box-shadow: 0 0 60px rgba(255, 107, 107, 0.6); }
            100% { box-shadow: 0 0 30px rgba(255, 107, 107, 0.3); }
          }

          .match-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .match-modal-content {
            background: linear-gradient(145deg, #1e293b, #0f172a);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 28px;
            padding: 40px 32px;
            text-align: center;
            width: 100%;
            max-width: 380px;
            animation: modalPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            position: relative;
            overflow: hidden;
          }
          
          .match-modal-content::before {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle, rgba(255,107,107,0.1) 0%, rgba(0,0,0,0) 60%);
            z-index: 0;
            pointer-events: none;
            animation: spin 20s linear infinite;
          }

          @keyframes spin { 100% { transform: rotate(360deg); } }

          .match-title-effect {
            font-size: 32px;
            font-weight: 900;
            background: linear-gradient(to right, #FF6B6B, #FF8E53);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          .avatars-match-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 32px 0;
            position: relative;
            z-index: 1;
          }

          .avatar-ring {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            padding: 4px;
            background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
            animation: glowPulse 2s infinite;
          }

          .avatar-inner {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: #1e293b;
            border: 3px solid #0f172a;
            object-fit: cover;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
            color: #fff;
          }

          .heart-icon {
            font-size: 32px;
            margin: 0 -16px;
            z-index: 10;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            animation: float 2s infinite;
          }
          
          .modal-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
            position: relative;
            z-index: 1;
          }
          
          .btn-modal-primary {
            background: linear-gradient(135deg, #FF6B6B, #FF8E53);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 16px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
            transition: transform 0.2s;
          }
          .btn-modal-primary:hover { transform: translateY(-2px); }
          
          .btn-modal-secondary {
            background: rgba(255,255,255,0.05);
            color: #cbd5e1;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 14px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }
          .btn-modal-secondary:hover { background: rgba(255,255,255,0.1); }
        `}</style>

        {/* Header Area */}
        <div className="header-section">
          <div className="header-badge">
            <span style={{fontSize: '16px'}}>🔥</span> Ghép Đôi Học Tập
          </div>
          <h1 className="header-title">Tìm Bạn Đồng Hành</h1>
          <p className="header-subtitle">
            Khám phá và kết nối với những người bạn cùng chung mục tiêu và đam mê học tập.
          </p>
          {myMajor ? (
            <div className="major-badge">
              <span>🎯</span> Ngành: {myMajor}
            </div>
          ) : (
            <div className="major-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>
              <span>⚠️</span> Cập nhật hồ sơ để ghép đôi tốt hơn
            </div>
          )}
        </div>

        {/* Card Area */}
        <div className="card-container">
          {loading ? (
            <div className="empty-state-card">
              <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
              <h3 className="empty-title">Đang tìm kiếm...</h3>
              <p className="empty-desc">Đang quét radar để tìm kiếm những người bạn phù hợp nhất với bạn.</p>
            </div>
          ) : currentCandidate ? (
            <div className={`match-card ${swipeDirection === 'left' ? 'swipe-left-anim' : swipeDirection === 'right' ? 'swipe-right-anim' : ''}`}>
              
              <div className="card-image-wrapper">
                {currentCandidate.avatar && (
                  <img src={currentCandidate.avatar} className="card-image-bg-blur" alt="blur-bg" />
                )}
                {currentCandidate.avatar ? (
                  <img src={currentCandidate.avatar} className="card-avatar-main" alt="avatar" />
                ) : (
                  <div className="card-avatar-main" style={{ background: `linear-gradient(135deg, ${currentCandidate.avatar_color}, #2563eb)` }}>
                    {currentCandidate.full_name.split(' ').slice(-1)[0][0]}
                  </div>
                )}
              </div>

              <div className="card-content">
                <h2 className="candidate-name">
                  {currentCandidate.full_name}
                  <span style={{ fontSize: '18px', color: '#10b981' }}>●</span>
                </h2>
                
                <p className="candidate-bio">"{currentCandidate.bio}"</p>
                
                <div className="tags-row">
                  <div className="info-tag">
                    <span>🏫</span> {currentCandidate.university}
                  </div>
                  <div className="info-tag">
                    <span>📚</span> {currentCandidate.major}
                  </div>
                </div>

                <div className="action-buttons-container">
                  <button 
                    className="action-btn btn-nope" 
                    onClick={() => handleSwipe('left')}
                    title="Bỏ qua"
                  >
                    ✕
                  </button>
                  <button 
                    className="action-btn btn-like" 
                    onClick={() => handleSwipe('right')}
                    title="Kết bạn học!"
                  >
                    🤝
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="empty-state-card">
              <div className="empty-icon">🌟</div>
              <h3 className="empty-title">Đã hết danh sách!</h3>
              <p className="empty-desc">
                Bạn đã duyệt qua toàn bộ danh sách bạn bè tiềm năng cùng chuyên ngành hiện có trên hệ thống. Hãy quay lại sau nhé!
              </p>
              <button className="btn-restart" onClick={() => setCurrentIndex(0)}>
                ↻ Xem lại từ đầu
              </button>
            </div>
          )}
        </div>

        {/* Matched Modal */}
        {matchData && (
          <div className="match-modal-overlay">
            <div className="match-modal-content">
              <div className="match-title-effect">MATCHED!</div>
              <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '10px' }}>
                Bạn và <strong style={{ color: '#fff' }}>{matchData.full_name}</strong> đã trở thành bạn học!
              </p>

              <div className="avatars-match-wrapper">
                <div className="avatar-ring" style={{ transform: 'translateX(10px)' }}>
                  {user?.avatar ? (
                    <img src={user.avatar} className="avatar-inner" alt="You" />
                  ) : (
                    <div className="avatar-inner">{user?.full_name?.[0] || 'U'}</div>
                  )}
                </div>
                
                <div className="heart-icon">💖</div>
                
                <div className="avatar-ring" style={{ transform: 'translateX(-10px)' }}>
                  {matchData.avatar ? (
                    <img src={matchData.avatar} className="avatar-inner" alt="Match" />
                  ) : (
                    <div className="avatar-inner" style={{ background: `linear-gradient(135deg, ${matchData.avatar_color}, #2563eb)` }}>
                      {matchData.full_name.split(' ').slice(-1)[0][0]}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-buttons">
                <button 
                  className="btn-modal-primary"
                  onClick={() => {
                    setMatchData(null);
                    navigate('/chat');
                  }}
                >
                  💬 Gửi lời chào ngay
                </button>
                <button 
                  className="btn-modal-secondary"
                  onClick={() => setMatchData(null)}
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
