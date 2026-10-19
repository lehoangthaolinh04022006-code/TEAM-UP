import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Copy,
  Check,
  Sparkles,
  Shield,
  Trash2,
  Share2,
  Users,
  CheckCircle2,
  Lock,
  Crown,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  Clock,
  SendHorizontal,
  MailCheck,
} from 'lucide-react';
import { Member, Project, TeamInvitation } from '../types';
import { ThemeConfig } from '../utils/theme';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onAddMember: (newMember: Omit<Member, 'id'>) => void;
  onRemoveMember: (memberId: string) => void;
  theme: ThemeConfig;
  currentUser: Member;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

const SUGGESTED_STUDENTS = [
  {
    name: 'Nguyễn Thu Hà',
    email: 'thuha.nguyen@student.edu.vn',
    role: 'Thiết kế đồ họa & Slide',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    statusText: 'Thành thạo Canva, PPT & Figma',
  },
  {
    name: 'Phạm Quốc Bảo',
    email: 'quocbao.pham@student.edu.vn',
    role: 'Thu thập số liệu & Khảo sát',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    statusText: 'Chuyên chạy SPSS và biểu đồ',
  },
  {
    name: 'Đỗ Mai Anh',
    email: 'maianh.do@student.edu.vn',
    role: 'Thuyết trình viên chính',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    statusText: 'Giọng đọc chuẩn, phản biện tốt',
  },
  {
    name: 'Lê Tuấn Kiệt',
    email: 'tuankiet.le@student.edu.vn',
    role: 'Nghiên cứu tài liệu học thuật',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    statusText: 'Tra cứu Google Scholar & Thư viện',
  },
];

