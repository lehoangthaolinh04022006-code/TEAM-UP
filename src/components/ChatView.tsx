import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Users,
  Sparkles,
  FileText,
  Search,
  Bot,
  Mic,
  MicOff,
  Plus,
  X,
  AtSign,
  Check,
  Radio,
  Volume2,
  ChevronLeft,
} from 'lucide-react';
import { ChatMessage, Member, Project } from '../types';
import { ThemeConfig } from '../utils/theme';

export interface ChatGroupChannel {
  id: string;
  name: string;
  description?: string;
  memberIds?: string[];
  isDefault?: boolean;
}

interface ChatViewProps {
  project: Project;
  currentUser: Member;
  messages: ChatMessage[];
  onSendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  theme: ThemeConfig;
  onOpenAiModal?: () => void;
  onOpenAddMemberModal?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  project,
  currentUser,
  messages,
  onSendMessage,
  theme,
  onOpenAiModal,
  onOpenAddMemberModal,
}) => {
  // Navigation: null = Group chat, string = 1-1 direct message with member id
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  // Mobile screen toggle: false = show channel list, true = show active chat
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  // Group channels list (Mục tạo nhóm ở dưới Thảo Luận Chung)
  const [channels, setChannels] = useState<ChatGroupChannel[]>([
    {
      id: 'ch_main',
      name: 'Thảo Luận Chung',
      description: 'Kênh trao đổi chung của toàn bộ thành viên',
      isDefault: true,
    },
    {
      id: 'ch_slide',
      name: 'Nhóm Soạn Slide',
      description: 'Trao đổi ý tưởng, bố cục và thiết kế bài thuyết trình',
    },
    {
      id: 'ch_report',
      name: 'Nhóm Báo Cáo & Số Liệu',
      description: 'Tổng hợp tài liệu, dẫn chứng và số liệu khảo sát',
    },
  ]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ch_main');

  // Modal tạo nhóm mới
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);

  // Input & mentions
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  // Direct Microphone voice bubble state
  const [isDirectMicOn, setIsDirectMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(1);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Toggle Live Direct Microphone
  const toggleDirectMic = async () => {
    if (isDirectMicOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setIsDirectMicOn(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
        }
      } catch (err) {
        console.warn('Microphone permission not granted or device not present; using active voice mode:', err);
      }
      setIsDirectMicOn(true);
    }
  };

  // Sound wave animation effect when mic is on
  useEffect(() => {
    if (!isDirectMicOn) return;
    const interval = setInterval(() => {
      setMicVolume(0.4 + Math.random() * 0.6);
    }, 180);
    return () => clearInterval(interval);
  }, [isDirectMicOn]);

  // Clean up mic on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Filter messages based on group channel vs 1-on-1 direct message
  const currentChatMessages = messages.filter((m) => {
    if (m.projectId !== project.id) return false;

    if (!selectedRecipientId) {
      // In group mode
      return !m.recipientId;
    } else {
      // 1-on-1 direct message between currentUser and selectedRecipientId
      const isBetween =
        (m.senderId === currentUser.id && m.recipientId === selectedRecipientId) ||
        (m.senderId === selectedRecipientId && m.recipientId === currentUser.id);
      return isBetween;
    }
  });

  const selectedMember = selectedRecipientId
    ? project.members.find((m) => m.id === selectedRecipientId)
    : null;

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChatMessages, isAiTyping]);

  // Handle @ Mention search detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInputText(val);
    setCursorPosition(pos);

    // Look for '@' before cursor
    const textBeforeCursor = val.slice(0, pos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9À-ỹ_ ]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
      setMentionQuery('');
    }
  };

  // Mention suggestions list
  const mentionItems = [
    {
      id: 'all',
      name: 'Mọi người',
      subtitle: 'Tag toàn bộ thành viên trong nhóm',
      isAll: true,
      avatar: '',
    },
    {
      id: 'ai',
      name: 'UP AI',
      subtitle: 'Hỏi đáp trực tiếp trợ lý UP AI (tìm kiếm ngầm từ Google)',
      isAi: true,
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    },
    ...project.members.map((m) => ({
      id: m.id,
      name: m.name,
      subtitle: m.role,
      avatar: m.avatar,
      isOnline: m.isOnline,
    })),
  ];

  const filteredMentions = mentionItems.filter((item) =>
    item.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleSelectMention = (name: string) => {
    const textBeforeCursor = inputText.slice(0, cursorPosition);
    const textAfterCursor = inputText.slice(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const updated = textBeforeCursor.slice(0, atIndex) + `@${name} ` + textAfterCursor;
      setInputText(updated);
    } else {
      setInputText((prev) => prev + `@${name} `);
    }
    setShowMentionMenu(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  // Send message
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();

    const newMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
      projectId: project.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId: selectedRecipientId || undefined,
      text: messageText,
      type: 'text',
    };

    onSendMessage(newMsg);
    setInputText('');
    setShowMentionMenu(false);

    // Trigger UP AI if @ai or @up ai is mentioned
    const lower = messageText.toLowerCase();
    if (lower.includes('@ai') || lower.includes('@up ai') || lower.includes('@troly')) {
      handleAiChatResponse(messageText);
    }
  };

  // UP AI response: concise, grounds on Google/web in background, strips * and #
  const handleAiChatResponse = async (question: string) => {
    setIsAiTyping(true);
    try {
      const promptQuery = question.replace(/@up ai|@ai|@troly/gi, '').trim();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptQuery || 'Tôi có thể hỗ trợ gì cho bạn hoặc nhóm hôm nay?',
        }),
      });

      const data = await res.json();
      if (data.reply) {
        // Strip markdown symbols * and # as requested
        const cleanReply = data.reply.replace(/[*#]/g, '').trim();

        onSendMessage({
          projectId: project.id,
          senderId: 'ai_bot',
          senderName: 'UP AI',
          senderAvatar:
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          recipientId: selectedRecipientId || undefined,
          text: cleanReply,
          type: 'text',
          isAi: true,
        });
      }
    } catch (err) {
      console.error('Failed to get UP AI response:', err);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Create new group handler
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newChannel: ChatGroupChannel = {
      id: `ch_${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Nhóm thảo luận chuyên đề',
      memberIds:
        selectedGroupMemberIds.length > 0
          ? selectedGroupMemberIds
          : project.members.map((m) => m.id),
    };

    setChannels((prev) => [...prev, newChannel]);
    setSelectedRecipientId(null);
    setSelectedChannelId(newChannel.id);
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedGroupMemberIds([]);

    // Send system announcement
    onSendMessage({
      projectId: project.id,
      senderId: 'system',
      senderName: 'Hệ Thống',
      senderAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: `Nhóm "${newChannel.name}" đã được tạo. Các thành viên có thể bật mic nói trực tiếp hoặc nhắn tin thảo luận tại đây.`,
      type: 'system',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    onSendMessage({
      projectId: project.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId: selectedRecipientId || undefined,
      text: isImage ? `Đã gửi một hình ảnh: ${file.name}` : `Đã gửi tài liệu đính kèm: ${file.name}`,
      type: isImage ? 'image' : 'file',
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileUrl: URL.createObjectURL(file),
    });
  };

  // Parse text and format @tags
  const renderMessageContent = (text: string) => {
    // Split text by tags while keeping them
    const tokens = text.split(/(@[a-zA-Z0-9À-ỹ_ ]+?)(?=[.,!?\s]|$)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('@')) {
        const tag = token.slice(1).trim();
        const isAll = /^(mọi người|all)$/i.test(tag);
        const isAi = /^(up ai|ai|trợ lý|troly)$/i.test(tag);

        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded font-bold text-[11px] align-baseline transition-colors ${
              isAll
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                : isAi
                ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700'
                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700'
            }`}
          >
            {token}
          </span>
        );
      }
      return token;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex h-[calc(100vh-210px)] min-h-[580px] relative">
      {/* Left Sidebar: Channel & DM list (Full width on mobile when viewing list) */}
      <aside
        aria-label="Danh sách tin nhắn"
        className={`w-full md:w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 shrink-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Group Channels Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Kênh thảo luận nhóm</span>
              <span className="text-[10px] font-medium text-slate-400">
                {channels.length} nhóm
              </span>
            </div>

            {/* List of Channels starting with Thảo Luận Chung */}
            <div className="space-y-1">
              {channels.map((chan) => {
                const isSelected = selectedRecipientId === null && selectedChannelId === chan.id;
                return (
                  <button
                    key={chan.id}
                    id={`btn-channel-${chan.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedRecipientId(null);
                      setSelectedChannelId(chan.id);
                      setMobileShowChat(true);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors min-h-[44px] cursor-pointer ${
                      isSelected
                        ? `${theme.bgLight} ${theme.textLight} font-bold shadow-2xs`
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate"># {chan.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {chan.description || `${project.members.length} thành viên`}
                        </p>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </button>
                );
              })}

              {/* Nút "Tạo nhóm" ở ngay dưới "Thảo Luận Chung" */}
              <button
                id="btn-chat-create-group"
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all shadow-2xs cursor-pointer min-h-[44px] group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>Tạo nhóm</span>
              </button>
            </div>
          </div>

          {/* 1-on-1 Direct Messages */}
          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Nhắn tin cá nhân (1-1)
            </div>
            <div className="space-y-1">
              {project.members
                .filter((m) => m.id !== currentUser.id)
                .filter((m) => m.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((member) => {
                  const isSelected = selectedRecipientId === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedRecipientId(member.id);
                        setMobileShowChat(true);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors min-h-[44px] cursor-pointer ${
                        isSelected
                          ? `${theme.bgLight} ${theme.textLight} font-bold shadow-2xs`
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              member.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{member.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* AI Helper Banner */}
        {onOpenAiModal && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-linear-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20">
            <button
              type="button"
              onClick={onOpenAiModal}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 shadow-2xs hover:bg-indigo-50 min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Hỏi UP AI
            </button>
          </div>
        )}
      </aside>

      {/* Main Chat Area (Full width on mobile when viewing chat) */}
      <section
        aria-label="Khu vực trò chuyện"
        className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative ${
          mobileShowChat ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Chat Header */}
        <div className="px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back button on mobile */}
            <button
              type="button"
              onClick={() => setMobileShowChat(false)}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title="Quay lại danh sách kênh"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {selectedMember ? (
              <>
                <div className="relative shrink-0">
                  <img
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    className="w-9 h-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      selectedMember.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedMember.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {selectedMember.role} • {selectedMember.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                  #
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeChannel.name} ({project.name})
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeChannel.description || 'Kênh trao đổi nhóm • Gõ @ để tag tên thành viên hoặc hỏi UP AI'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* BONG BÓNG MICRO NÓI TRỰC TIẾP (Thay cho mục "Mẹo: Gõ @AI để trợ lý trả lời") */}
          <div className="flex items-center gap-2 shrink-0">
            {isDirectMicOn ? (
              <div
                id="voice-bubble-active"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25 transition-all"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-100"></span>
                </span>

                {/* Animated equalizer bars */}
                <div className="flex items-center gap-0.5 h-3.5 px-0.5">
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(4, 10 * micVolume)}px` }}
                  />
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(6, 14 * micVolume)}px` }}
                  />
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(4, 9 * micVolume)}px` }}
                  />
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(5, 12 * micVolume)}px` }}
                  />
                </div>

                <span className="text-xs font-extrabold tracking-tight hidden sm:inline">
                  Đang Nói Trực Tiếp
                </span>

                <button
                  id="btn-voice-bubble-stop"
                  type="button"
                  onClick={toggleDirectMic}
                  title="Tắt micro nói trực tiếp"
                  className="ml-1 p-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  <MicOff className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-voice-bubble-start"
                type="button"
                onClick={toggleDirectMic}
                title="Bật mic nói trực tiếp với các thành viên trong nhóm này"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-xs group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Mic className="w-3 h-3" />
                </div>
                <span className="hidden sm:inline">Bật Mic Nói Trực Tiếp</span>
                <span className="sm:hidden">Bật Mic</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Banner when Direct Mic is Active */}
        {isDirectMicOn && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-pulse">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold">
                  Bạn đang bật micro nói trực tiếp trong {selectedRecipientId ? selectedMember?.name : activeChannel.name}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Thành viên nghe được âm thanh trực tiếp mà không cần bấm gọi video hay soạn tin nhắn.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleDirectMic}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Tắt Mic
            </button>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {currentChatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Users className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Chưa có tin nhắn nào trong kênh này
              </p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Bắt đầu thảo luận, gõ @ để tag thành viên hoặc bấm &quot;Bật Mic Nói Trực Tiếp&quot; ở góc trên bên phải nhé!
              </p>
            </div>
          ) : (
            currentChatMessages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const isAi = msg.isAi || msg.senderId === 'ai_bot';
              const isSystem = msg.type === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 font-medium">
                      📢 {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    referrerPolicy="no-referrer"
                  />

                  <div className={`max-w-md sm:max-w-lg space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {msg.senderName}
                      </span>
                      {isAi && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center gap-0.5">
                          <Bot className="w-3 h-3" />
                          UP AI
                        </span>
                      )}
                      <span className="text-slate-400">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? `${theme.primary} rounded-tr-xs shadow-xs`
                          : isAi
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 border border-indigo-200 dark:border-indigo-900/50 rounded-tl-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {msg.type === 'image' && msg.fileUrl && (
                        <div className="mb-2 rounded-lg overflow-hidden max-w-xs">
                          <img src={msg.fileUrl} alt="Attached" className="w-full object-cover" />
                        </div>
                      )}

                      {msg.type === 'file' && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/20 dark:bg-black/20 mb-1">
                          <FileText className="w-4 h-4" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{msg.fileName}</p>
                            <p className="text-[10px] opacity-80">{msg.fileSize}</p>
                          </div>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{renderMessageContent(msg.text)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isAiTyping && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-2xl text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span>UP AI đang tìm hiểu ngầm thông tin và tổng hợp câu trả lời...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with @ Mention Popup */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 relative">
          {/* Autocomplete Popup when user types @ */}
          {showMentionMenu && filteredMentions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 sm:left-14 sm:max-w-md mb-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tag thành viên hoặc mọi người trong nhóm:</span>
              </div>
              <div className="max-h-52 overflow-y-auto p-1.5 space-y-1">
                {filteredMentions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMention(item.name)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    {item.isAll ? (
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    ) : item.isAi ? (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-7 h-7 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                            item.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          @{item.name}
                        </span>
                        {item.isAll && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                            Tất cả
                          </span>
                        )}
                        {item.isAi && (
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                            UP AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Upload file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Đính kèm tài liệu"
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Upload image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Gửi hình ảnh"
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Quick Tag @ button */}
              <button
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + '@');
                  setShowMentionMenu(true);
                  inputRef.current?.focus();
                }}
                title="Tag thành viên (@)"
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <AtSign className="w-4 h-4" />
              </button>

              {/* Input text field */}
              <input
                id="input-chat-message"
                ref={inputRef}
                type="text"
                placeholder={
                  selectedRecipientId
                    ? `Nhắn tin cho ${selectedMember?.name}...`
                    : `Nhắn vào #${activeChannel.name} (gõ @ để tag tên thành viên hoặc hỏi UP AI)...`
                }
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {/* Send button */}
              <button
                id="btn-send-message"
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  inputText.trim()
                    ? `${theme.primary} shadow-sm`
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick suggested chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-slate-500 scrollbar-none">
              <span className="font-semibold shrink-0">Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => setInputText('@Mọi người ')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                👥 @Mọi người
              </button>
              <button
                type="button"
                onClick={() => setInputText('@UP AI Gợi ý cho nhóm 3 cách trình bày slide thuyết trình ấn tượng')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                ✨ @UP AI Ý tưởng slide
              </button>
              <button
                type="button"
                onClick={toggleDirectMic}
                className="px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 cursor-pointer"
              >
                🎙️ Bật mic nói ngay
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Modal Tạo Nhóm Mới (khi bấm vào nút Tạo nhóm ở dưới Thảo Luận Chung) */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tạo Nhóm Thảo Luận Mới
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Thêm kênh nhóm chuyên biệt dưới Thảo Luận Chung
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên nhóm thảo luận *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhóm Thuyết Trình, Nhóm Nghiên Cứu..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả mục tiêu nhóm (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Luyện nói 10 phút, chuẩn bị slide, tổng hợp tài liệu..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Chọn thành viên tham gia
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGroupMemberIds.length === project.members.length) {
                        setSelectedGroupMemberIds([]);
                      } else {
                        setSelectedGroupMemberIds(project.members.map((m) => m.id));
                      }
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    {selectedGroupMemberIds.length === project.members.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {project.members.map((mem) => {
                    const isChecked = selectedGroupMemberIds.includes(mem.id);
                    return (
                      <label
                        key={mem.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={mem.avatar}
                            alt={mem.name}
                            className="w-6 h-6 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {mem.name}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMemberIds((prev) => [...prev, mem.id]);
                            } else {
                              setSelectedGroupMemberIds((prev) =>
                                prev.filter((id) => id !== mem.id)
                              );
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    newGroupName.trim()
                      ? `${theme.primary} shadow-sm`
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Tạo Nhóm Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
