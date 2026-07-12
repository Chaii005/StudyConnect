import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCall } from '../../context/CallContext';
import { supabase } from '../../config/supabaseClient';
import { compressImage as compressImageFile } from '../../utils/imageCompress';
import {
  sendMessage,
  getConversation,
  getConversationFromCache,
  markAsRead,
  deleteMessage,
} from '../../services/chatServiceTEMP';
import { acceptFriendRequest, removeFriend } from '../../services/friendService';

import Avatar from '../common/Avatar';
import EmojiPicker from './EmojiPicker';
import CameraModal from './CameraModal';
import ShareModal from './ShareModal';
import MessageMenu from './MessageMenu';
import { SafeInput, SafeTextarea } from '../common/SafeInput';

// ── Time & File Format Utilities ───────────────────────────────────
function fmtFull(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    day: '2-digit', 
    month: '2-digit' 
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const downloadBaseFile = (base64Data, filename) => {
  fetch(base64Data)
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      if (import.meta.env.DEV) console.error('File download failed:', err);
    });
};

export default function ConversationView({
  user,
  friend,
  friends,
  onBack,
  onlineUserIds,
  onNicknameChange,
  onRelationChange,
  chatBg,
  setChatBg,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);

  // Setup presence for typing indicator
  useEffect(() => {
    if (!friend || !friend.userId) return;

    const channelName = `typing_${Math.min(user.id, friend.userId)}_${Math.max(user.id, friend.userId)}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId === friend.userId) {
          setIsTyping(payload.payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, friend]);

  const sendTypingStatus = (isTyping) => {
    const channelName = `typing_${Math.min(user.id, friend.userId)}_${Math.max(user.id, friend.userId)}`;
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping }
    });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    // Typing indicator logic
    sendTypingStatus(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTypingStatus(false), 2000);
  };
  const [showCamera, setShowCamera] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, msg }
  const [shareMsg, setShareMsg] = useState(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef(null);
  const msgsContainerRef = useRef(null);
  const chatOuterRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMsgCount = useRef(0);

  const navigate = useNavigate();
  const { initiateCall, callStatus } = useCall();

  const [nickname, setNickname] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [bgInfo, setBgInfo] = useState({
    isAnalyzed: false,
    r: 0,
    g: 0,
    b: 0,
    luminance: 128
  });
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgFilePreview, setBgFilePreview] = useState('');
  const [bgPos, setBgPos] = useState('center');
  const [viewingImage, setViewingImage] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [bgToast, setBgToast] = useState(null); // { name }
  const prevBgRef = useRef(null);

  useEffect(() => {
    if (!chatBg) {
      setBgInfo({ isAnalyzed: false, r: 0, g: 0, b: 0, luminance: 128 });
      return;
    }
    const imgUrl = chatBg.split('|')[0];
    if (!imgUrl) {
      setBgInfo({ isAnalyzed: false, r: 0, g: 0, b: 0, luminance: 128 });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setBgInfo({ isAnalyzed: true, r: 20, g: 20, b: 20, luminance: 20 });
          return;
        }
        ctx.drawImage(img, 0, 0, 10, 10);
        const imgData = ctx.getImageData(0, 0, 10, 10).data;
        
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          if (imgData[i + 3] > 0) {
            rSum += imgData[i];
            gSum += imgData[i + 1];
            bSum += imgData[i + 2];
            count++;
          }
        }
        
        if (count === 0) {
          setBgInfo({ isAnalyzed: true, r: 20, g: 20, b: 20, luminance: 20 });
          return;
        }
        
        const rAvg = Math.round(rSum / count);
        const gAvg = Math.round(gSum / count);
        const bAvg = Math.round(bSum / count);
        const luminance = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;
        
        setBgInfo({
          isAnalyzed: true,
          r: rAvg,
          g: gAvg,
          b: bAvg,
          luminance
        });
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Chat] Failed to analyze bg color:', err);
        setBgInfo({ isAnalyzed: true, r: 20, g: 20, b: 20, luminance: 20 });
      }
    };
    img.onerror = () => {
      setBgInfo({ isAnalyzed: true, r: 20, g: 20, b: 20, luminance: 20 });
    };
    img.src = imgUrl;
  }, [chatBg]);

  const getChatStyleVariables = () => {
    if (!chatBg || !bgInfo.isAnalyzed) {
      return {
        '--text-primary-chat': 'var(--text-primary)',
        '--text-secondary-chat': 'var(--text-secondary)',
        '--text-muted-chat': 'var(--text-muted)',
        '--bg-input-chat': 'var(--bg-input)',
        '--border-chat': 'var(--border)',
        '--bg-overlay-chat': 'none',
      };
    }

    const { r, g, b, luminance } = bgInfo;
    const isLight = luminance > 135;

    if (isLight) {
      const textR = Math.round(r * 0.12 + 10 * 0.88);
      const textG = Math.round(g * 0.12 + 10 * 0.88);
      const textB = Math.round(b * 0.12 + 10 * 0.88);

      const secR = Math.round(r * 0.18 + 50 * 0.82);
      const secG = Math.round(g * 0.18 + 50 * 0.82);
      const secB = Math.round(b * 0.18 + 50 * 0.82);

      const mutR = Math.round(r * 0.22 + 90 * 0.78);
      const mutG = Math.round(g * 0.22 + 90 * 0.78);
      const mutB = Math.round(b * 0.22 + 90 * 0.78);

      const bgR = Math.round(r * 0.35 + 245 * 0.65);
      const bgG = Math.round(g * 0.35 + 245 * 0.65);
      const bgB = Math.round(b * 0.35 + 245 * 0.65);

      const borderR = Math.round(r * 0.35 + 210 * 0.65);
      const borderG = Math.round(g * 0.35 + 210 * 0.65);
      const borderB = Math.round(b * 0.35 + 210 * 0.65);

      return {
        '--text-primary-chat': `rgb(${textR}, ${textG}, ${textB})`,
        '--text-secondary-chat': `rgb(${secR}, ${secG}, ${secB})`,
        '--text-muted-chat': `rgb(${mutR}, ${mutG}, ${mutB})`,
        '--bg-input-chat': `rgba(${bgR}, ${bgG}, ${bgB}, 0.75)`,
        '--border-chat': `rgba(${borderR}, ${borderG}, ${borderB}, 0.85)`,
        '--bg-overlay-chat': 'linear-gradient(rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.18))',
      };
    } else {
      const textR = Math.round(r * 0.12 + 250 * 0.88);
      const textG = Math.round(g * 0.12 + 250 * 0.88);
      const textB = Math.round(b * 0.12 + 250 * 0.88);

      const secR = Math.round(r * 0.18 + 210 * 0.82);
      const secG = Math.round(g * 0.18 + 210 * 0.82);
      const secB = Math.round(b * 0.18 + 210 * 0.82);

      const mutR = Math.round(r * 0.22 + 160 * 0.78);
      const mutG = Math.round(g * 0.22 + 160 * 0.78);
      const mutB = Math.round(b * 0.22 + 160 * 0.78);

      const bgR = Math.round(r * 0.35 + 15 * 0.65);
      const bgG = Math.round(g * 0.35 + 23 * 0.65);
      const bgB = Math.round(b * 0.35 + 42 * 0.65);

      const borderR = Math.round(r * 0.35 + 30 * 0.65);
      const borderG = Math.round(g * 0.35 + 38 * 0.65);
      const borderB = Math.round(b * 0.35 + 57 * 0.65);

      return {
        '--text-primary-chat': `rgb(${textR}, ${textG}, ${textB})`,
        '--text-secondary-chat': `rgb(${secR}, ${secG}, ${secB})`,
        '--text-muted-chat': `rgb(${mutR}, ${mutG}, ${mutB})`,
        '--bg-input-chat': `rgba(${bgR}, ${bgG}, ${bgB}, 0.55)`,
        '--border-chat': `rgba(${borderR}, ${borderG}, ${borderB}, 0.65)`,
        '--bg-overlay-chat': 'linear-gradient(rgba(10, 15, 30, 0.22), rgba(10, 15, 30, 0.22))',
      };
    }
  };

  const chatStyles = getChatStyleVariables();

  useEffect(() => {
    const n = localStorage.getItem(`sc_nickname_${user.id}_${friend.userId}`) || '';
    setNickname(n);
  }, [user.id, friend.userId]);

  useEffect(() => {
    setChatBg('');
    setBgFilePreview('');
    setBgPos('center');
  }, [friend.userId, setChatBg]);

  const handleRenameClick = () => {
    setRenameVal(nickname);
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    const cleanName = renameVal.trim();
    try {
      await sendMessage(user.id, friend.userId, `[chat_nickname]:${cleanName}`, 'text');
      if (cleanName === '') {
        localStorage.removeItem(`sc_nickname_${user.id}_${friend.userId}`);
        setNickname('');
      } else {
        localStorage.setItem(`sc_nickname_${user.id}_${friend.userId}`, cleanName);
        setNickname(cleanName);
      }
      setShowRenameModal(false);
      if (onNicknameChange) onNicknameChange();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error saving nickname:', err);
    }
  };

  const handleClearChat = async () => {
    try {
      const uid = parseInt(user.id, 10);
      const fid = parseInt(friend.userId, 10);
      
      const { error: err1 } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', uid)
        .eq('receiver_id', fid)
        .is('group_id', null);

      const { error: err2 } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', fid)
        .eq('receiver_id', uid)
        .is('group_id', null);

      if (err1 || err2) {
        if (import.meta.env.DEV) console.error('Error clearing chat:', err1 || err2);
        return;
      }

      setMessages([]);
      setShowClearConfirm(false);
      if (onNicknameChange) onNicknameChange();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Exception clearing chat:', err);
    }
  };

  const compressBgImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleBgFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressBgImage(ev.target.result);
      setBgFilePreview(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveBg = async (bgValue) => {
    try {
      await sendMessage(user.id, friend.userId, `[chat_background]:${bgValue}`, 'text');
      setChatBg(bgValue);
      setShowBgModal(false);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error saving background:', err);
    }
  };

  const load = useCallback(async () => {
    // Stage 1: Render cached data immediately
    const cached = getConversationFromCache(user.id, friend.userId);
    if (cached.messages.length > 0) {
      setMessages(cached.messages);
      const newBg = cached.background || '';
      if (prevBgRef.current !== null && newBg !== prevBgRef.current) {
        const lastBgMsg = cached.messages.filter(m => m.content?.startsWith('[chat_background]')).slice(-1)[0];
        if (lastBgMsg && String(lastBgMsg.fromUserId) !== String(user.id)) {
          setBgToast({ name: nickname || friend.fullName });
          setTimeout(() => setBgToast(null), 4000);
        }
      }
      prevBgRef.current = newBg;
      setChatBg(newBg);

      // Nickname sync from cache
      const lastNickMsg = cached.messages
        .filter(m => m.content?.startsWith('[chat_nickname]:') && String(m.fromUserId) === String(user.id))
        .slice(-1)[0];
      if (lastNickMsg) {
        const val = lastNickMsg.content.replace('[chat_nickname]:', '');
        if (val) {
          try {
            localStorage.setItem(`sc_nickname_${user.id}_${friend.userId}`, val);
          } catch (err) {
            if (import.meta.env.DEV) console.warn('Error saving nickname:', err);
          }
          setNickname(val);
        } else {
          localStorage.removeItem(`sc_nickname_${user.id}_${friend.userId}`);
          setNickname('');
        }
      }
    }

    // Stage 2: Sync from database asynchronously
    const res = await getConversation(user.id, friend.userId);
    const msgs = res.messages || [];
    setMessages(msgs);
    const newBg = res.background || '';
    if (prevBgRef.current !== null && newBg !== prevBgRef.current) {
      const lastBgMsg = msgs.filter(m => m.content?.startsWith('[chat_background]')).slice(-1)[0];
      if (lastBgMsg && String(lastBgMsg.fromUserId) !== String(user.id)) {
        setBgToast({ name: nickname || friend.fullName });
        setTimeout(() => setBgToast(null), 4000);
      }
    }
    prevBgRef.current = newBg;
    setChatBg(newBg);

    // Sync nickname from db
    const lastNickMsg = msgs
      .filter(m => m.content?.startsWith('[chat_nickname]:') && String(m.fromUserId) === String(user.id))
      .slice(-1)[0];
    if (lastNickMsg) {
      const val = lastNickMsg.content.replace('[chat_nickname]:', '');
      if (val) {
        try {
          localStorage.setItem(`sc_nickname_${user.id}_${friend.userId}`, val);
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Error saving nickname:', err);
        }
        setNickname(val);
      } else {
        localStorage.removeItem(`sc_nickname_${user.id}_${friend.userId}`);
        setNickname('');
      }
      if (onNicknameChange) onNicknameChange();
    }

    await markAsRead(user.id, friend.userId);
  }, [user.id, friend.userId, nickname, friend.fullName, onNicknameChange, setChatBg]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id || !friend?.userId) return;

    const channelName = `chat-msg-${user.id}-${friend.userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const msg = payload.new;
          if (String(msg.sender_id) === String(friend.userId)) {
            await load();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, friend?.userId, load]);

  // Handle auto scroll on new messages
  useEffect(() => {
    const container = msgsContainerRef.current;
    if (!container) return;
    const newCount = messages.length;
    
    // In column-reverse, container starts scrolled to bottom (scrollTop = 0)
    // New messages appear at the bottom.
    // If user is at bottom (scrollTop === 0), it will auto-scroll naturally if we append.
    // If user is scrolled up, they stay scrolled up.
    
    prevMsgCount.current = newCount;
  }, [messages]);

  const handleScroll = () => {
    const container = msgsContainerRef.current;
    if (!container) return;
    // In column-reverse, container starts scrolled to bottom (scrollTop = 0)
    // Positive scrollTop means we are scrolled UP (towards older messages)
    const { scrollTop } = container;
    const isNearBottom = scrollTop < 100; // Near "bottom" (newest)
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    const container = msgsContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setShowScrollBtn(false);
  };

  const handleSendText = async (text) => {
    if (!text?.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(user.id, friend.userId, text.trim());
      setInput('');
      await load();
      msgsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleSendAttachment = async (dataUrl, caption) => {
    if (!dataUrl || sending) return;
    setSending(true);
    setImgPreview(null);
    try {
      const isImage = attachedFile?.type?.startsWith('image/') || dataUrl.startsWith('data:image');
      let fileUrlValue = '';
      
      if (attachedFile) {
        let fileToUpload = attachedFile;
        if (attachedFile.type?.startsWith('image/')) {
          try {
            fileToUpload = await compressImageFile(attachedFile, { maxWidth: 1280, maxHeight: 1280, quality: 0.78 });
          } catch {
            fileToUpload = attachedFile; // fallback
          }
        }
        
        const fileName = `private/${user.id}/${Date.now()}_${fileToUpload.name || attachedFile.name || 'clipboard.png'}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, fileToUpload, { cacheControl: '2592000', upsert: true });

        if (uploadError) {
          if (import.meta.env.DEV) {
            console.error('[Chat] Private file Storage error:', uploadError.message);
          }
          throw new Error('Không thể tải file đính kèm lên máy chủ.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);
        fileUrlValue = publicUrl;
      } else {
        fileUrlValue = dataUrl;
      }

      if (isImage) {
        await sendMessage(user.id, friend.userId, fileUrlValue, 'image');
      } else {
        const fileData = {
          fileName: attachedFile?.name || 'document.file',
          fileType: attachedFile?.type || 'application/octet-stream',
          fileData: fileUrlValue,
          fileSize: formatBytes(attachedFile?.size || 0)
        };
        await sendMessage(user.id, friend.userId, '', 'text', fileData);
      }
      
      if (caption?.trim()) {
        await sendMessage(user.id, friend.userId, caption.trim());
      }
      
      setInput('');
      setAttachedFile(null);
      await load();
      msgsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSendText(input); 
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const MAX_FILE_SIZE = 25 * 1024 * 1024;
          if (file.size > MAX_FILE_SIZE) {
            alert('File đính kèm quá lớn! Vui lòng chọn file nhỏ hơn hoặc bằng 25MB.');
            return;
          }
          setAttachedFile(file);
          const reader = new FileReader();
          reader.onload = (ev) => {
            setImgPreview(ev.target.result);
            setTimeout(() => msgsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('File đính kèm quá lớn! Vui lòng chọn file nhỏ hơn hoặc bằng 25MB.');
      return;
    }
    setAttachedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgPreview(ev.target.result);
      setTimeout(() => msgsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addEmoji = (em) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = input.substring(0, start) + em + input.substring(end);
      setInput(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + em.length, start + em.length);
      }, 0);
    } else {
      setInput(prev => prev + em);
    }
    setShowEmoji(false);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (msgId) => {
    setDeleteConfirmId(msgId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await deleteMessage(id);
      await load();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error deleting message:', err);
    }
  };

  const handleShare = async (toUserId, msg) => {
    const content = msg.type === 'image' || msg.content?.startsWith('data:image')
      ? msg.content : `↗️ "${msg.content}"`;
    const type = msg.type === 'image' || msg.content?.startsWith('data:image') ? 'image' : 'text';
    await sendMessage(user.id, toUserId, content, type);
  };

  const handleSaveImage = (msg) => {
    const url = msg.content;
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyconect_img_${msg.id || Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Group messages by date (newest first)
  const groupedMsgs = [];
  let lastDate = null;
  const reversedMessages = [...messages].reverse();
  reversedMessages.forEach(m => {
    const d = new Date(m.createdAt).toLocaleDateString('vi-VN');
    if (d !== lastDate) { 
      groupedMsgs.push({ type: 'date', label: d }); 
      lastDate = d; 
    }
    groupedMsgs.push({ type: 'msg', data: m });
  });

  return (
    <div 
      ref={chatOuterRef} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        position: 'relative', 
        overflowX: 'hidden' 
      }}
    >
      {/* Dynamic Background Sync Indicator */}
      {bgToast && (
        <div 
          style={{
            position: 'absolute', 
            top: '16px', 
            right: '16px', 
            zIndex: 9999,
            background: 'var(--bg-card)', 
            border: '1.5px solid var(--border)',
            borderRadius: '14px', 
            padding: '12px 18px',
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.3s ease',
            backdropFilter: 'blur(12px)',
            maxWidth: '280px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🖼️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>{bgToast.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>đã thay đổi hình nền trò chuyện</div>
          </div>
        </div>
      )}

      <div 
        style={{
          display: 'flex', 
          gap: '14px',
          padding: '5px 20px', 
          borderBottom: '1.5px solid var(--border)',
          background: 'var(--bg-card)', 
          flexShrink: 0,
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={onBack} 
            style={{
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--text-secondary)', 
              fontSize: '20px', 
              padding: '6px 10px',
              borderRadius: '10px', 
              transition: 'all 0.2s', 
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="20" y1="12" x2="4" y2="12"/>
              <polyline points="10 18 4 12 10 6"/>
            </svg>
          </button>

          <Avatar src={friend.avatar} initial={friend.initial} size={42} />
          
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--text-primary)' }}>
              {nickname || friend.fullName}
            </div>
            {(() => {
              const isOnline = onlineUserIds.includes(String(friend.userId));
              return (
                <div 
                  style={{ 
                    fontSize: '12px', 
                    color: isOnline ? '#0D9488' : '#ef4444', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px',
                    marginTop: '2px',
                  }}
                >
                  <span 
                    style={{ 
                      display: 'inline-block', 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: isOnline ? '#0D9488' : '#ef4444' 
                    }} 
                  />
                  {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </div>
              );
            })()}
          </div>

          {/* Action Controls Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            {(!friend.status || friend.status === 'accepted') && (
              <button
                onClick={() => initiateCall(friend)}
                title="Gọi video"
                style={{
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  border: 'none', 
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)', 
                  transition: 'all 0.2s', 
                  flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21 8-4 3.5V9a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5l4 3.5V8Z" />
                </svg>
              </button>
            )}

            {(!friend.status || friend.status === 'accepted') && (
              <button
                onClick={() => setShowMenuDropdown(prev => !prev)}
                title="Tùy chọn"
                style={{
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  border: '1.5px solid var(--border)', 
                  cursor: 'pointer',
                  background: 'var(--bg-card)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.2s', 
                  flexShrink: 0,
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            )}

            {/* Option Settings Dropdown Menu */}
            {showMenuDropdown && (
              <>
                <div 
                  onClick={() => setShowMenuDropdown(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: '0',
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '16px',
                    width: '180px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      navigate(`/friends/${friend.userId}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Trang cá nhân
                  </button>
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      handleRenameClick();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      fontFamily: 'inherit',
                      borderTop: '1px solid var(--border)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Đổi biệt danh
                  </button>
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      const savedUrl = chatBg ? chatBg.split('|')[0] : '';
                      const savedPos = chatBg && chatBg.includes('|') ? chatBg.split('|')[1] : 'center';
                      setBgFilePreview(savedUrl.startsWith('data:') ? savedUrl : '');
                      setBgPos(savedPos);
                      setShowBgModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      fontFamily: 'inherit',
                      borderTop: '1px solid var(--border)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Đổi hình nền
                  </button>
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      setShowClearConfirm(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      color: '#ff4d4d',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      fontFamily: 'inherit',
                      borderTop: '1px solid var(--border)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,77,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Xóa lịch sử trò chuyện
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            padding: '4px 20px 4px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fadeIn 0.2s ease',
          }}>
            <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block',
                animation: 'typingBounce 1.2s ease-in-out infinite',
                animationDelay: '0ms',
              }} />
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block',
                animation: 'typingBounce 1.2s ease-in-out infinite',
                animationDelay: '200ms',
              }} />
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block',
                animation: 'typingBounce 1.2s ease-in-out infinite',
                animationDelay: '400ms',
              }} />
            </span>
            {nickname || friend.fullName} đang nhập...
          </div>
        )}
      </div>

      {/* Call notification overlay */}
      {(callStatus === 'rejected' || callStatus === 'missed' || callStatus === 'no_answer') && (
        <div 
          style={{
            position: 'fixed', 
            top: '24px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border)',
            borderRadius: '16px', 
            padding: '14px 24px',
            fontSize: '13.5px', 
            fontWeight: 800, 
            color: 'var(--text-primary)',
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
          {callStatus === 'rejected'
            ? 'Người nhận đang bận'
            : callStatus === 'no_answer'
            ? 'Người nhận không bắt máy'
            : 'Bạn bỏ lỡ cuộc gọi'}
        </div>
      )}

      {/* Message Stream */}
      <div
        ref={msgsContainerRef}
        onScroll={handleScroll}
        className="msgs-no-scrollbar"
        style={{
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          padding: '24px 20px',
          display: 'flex', 
          flexDirection: 'column-reverse', // Reversed direction
          gap: '6px',
          position: 'relative',
          overscrollBehavior: 'contain',
          background: chatBg 
            ? `${chatStyles['--bg-overlay-chat']}, url(${chatBg.split('|')[0]}) ${chatBg.split('|')[1] || 'center'}/cover no-repeat`
            : undefined,
          transition: 'background 0.3s ease',
          ...chatStyles,
        }}
      >
        {/* Note: groupedMsgs needs to be reversed because of column-reverse */}
        {groupedMsgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted-chat)', fontSize: '14px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid var(--border-chat)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-chat)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            {friend.status === 'pending' ? (
              friend.fromUserId === String(user.id) ? (
                <>Đang chờ lời mời kết bạn từ bạn được chấp nhận...</>
              ) : (
                <>Nhận được một lời mời kết bạn từ đối phương.</>
              )
            ) : (
              <>
                Bắt đầu thảo luận học tập với <strong>{nickname || friend.fullName}</strong>!
              </>
            )}
          </div>
        )}

        {groupedMsgs.map((item, idx) => {
          // Since column-reverse reverses the display, no extra logic needed here for mapping order
          if (item.type === 'date') {
            return (
              <div key={`date-${idx}`} style={{ textAlign: 'center', margin: '18px 0 10px' }}>
                <span 
                  style={{
                    background: 'var(--bg-input-chat)',
                    padding: '4px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-chat)',
                    color: 'var(--text-primary-chat)',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          }

          const m = item.data;
          const isMine = String(m.fromUserId) === String(user.id);

          if (m.content?.startsWith('[chat_background]')) {
            return (
              <div key={m.id} style={{ textAlign: 'center', margin: '14px 0', fontSize: '12px' }}>
                <span style={{ padding: '6px 16px', borderRadius: '16px', background: 'var(--bg-input-chat)', border: '1px solid var(--border-chat)', color: 'var(--text-secondary-chat)' }}>
                  {isMine ? 'Bạn đã thay đổi hình nền' : `${nickname || friend.fullName} đã thay đổi hình nền`}
                </span>
              </div>
            );
          }

          if (m.content?.startsWith('[chat_nickname]:')) {
            const cleanNick = m.content.replace('[chat_nickname]:', '');
            const msgText = isMine 
              ? (cleanNick ? `Bạn đã đặt biệt danh thành "${cleanNick}"` : 'Bạn đã xóa biệt danh')
              : (cleanNick ? `${friend.fullName} đã thay đổi biệt danh của bạn thành "${cleanNick}"` : `${friend.fullName} đã xóa biệt danh`);

            return (
              <div key={m.id} style={{ textAlign: 'center', margin: '14px 0', fontSize: '12px' }}>
                <span style={{ padding: '6px 16px', borderRadius: '16px', background: 'var(--bg-input-chat)', border: '1px solid var(--border-chat)', color: 'var(--text-secondary-chat)' }}>
                  {msgText}
                </span>
              </div>
            );
          }

          if (m.content?.startsWith('📵') || m.content?.startsWith('📹')) {
            const isMissed = m.content.startsWith('📵');
            const labelText = m.content.replace(/^\S+\s*/, '');
            return (
              <div key={m.id} style={{ textAlign: 'center', margin: '20px 0' }}>
                <span 
                  style={{
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '8px 18px', 
                    borderRadius: '20px',
                    background: 'var(--bg-input-chat)',
                    border: '1.5px solid var(--border-chat)',
                    fontSize: '12.5px', 
                    fontWeight: 700,
                    color: 'var(--text-primary-chat)',
                  }}
                >
                  <span 
                    style={{
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      background: isMissed ? '#ef4444' : 'var(--primary)',
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: 'none',
                      border: '1.5px solid var(--border)',
                      flexShrink: 0,
                    }}
                  >
                    {isMissed ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                        <line x1="23" y1="1" x2="1" y2="23" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m22 8-6 4 6 4V8Z" />
                        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                      </svg>
                    )}
                  </span>
                  {labelText}
                </span>
                <div style={{ fontSize: '10px', color: 'var(--text-muted-chat)', marginTop: '6px', fontFamily: 'var(--font-mono, monospace)' }}>
                  {fmtFull(m.createdAt)}
                </div>
              </div>
            );
          }

          const isImage = m.type === 'image' || m.content?.startsWith('data:image');

          return (
            <div 
              key={m.id} 
              style={{ 
                display: 'flex', 
                justifyContent: isMine ? 'flex-end' : 'flex-start', 
                marginBottom: '4px',
                animation: 'msgFadeIn 0.25s ease-out forwards',
              }}
            >
              {!isMine && (
                <div style={{ marginRight: '8px', alignSelf: 'flex-end', marginBottom: '14px' }}>
                  <Avatar src={friend.avatar} initial={friend.initial} size={28} />
                </div>
              )}

              <div 
                className="msg-container" 
                style={{
                  flexDirection: isMine ? 'row' : 'row-reverse',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  maxWidth: '75%',
                }}
              >
                {/* Options Menu Icon Trigger on Hover */}
                <div className="msg-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    className="msg-action-btn" 
                    title="Chia sẻ" 
                    onClick={() => setShareMsg(m)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  </button>
                  <button 
                    className="msg-action-btn danger" 
                    title="Xóa" 
                    onClick={() => handleDelete(m.id)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '4px' }}>
                  <div
                    style={{
                      background: isMine 
                        ? 'var(--primary)' 
                        : 'var(--bg-card)',
                      color: isMine ? 'white' : 'var(--text-primary-chat)',
                      padding: isImage ? '4px' : '10px 16px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      fontSize: '14px', 
                      lineHeight: 1.5, 
                      wordBreak: 'break-word',
                      border: isMine ? 'none' : '1.5px solid var(--border-chat)',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    {isImage ? (
                      <img 
                        src={m.content} 
                        alt="Ảnh" 
                        draggable="false"
                        onClick={() => setViewingImage(m.content)}
                        style={{ 
                          maxWidth: '280px', 
                          maxHeight: '320px', 
                          borderRadius: '12px', 
                          display: 'block', 
                          objectFit: 'cover', 
                          cursor: 'zoom-in' 
                        }} 
                      />
                    ) : m.fileAttachment ? (
                      <div>
                        {m.content && <div style={{ marginBottom: '8px' }}>{m.content}</div>}
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            background: isMine ? 'rgba(0,0,0,0.2)' : 'var(--bg-input-chat)', 
                            border: '1.5px solid var(--border-chat)', 
                            padding: '10px 12px', 
                            borderRadius: '10px', 
                            minWidth: '220px' 
                          }}
                        >
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                fontSize: '13px', 
                                fontWeight: 700, 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                color: isMine ? 'white' : 'var(--text-primary-chat)' 
                              }}
                            >
                              {m.fileAttachment.fileName}
                            </div>
                            <div 
                              style={{ 
                                fontSize: '11px', 
                                color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary-chat)',
                                fontFamily: 'var(--font-mono, monospace)',
                                marginTop: '2px',
                              }}
                            >
                              {m.fileAttachment.fileSize}
                            </div>
                          </div>
                          <button 
                            onClick={() => downloadBaseFile(m.fileAttachment.fileData, m.fileAttachment.fileName)} 
                            style={{ 
                              background: isMine ? 'white' : 'var(--primary)', 
                              color: isMine ? '#0D9488' : 'white', 
                              padding: '6px 12px', 
                              borderRadius: '8px', 
                              border: 'none', 
                              cursor: 'pointer', 
                              fontWeight: 800, 
                              fontSize: '11px',
                              transition: 'all 0.15s',
                            }}
                          >
                            Tải về
                          </button>
                        </div>
                      </div>
                    ) : m.content}
                  </div>

                  <span 
                    style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-muted-chat)', 
                      padding: '0 4px',
                      fontFamily: 'var(--font-mono, monospace)' 
                    }}
                  >
                    {fmtFull(m.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBtn && (
        <button 
          onClick={scrollToBottom} 
          style={{
            position: 'absolute',
            bottom: imgPreview ? '170px' : '84px',
            right: '24px',
            width: '40px', 
            height: '40px',
            borderRadius: '50%',
            background: 'var(--primary)',
            border: 'none', 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            color: 'white', 
            zIndex: 90, 
            transition: 'all 0.2s',
            animation: 'fadeIn 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Cuộn xuống tin nhắn mới nhất"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Upload/Attachment Preview Drawer */}
      {imgPreview && (
        <div 
          style={{ 
            padding: '12px 20px', 
            borderTop: '1.5px solid var(--border)', 
            background: 'var(--bg-card)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {attachedFile?.type?.startsWith('image/') || imgPreview.startsWith('data:image') ? (
                <img 
                  src={imgPreview} 
                  alt="Preview" 
                  draggable="false" 
                  style={{ height: '56px', width: '56px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} 
                />
              ) : (
                <div style={{ height: '56px', width: '56px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </div>
              )}
              <button 
                onClick={() => { setImgPreview(null); setAttachedFile(null); }} 
                style={{
                  position: 'absolute', 
                  top: '-6px', 
                  right: '-6px',
                  background: '#ef4444', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer', 
                  color: 'white',
                  fontSize: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  lineHeight: 1,
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {attachedFile?.name || 'Tệp đính kèm chuẩn bị gửi'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: '4px' }}>
            <SafeInput
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendAttachment(imgPreview, input); }}
              placeholder="Thêm chú thích cho tệp..."
              style={{
                flex: 1, 
                background: 'var(--bg-input)', 
                border: '1.5px solid var(--border)',
                borderRadius: '20px', 
                padding: '10px 16px',
                color: 'var(--text-primary)', 
                fontSize: '13.5px', 
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => handleSendAttachment(imgPreview, null)}
              disabled={sending}
              style={{ 
                background: 'var(--bg-input)', 
                color: 'var(--text-secondary)', 
                border: '1.5px solid var(--border)', 
                padding: '10px 16px', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontWeight: 700, 
                fontFamily: 'inherit', 
                fontSize: '12.5px', 
                flexShrink: 0 
              }}
            >
              Chỉ gửi file
            </button>
            <button
              onClick={() => handleSendAttachment(imgPreview, input)}
              disabled={sending}
              style={{ 
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', 
                color: 'white', 
                border: 'none', 
                padding: '10px 18px', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontWeight: 800, 
                fontFamily: 'inherit', 
                fontSize: '12.5px', 
                flexShrink: 0 
              }}
            >
              Gửi kèm tin
            </button>
          </div>
        </div>
      )}

      {/* Input controls & composer / Relationship status display */}
      {friend.status === 'pending' ? (
        friend.toUserId === String(user.id) ? (
          <div 
            style={{
              padding: '24px 20px',
              borderTop: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 600 }}>
              <strong>{nickname || friend.fullName}</strong> đã gửi lời mời học tập. Kết bạn để bắt đầu trò chuyện!
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
              <button
                onClick={async () => {
                  try {
                    await acceptFriendRequest(friend.requestId);
                    if (onRelationChange) {
                      onRelationChange({ ...friend, status: 'accepted' });
                    }
                  } catch (e) {
                    alert(e.message);
                  }
                }}
                style={{
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '14px', 
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  fontFamily: 'inherit', 
                  fontSize: '14px', 
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                }}
              >
                Chấp nhận
              </button>
              <button
                onClick={async () => {
                  try {
                    await removeFriend(friend.requestId);
                    if (onRelationChange) {
                      onRelationChange(null);
                    }
                  } catch (e) {
                    alert(e.message);
                  }
                }}
                style={{
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '14px',
                  border: '1.5px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.04)',
                  color: '#ef4444', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  fontFamily: 'inherit', 
                  fontSize: '14px', 
                  transition: 'all 0.2s',
                }}
              >
                Từ chối
              </button>
            </div>
          </div>
        ) : (
          <div 
            style={{
              padding: '24px 20px',
              borderTop: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span>⌛</span>
              Đang chờ <strong>{nickname || friend.fullName}</strong> chấp nhận lời mời...
            </div>
            <button
              onClick={async () => {
                try {
                  await removeFriend(friend.requestId);
                  if (onRelationChange) {
                    onRelationChange(null);
                  }
                } catch (e) {
                  alert(e.message);
                }
              }}
              style={{
                padding: '10px 24px', 
                borderRadius: '12px',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                background: 'var(--bg-input)',
                color: '#ef4444', 
                fontWeight: 700, 
                cursor: 'pointer',
                fontFamily: 'inherit', 
                fontSize: '13px', 
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.background = 'var(--bg-input)';
              }}
            >
              Thu hồi lời mời
            </button>
          </div>
        )
      ) : (
        <div 
          style={{
            padding: '8px 20px', 
            borderTop: '1.5px solid var(--border)',
            background: 'var(--bg-card)', 
            flexShrink: 0, 
            position: 'relative',
          }}
        >
          {showEmoji && <EmojiPicker onSelect={addEmoji} onClose={() => setShowEmoji(false)} />}
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => setShowEmoji(v => !v)} 
              title="Biểu cảm" 
              style={{
                background: showEmoji ? 'var(--bg-input)' : 'var(--bg-card)',
                border: '1.5px solid var(--border)', 
                borderRadius: '12px',
                width: '40px', 
                height: '40px', 
                cursor: 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s', 
                flexShrink: 0,
                color: 'var(--text-secondary)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="*/*" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              title="Gửi file tài liệu" 
              style={{
                background: 'var(--bg-card)', 
                border: '1.5px solid var(--border)',
                borderRadius: '12px', 
                width: '40px', 
                height: '40px', 
                cursor: 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s', 
                flexShrink: 0, 
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            <button 
              onClick={() => setShowCamera(true)} 
              title="Chụp ảnh trực tiếp" 
              style={{
                background: 'var(--bg-card)', 
                border: '1.5px solid var(--border)',
                borderRadius: '12px', 
                width: '40px', 
                height: '40px', 
                cursor: 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s', 
                flexShrink: 0, 
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            <SafeTextarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              onPaste={handlePaste}
              placeholder="Nhập tin nhắn..."
              rows={1}
              style={{
                flex: 1, 
                background: 'var(--bg-input)', 
                border: '1.5px solid var(--border)',
                borderRadius: '20px', 
                padding: '10px 16px', 
                resize: 'none',
                color: 'var(--text-primary)', 
                fontSize: '14px', 
                fontFamily: 'inherit',
                outline: 'none', 
                lineHeight: 1.5, 
                maxHeight: '100px', 
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />

            <button 
              onClick={() => handleSendText(input)} 
              disabled={!input.trim() || sending} 
              title="Gửi tin nhắn" 
              style={{
                background: input.trim() ? 'var(--primary)' : 'var(--bg-input)',
                border: 'none', 
                borderRadius: '50%', 
                width: '40px', 
                height: '40px',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0, 
                transition: 'all 0.25s',
                opacity: input.trim() ? 1 : 0.5, 
                color: input.trim() ? 'white' : 'var(--text-muted)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message context menu */}
      {contextMenu && (
        <MessageMenu
          clientX={contextMenu.clientX}
          clientY={contextMenu.clientY}
          msg={contextMenu.msg}
          onSaveImage={() => handleSaveImage(contextMenu.msg)}
          onShare={() => setShareMsg(contextMenu.msg)}
          onDelete={() => handleDelete(contextMenu.msg.id)}
          isMine={String(contextMenu.msg?.fromUserId) === String(user?.id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Share message modal overlay */}
      {shareMsg && (
        <ShareModal
          message={shareMsg}
          friends={friends.filter(f => String(f.userId) !== String(friend.userId))}
          onSend={handleShare}
          onClose={() => setShareMsg(null)}
        />
      )}

      {/* In-app Message Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed', 
            inset: 0, 
            zIndex: 9998,
            background: 'rgba(10, 10, 20, 0.75)', 
            backdropFilter: 'blur(12px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '380px',
              width: '90%',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Xóa tin nhắn?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tin nhắn này sẽ bị xóa vĩnh viễn khỏi cuộc trò chuyện của bạn và không thể khôi phục lại.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px',
                  border: '1.5px solid var(--border)', 
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  fontFamily: 'inherit', 
                  fontSize: '14px', 
                  transition: 'all 0.2s',
                }}
              >
                Hủy
              </button>
              
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px',
                  border: 'none', 
                  background: '#ef4444',
                  color: 'white', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  fontFamily: 'inherit', 
                  fontSize: '14px', 
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Stream Modal */}
      {showCamera && (
        <CameraModal 
          onCapture={(d) => {
            setShowCamera(false);
            handleSendAttachment(d, null);
          }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* High-res Image Zoom Modal */}
      {viewingImage && (
        <div 
          style={{
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999,
            background: 'rgba(10, 10, 20, 0.9)', 
            backdropFilter: 'blur(16px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
          }} 
          onClick={() => setViewingImage(null)}
        >
          <button 
            style={{
              position: 'absolute', 
              top: 24, 
              right: 24,
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              borderRadius: '50%',
              width: 44, 
              height: 44, 
              color: 'white', 
              fontSize: 22, 
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onClick={(e) => { e.stopPropagation(); setViewingImage(null); }}
          >
            ✕
          </button>
          
          <img 
            src={viewingImage} 
            alt="Zoomed View" 
            draggable="false" 
            style={{
              maxWidth: '90%', 
              maxHeight: '75%', 
              objectFit: 'contain',
              borderRadius: '16px', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              userSelect: 'none'
            }} 
            onClick={e => e.stopPropagation()} 
          />
          
          <a 
            href={viewingImage} 
            download="studyconect_image.png" 
            style={{
              marginTop: 24, 
              padding: '14px 28px', 
              background: '#0D9488',
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '14px',
              fontWeight: 800, 
              fontSize: '14.5px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)', 
              transition: 'transform 0.2s'
            }} 
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onClick={e => e.stopPropagation()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Tải ảnh chất lượng cao
          </a>
        </div>
      )}

      {/* Friend Rename Modal */}
      {showRenameModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowRenameModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: '24px',
              padding: '32px',
              width: '400px',
              maxWidth: '100%',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Đổi biệt danh</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Đặt biệt danh cho <strong>{friend.fullName}</strong>. Tên này chỉ hiển thị trong các cuộc trò chuyện riêng giữa hai bạn.
            </p>
            
            <SafeInput
              type="text"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              placeholder="Biệt danh mới..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') setShowRenameModal(false);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1.5px solid var(--border)',
                borderRadius: '14px',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: '24px',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowRenameModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  transition: 'all 0.2s'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveRename}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat History Confirm Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: '24px',
              padding: '32px',
              width: '400px',
              maxWidth: '100%',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Xóa lịch sử tin nhắn</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Xác nhận xóa sạch toàn bộ lịch sử tin nhắn với <strong>{nickname || friend.fullName}</strong>? Hành động này không thể khôi phục lại.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  transition: 'all 0.2s'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleClearChat}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Background Modal */}
      {showBgModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowBgModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: '24px',
              padding: '32px',
              width: '400px',
              maxWidth: '100%',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Đổi hình nền</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Thay đổi hình nền cuộc thảo luận. Ảnh sẽ thay đổi ở cả hai phía thiết bị.
            </p>

            {!bgFilePreview && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '28px 20px',
                    background: 'var(--bg-input)',
                    border: '2px dashed var(--border)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-input)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  Chọn tệp ảnh nền
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBgFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}



            {bgFilePreview && (() => {
              // Parse current bgPos ("50% 50%" or keyword) → numeric %
              const parsePosToXY = (pos) => {
                if (!pos || pos === 'center') return { x: 50, y: 50 };
                if (pos === 'top') return { x: 50, y: 0 };
                if (pos === 'bottom') return { x: 50, y: 100 };
                const parts = pos.split(' ');
                if (parts.length === 2) {
                  const px = parseFloat(parts[0]);
                  const py = parseFloat(parts[1]);
                  if (!isNaN(px) && !isNaN(py)) return { x: px, y: py };
                }
                return { x: 50, y: 50 };
              };

              const { x: crossX, y: crossY } = parsePosToXY(bgPos);

              const handleDragGrid = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const rawX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                const rawY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
                setBgPos(`${Math.round(rawX)}% ${Math.round(rawY)}%`);
              };

              const handleMouseMove = (e) => {
                if (e.buttons !== 1) return;
                handleDragGrid(e);
              };

              return (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Kéo để chọn vùng hiển thị
                    </label>
                    <label
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: 'var(--bg-input)',
                        border: '1.5px solid var(--border)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        margin: 0,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--primary)';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--bg-input)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                    >
                      Đổi ảnh
                      <input type="file" accept="image/*" onChange={handleBgFileChange} style={{ display: 'none' }} />
                    </label>
                  </div>

                  {/* Draggable preview — kéo lưới tới vị trí muốn hiển thị */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '180px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: '1.5px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      cursor: 'crosshair',
                      userSelect: 'none',
                    }}
                    onMouseDown={handleDragGrid}
                    onMouseMove={handleMouseMove}
                    onTouchStart={handleDragGrid}
                    onTouchMove={e => { e.preventDefault(); handleDragGrid(e); }}
                  >
                    {/* Background image */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${bgFilePreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: bgPos,
                      backgroundRepeat: 'no-repeat',
                      transition: 'background-position 0.05s linear',
                    }} />

                    {/* Subtle dark overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 14, 28, 0.28)' }} />

                    {/* Faint rule-of-thirds grid lines */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 300 180" preserveAspectRatio="none">
                      {/* Vertical thirds */}
                      <line x1="100" y1="0" x2="100" y2="180" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 4" />
                      <line x1="200" y1="0" x2="200" y2="180" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 4" />
                      {/* Horizontal thirds */}
                      <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="300" y2="120" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 4" />
                    </svg>

                    {/* Crosshair indicator at current bgPos */}
                    <div style={{
                      position: 'absolute',
                      left: `${crossX}%`,
                      top: `${crossY}%`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {/* outer ring */}
                      <div style={{
                        width: '34px', height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        border: '2px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
                        position: 'relative',
                      }}>
                        {/* crosshair lines */}
                        <div style={{ position: 'absolute', left: '50%', top: '4px', bottom: '4px', width: '1.5px', background: 'white', transform: 'translateX(-50%)', borderRadius: '1px' }} />
                        <div style={{ position: 'absolute', top: '50%', left: '4px', right: '4px', height: '1.5px', background: 'white', transform: 'translateY(-50%)', borderRadius: '1px' }} />
                      </div>
                    </div>

                    {/* Hint label */}
                    <div style={{
                      position: 'absolute', bottom: '8px', left: 0, right: 0,
                      textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.75)',
                      fontWeight: 600, letterSpacing: '0.3px', pointerEvents: 'none',
                    }}>
                      Nhấp hoặc kéo để chọn vùng hiển thị
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => handleSaveBg('')}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px',
                  color: '#ef4444',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 800,
                  transition: 'all 0.2s',
                }}
              >
                Mặc định
              </button>
              
              <button
                onClick={() => setShowBgModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                }}
              >
                Hủy bỏ
              </button>
              
              <button
                onClick={() => handleSaveBg(bgFilePreview ? `${bgFilePreview}|${bgPos}` : '')}
                disabled={!bgFilePreview}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  opacity: (!bgFilePreview) ? 0.5 : 1,
                }}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        @keyframes scaleIn { 
          from { opacity: 0; transform: scale(0.92); } 
          to { opacity: 1; transform: scale(1); } 
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .msgs-no-scrollbar::-webkit-scrollbar { display: none; }
        
        .msg-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          transition: background 0.15s ease;
        }
        .msg-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          transform: scale(0.95);
          flex-shrink: 0;
        }
        .msg-container:hover .msg-actions {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1);
        }
        .msg-action-btn {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          padding: 0;
          line-height: 1;
        }
        .msg-action-btn:hover {
          transform: scale(1.1);
          background: var(--bg-input);
          color: var(--text-primary);
          border-color: var(--primary);
        }
        .msg-action-btn.danger {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }
        .msg-action-btn.danger:hover {
          color: #ef4444;
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
      `}</style>
    </div>
  );
}