const ROLE_OPTIONS = [
  'Nghiên cứu & Thu thập tài liệu',
  'Thiết kế Slide & Đồ họa',
  'Thuyết trình chính (Speaker)',
  'Soạn thảo nội dung & Báo cáo',
  'Thư ký & Quản lý tiến độ',
  'Phản biện & Kiểm duyệt chất lượng',
  'Giảng viên hướng dẫn / Cố vấn',
  'Thành viên',
];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  project,
  onAddMember,
  onRemoveMember,
  theme,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'email' | 'form' | 'link' | 'suggestions' | 'current'>(
    'email'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [statusText, setStatusText] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Email Invitation States (Canva Style)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLE_OPTIONS[0]);
  const [inviteMessage, setInviteMessage] = useState('Chào bạn, cùng tham gia nhóm để làm bài thuyết trình này với mình nhé!');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<{
    success: boolean;
    previewUrl?: string;
    message: string;
    inviteUrl?: string;
  } | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Fetch invitations for this project
  const fetchInvitations = async () => {
    try {
      setIsLoadingInvitations(true);
      const res = await fetch(`/api/invitations?projectId=${encodeURIComponent(project.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.invitations)) {
        setInvitations(data.invitations);
      }
    } catch (e) {
      console.error('Failed to fetch invitations', e);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, project.id]);

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsSendingInvite(true);
      setLastInviteResult(null);

      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          projectId: project.id,
          projectName: project.name,
          projectCategory: project.category,
          inviterName: currentUser.name || 'Trưởng nhóm',
          inviterEmail: currentUser.email,
          role: inviteRole,
          message: inviteMessage.trim() || undefined,
          baseUrl: window.location.origin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastInviteResult({
          success: true,
          previewUrl: data.previewUrl,
          message: data.message || `Đã gửi email mời thành công đến ${inviteEmail}!`,
          inviteUrl: data.invitation?.inviteUrl,
        });
        setInviteEmail('');
        fetchInvitations();
      } else {
        setLastInviteResult({
          success: false,
          message: data.error || 'Gửi email thất bại',
        });
      }
    } catch (err: any) {
      setLastInviteResult({
        success: false,
        message: err?.message || 'Lỗi kết nối khi gửi email mời',
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccessNotice(data.message || 'Đã gửi lại email mời!');
        setTimeout(() => setSuccessNotice(null), 3000);
        fetchInvitations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn hủy lời mời này khỏi database?')) return;
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessNotice('Đã hủy lời mời thành công');
        setTimeout(() => setSuccessNotice(null), 3000);
        fetchInvitations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySingleInviteLink = (inviteUrl: string, id: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(inviteUrl);
      }
    } catch {
      // fallback
    }
    setCopiedInviteId(id);
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  if (!isOpen) return null;

  // Determine if the current user is the Administrator / Leader of this project
  const isCurrentUserAdmin = Boolean(
    currentUser && (
      project.adminId === currentUser.id ||
      currentUser.isAdmin === true ||
      currentUser.role?.includes('Trưởng nhóm') ||
      currentUser.role?.includes('Quản trị viên')
    )
  );

  const inviteCode = `TU-${project.id.replace('proj_', '').slice(-4).toUpperCase() || '2026'}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = `${origin}/invite/${project.id}?code=${inviteCode}`;

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(inviteLink);
      }
    } catch {
      // Fallback
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const avatarUrl = customAvatarUrl.trim() || selectedAvatar;

    onAddMember({
      name: fullName.trim(),
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '')}@student.edu.vn`,
      role,
      avatar: avatarUrl,
      isOnline: true,
      isSpeaking: false,
      micMuted: true,
      statusText: statusText.trim() || 'Vừa tham gia nhóm TEAM UP',
    });

    setSuccessNotice(`Đã thêm thành viên "${fullName.trim()}" vào nhóm thành công!`);
    setTimeout(() => setSuccessNotice(null), 3000);

    // Reset form
    setFullName('');
    setEmail('');
    setStatusText('');
    setCustomAvatarUrl('');
    setActiveSubTab('current');
  };

  const handleAddSuggested = (suggested: typeof SUGGESTED_STUDENTS[0]) => {
    // Check if already in group
    const alreadyExists = project.members.some(
      (m) => m.name.toLowerCase() === suggested.name.toLowerCase()
    );

    if (alreadyExists) {
      alert(`Bạn ${suggested.name} đã có trong nhóm rồi!`);
      return;
    }

    onAddMember({
      name: suggested.name,
      email: suggested.email,
      role: suggested.role,
      avatar: suggested.avatar,
      isOnline: true,
      isSpeaking: false,
      micMuted: true,
      statusText: suggested.statusText,
    });

    setSuccessNotice(`Đã thêm "${suggested.name}" vào nhóm!`);
    setTimeout(() => setSuccessNotice(null), 3000);
    setActiveSubTab('current');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl ${theme.bgLight} ${theme.textLight} flex items-center justify-center shadow-xs`}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Thêm Thành Viên Vào Nhóm
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {project.members.length} người
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dự án: <strong className="text-slate-700 dark:text-slate-200">{project.name}</strong>
              </p>
            </div>
          </div>

          <button
            id="btn-close-add-member-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/60 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Permission Status Banner */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          {isCurrentUserAdmin ? (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">
                <Shield className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Vai trò của bạn: <strong className="text-indigo-600 dark:text-indigo-400">Quản trị viên nhóm</strong>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bạn có toàn quyền thêm thành viên và xóa thành viên khỏi nhóm.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Vai trò của bạn: <strong className="text-amber-600 dark:text-amber-400">Thành viên nhóm</strong>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bạn có quyền mời/thêm thành viên. Quyền xóa thành viên thuộc về Quản trị viên.
                </p>
              </div>
            </div>
          )}

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
              isCurrentUserAdmin
                ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300'
                : 'bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isCurrentUserAdmin ? 'Admin (Toàn quyền)' : 'Chỉ thêm thành viên'}
          </span>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('email')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'email'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mời Qua Email (Canva Style)</span>
            {invitations.filter((i) => i.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('form')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'form'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Thêm Nhanh
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('link')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'link'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Link Mời Nhóm
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('suggestions')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'suggestions'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Gợi Ý ({SUGGESTED_STUDENTS.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('current')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'current'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Đã Tham Gia ({project.members.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 0: MỜI QUA EMAIL (CANVA STYLE) */}
          {activeSubTab === 'email' && (
            <div className="space-y-5">
              {/* Canva Info Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <MailCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Gửi Lời Mời Tham Gia Qua Email Như Canva
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
                        Gửi Email Thật
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Nhập email người nhận và bấm <strong>"Gửi Lời Mời"</strong>. Hệ thống sẽ gửi email thông báo trực tiếp đến hộp thư kèm nút <strong>"Tham gia nhóm"</strong>. Lời mời sẽ được lưu vào cơ sở dữ liệu với trạng thái <code>pending</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Invite Form */}
              <form onSubmit={handleSendEmailInvite} className="space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email người nhận <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="input-canva-invite-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="nhap.email.ban.hoc@gmail.com hoặc edu.vn"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Vai trò được chỉ định
                    </label>
                    <select
                      id="select-canva-invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tên người mời hiển thị
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentUser.name}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 select-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lời nhắn kèm theo (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Ví dụ: Chào bạn, cùng vào làm bài thuyết trình với nhóm nhé!"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Email gửi kèm liên kết trực tiếp để mở app
                  </span>

                  <button
                    id="btn-send-canva-invite"
                    type="submit"
                    disabled={isSendingInvite || !inviteEmail.trim()}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingInvite ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi email...</span>
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="w-3.5 h-3.5" />
                        <span>Gửi Lời Mời Qua Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Last Invite Result Card */}
              {lastInviteResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-3 animate-in fade-in ${
                    lastInviteResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {lastInviteResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{lastInviteResult.message}</span>
                  </div>

                  {lastInviteResult.previewUrl && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Hộp thư nhận email (Xem trực tiếp):
                        </span>
                        <a
                          href={lastInviteResult.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <span>Mở xem Email đã gửi</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Email đã được chuyển phát qua giao thức SMTP thật. Bạn có thể bấm vào liên kết trên để xem giao diện Canva của email người nhận.
                      </p>
                    </div>
                  )}

                  {lastInviteResult.inviteUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (lastInviteResult.inviteUrl) {
                            navigator.clipboard.writeText(lastInviteResult.inviteUrl);
                            setSuccessNotice('Đã sao chép liên kết mời!');
                            setTimeout(() => setSuccessNotice(null), 2500);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 text-[11px] shadow-xs"
                      >
                        <Copy className="w-3 h-3" />
                        Sao chép link mời
                      </button>

                      <a
                        href={`mailto:${encodeURIComponent(
                          inviteEmail || ''
                        )}?subject=${encodeURIComponent(
                          `[TEAM UP] Mời bạn tham gia nhóm "${project.name}"`
                        )}&body=${encodeURIComponent(
                          `Chào bạn,\n\nMình mời bạn tham gia nhóm "${project.name}" trên TEAM UP.\nBấm vào đường link sau để tham gia nhóm ngay nhé:\n${lastInviteResult.inviteUrl}`
                        )}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Mail className="w-3 h-3" />
                        Mở App Email gửi trực tiếp
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Database Invitations Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Danh Sách Lời Mời Trong Database ({invitations.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={fetchInvitations}
                    disabled={isLoadingInvitations}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvitations ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    Chưa có lời mời nào được gửi cho nhóm này trong database.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {inv.email}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                inv.status === 'accepted'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {inv.status === 'accepted' ? (
                                <>
                                  <Check className="w-2.5 h-2.5" />
                                  Đã chấp nhận (accepted)
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Đang chờ (pending)
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>Vai trò: <strong className="text-indigo-600 dark:text-indigo-400">{inv.role}</strong></span>
                            <span>•</span>
                            <span>{new Date(inv.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {inv.previewUrl && (
                            <a
                              href={inv.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-xs font-semibold flex items-center gap-1"
                              title="Xem lại email đã gửi"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Xem email</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopySingleInviteLink(inv.inviteUrl, inv.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
                            title="Sao chép link mời"
                          >
                            {copiedInviteId === inv.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[11px] text-emerald-600">Đã copy</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">Copy link</span>
                              </>
                            )}
                          </button>

                          {inv.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleResendInvite(inv.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold flex items-center gap-1"
                              title="Gửi lại email mời"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Gửi lại</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteInvite(inv.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Hủy lời mời khỏi database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* TAB 1: FORM THÊM TRỰC TIẾP */}
          {activeSubTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và tên thành viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-member-name"
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An, Trần Thùy Linh..."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    Email / Tài khoản sinh viên
                  </label>
                  <input
                    id="input-member-email"
                    type="email"
                    placeholder="name@student.edu.vn hoặc gmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vai trò / Phụ trách chính
                  </label>
                  <select
                    id="select-member-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú trạng thái / Kỹ năng
                  </label>
                  <input
                    id="input-member-status"
                    type="text"
                    placeholder="Ví dụ: Phụ trách slide 3-6, dợt thuyết trình"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn ảnh đại diện Avatar
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {PRESET_AVATARS.map((av, idx) => {
                    const isSelected = selectedAvatar === av && !customAvatarUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av);
                          setCustomAvatarUrl('');
                        }}
                        className={`relative rounded-full p-0.5 transition-transform hover:scale-105 shrink-0 ${
                          isSelected
                            ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={av}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  id="btn-submit-add-member"
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs ${theme.primary}`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Xác Nhận Thêm Thành Viên
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LINK MỜI NHÓM */}
          {activeSubTab === 'link' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  <span>Đường dẫn mời tham gia trực tiếp</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bất kỳ ai có đường link hoặc mã mời này đều có thể tham gia vào không gian nhóm{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{project.name}</strong> để
                  cùng xem tài liệu, nhận nhiệm vụ và chỉnh sửa bài thuyết trình.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 select-all"
                  />
                  <button
                    id="btn-copy-invite-link"
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                      copiedLink
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : `${theme.primary}`
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Đã sao chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép link
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mã PIN gia nhập nhanh:
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Thành viên có thể nhập mã này tại màn hình chính
                  </p>
                </div>
                <span className="text-sm font-black font-mono tracking-widest px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {inviteCode}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: GỢI Ý BẠN HỌC */}
          {activeSubTab === 'suggestions' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thêm nhanh các bạn học/cộng tác viên quen thuộc với 1 cú nhấp chuột:
              </p>

              <div className="space-y-2.5">
                {SUGGESTED_STUDENTS.map((sug, idx) => {
                  const isAlreadyMember = project.members.some(
                    (m) => m.name.toLowerCase() === sug.name.toLowerCase()
                  );
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={sug.avatar}
                          alt={sug.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {sug.name}
                          </p>
                          <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate">
                            {sug.role}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{sug.statusText}</p>
                        </div>
                      </div>

                      {isAlreadyMember ? (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                          <Check className="w-3.5 h-3.5" />
                          Đã có trong nhóm
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSuggested(sug)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${theme.bgLight} ${theme.textLight} hover:opacity-90 transition-opacity`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          + Thêm ngay
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DANH SÁCH THÀNH VIÊN HIỆN TẠI */}
          {activeSubTab === 'current' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng cộng {project.members.length} thành viên
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('form')}
                  className={`text-xs font-bold flex items-center gap-1 ${theme.textLight} hover:underline`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Thêm người mới
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {project.members.map((member) => {
                  const isMe = member.id === currentUser.id;
                  return (
                    <div
                      key={member.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              member.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {member.name}
                            </h4>
                            {isMe && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                Bạn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 truncate">
                            {member.role}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {member.id === project.adminId || member.role?.includes('Trưởng nhóm') || member.role?.includes('Quản trị viên') ? (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-500" />
                            Quản trị viên
                          </span>
                        ) : isCurrentUserAdmin ? (
                          // Quản trị viên CÓ quyền xóa thành viên
                          <button
                            id={`btn-remove-member-${member.id}`}
                            type="button"
                            title="Xóa thành viên khỏi nhóm (Quyền Quản trị viên)"
                            onClick={() => setMemberToDelete(member)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span className="hidden sm:inline text-red-600 dark:text-red-400">Xóa</span>
                          </button>
                        ) : (
                          // Thành viên thông thường KHÔNG có quyền xóa thành viên
                          <span
                            title="Chỉ Quản trị viên nhóm mới có quyền xóa thành viên"
                            className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Chỉ Admin được xóa</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Admin Member Removal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl border border-red-200 dark:border-red-900/60 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xác Nhận Xóa Thành Viên
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hành động dành riêng cho Quản trị viên
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa thành viên{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                "{memberToDelete.name}"
              </strong>{' '}
              khỏi nhóm <strong className="text-indigo-600 dark:text-indigo-400">{project.name}</strong>?
            </p>

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="text-base">📲</span>
              <span>
                Thông báo quan trọng sẽ được <strong>trực tiếp gửi về máy</strong> của các thành viên trong nhóm.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Hủy Bỏ
              </button>
              <button
                id="btn-confirm-delete-member"
                type="button"
                onClick={() => {
                  onRemoveMember(memberToDelete.id);
                  setMemberToDelete(null);
                  setSuccessNotice(`Đã xóa thành viên "${memberToDelete.name}" khỏi nhóm.`);
                  setTimeout(() => setSuccessNotice(null), 3000);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa Khỏi Nhóm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
