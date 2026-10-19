import React, { useState, useRef, useEffect } from 'react';
import {
  Users2,
  CheckSquare,
  Presentation,
  MessageSquare,
  FolderArchive,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  Palette,
  Layers,
  Check,
  UserPlus,
  Shield,
  Lock,
  Crown,
  UserCheck,
} from 'lucide-react';
import { Project, ActiveTab, ThemeColor, Member, AppNotification } from '../types';
import { THEMES, ThemeConfig, PASTEL_12_PRESETS, applyThemeCssVariables } from '../utils/theme';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (proj: Project) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  theme: ThemeConfig;
  onThemeColorChange: (color: ThemeColor) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAiModal: () => void;
  onOpenNewProjectModal: () => void;
  onOpenAddMemberModal?: () => void;
  currentUser: Member;
  notifications: AppNotification[];
  onMarkAllNotificationsAsRead: () => void;
  onClearNotifications: () => void;
  onSendBroadcastNotification: (title: string, body: string) => void;
  onSwitchUser?: (user: Member) => void;
  allMembers?: Member[];
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  activeTab,
  onTabChange,
  theme,
  onThemeColorChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenAiModal,
  onOpenNewProjectModal,
  onOpenAddMemberModal,
  currentUser,
  notifications,
  onMarkAllNotificationsAsRead,
  onClearNotifications,
  onSendBroadcastNotification,
  onSwitchUser,
  allMembers = [],
}) => {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    if (showUserMenu || showProjectMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showProjectMenu]);

  const isCurrentUserAdmin = Boolean(
    currentUser && (
      activeProject.adminId === currentUser.id ||
      currentUser.isAdmin === true ||
      currentUser.role?.includes('Trưởng nhóm') ||
      currentUser.role?.includes('Quản trị viên')
    )
  );

  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    isAi?: boolean;
  }[] = [
    { id: 'overview', label: 'Tổng Quan', icon: <Layers className="w-4 h-4" /> },
    {
      id: 'tasks',
      label: 'Nhiệm vụ & Tiến độ',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: `${activeProject.progress}%`,
    },
    { id: 'slides', label: 'Tạo Slide', icon: <Presentation className="w-4 h-4" /> },
    { id: 'chat', label: 'Tin nhắn & Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'documents', label: 'Tài liệu', icon: <FolderArchive className="w-4 h-4" /> },
    {
      id: 'up_ai',
      label: 'UP AI',
      icon: <Sparkles className="w-4 h-4 animate-pulse text-indigo-500 dark:text-indigo-400" />,
      isAi: true,
    },
  ];

  const handleSelectTheme = (themeId: string) => {
    const targetTheme = THEMES[themeId];
    if (targetTheme) {
      applyThemeCssVariables(targetTheme);
    } else {
      const preset = PASTEL_12_PRESETS.find((p) => p.id === themeId);
      if (preset && typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--primary-color', preset.primaryHex || '#059669');
        document.documentElement.style.setProperty('--bg-color', preset.hex);
        document.documentElement.style.setProperty('--primary-hover', preset.textColor || '#047857');
        document.documentElement.style.setProperty('--bg-pastel-canvas', `${preset.hex}2b`);
      }
    }

    try {
      localStorage.setItem('teamup_theme', themeId);
      localStorage.setItem('teamup_theme_color', themeId);
    } catch (e) {
      console.error('Failed to save teamup_theme to localStorage', e);
    }

    onThemeColorChange(themeId);
    setShowThemeMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="h-0.5 w-full bg-linear-to-r from-transparent via-[var(--primary-color)] to-transparent opacity-80" />
      {/* Top row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-3">
        {/* Brand & Project Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-colors"
              style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover, #1e293b))' }}
            >
              <Users2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  TEAM<span style={{ color: 'var(--primary-color)' }}>UP</span>
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hidden sm:inline-block">
                  Workspace
                </span>
              </div>
            </div>
          </div>

          {/* Project Switcher Dropdown */}
          <div className="relative min-w-0" ref={projectMenuRef}>
            <button
              id="btn-header-project-selector"
              type="button"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer max-w-[130px] sm:max-w-[200px] md:max-w-[260px]"
              title="Đổi dự án hoặc tạo nhóm mới"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate">{activeProject.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showProjectMenu && (
              <div className="absolute left-0 mt-2 w-72 max-w-[90vw] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Danh sách nhóm & dự án</span>
                  <span className="text-[10px] text-slate-400 font-medium">{projects.length} nhóm</span>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {projects.map((p) => {
                    const isSelected = p.id === activeProject.id;
                    const isOnline = p.members.some((m) => m.isOnline);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectProject(p);
                          setShowProjectMenu(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? `${theme.bgLight} ${theme.textLight} font-bold shadow-2xs`
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectMenu(false);
                      onOpenNewProjectModal();
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${theme.primary} shadow-xs cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Nhóm Mới</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Add Member, Theme, Dark Mode, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add Member Button */}
          {onOpenAddMemberModal && (
            <button
              id="btn-header-add-member"
              type="button"
              onClick={onOpenAddMemberModal}
              title="Thêm hoặc mời thành viên vào nhóm này"
              style={{ backgroundColor: 'var(--primary-color)' }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs hover:opacity-90 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden md:inline">Thêm Thành Viên</span>
              <span className="md:hidden">Mời</span>
            </button>
          )}

          {/* Theme Color Picker */}
          <div className="relative">
            <button
              id="btn-theme-picker"
              type="button"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title="Bộ sưu tập màu pastel & giao diện"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span className="hidden xl:inline text-xs font-medium">Bảng màu Pastel</span>
            </button>

            {showThemeMenu && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95">
                {/* Header of theme picker */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Bảng Màu Giao Diện
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                      MÀU PASTEL DỊU MÁT (12)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowThemeMenu(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 leading-none cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Đóng bảng màu"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Section 1: 12 Pastel Palettes with real Radio buttons */}
                <div className="mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Màu Pastel Dịu Mắt (12)</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Sáng & thanh thoát</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {PASTEL_12_PRESETS.map((preset) => {
                      const isSelected = theme.id === preset.id || theme.pastelHex?.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <label
                          key={preset.id}
                          htmlFor={`radio-theme-${preset.id}`}
                          onClick={() => handleSelectTheme(preset.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500/50 shadow-xs font-bold'
                              : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            id={`radio-theme-${preset.id}`}
                            name="teamup_theme"
                            value={preset.id}
                            checked={isSelected}
                            onChange={() => handleSelectTheme(preset.id)}
                            className="w-3.5 h-3.5 text-emerald-600 border-slate-300 dark:border-slate-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                          />
                          <span
                            className="w-4 h-4 rounded-full shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <div className="truncate flex-1 min-w-0">
                            <span className="block text-[11px] truncate leading-tight">
                              {preset.name}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-mono">
                              {preset.hex}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 font-bold" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Classic Palettes */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Màu Đậm Cổ Điển
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(THEMES) as ThemeColor[])
                      .filter((k) => THEMES[k].group === 'classic')
                      .map((colKey) => {
                        const t = THEMES[colKey];
                        const isSelected = theme.id === colKey;
                        return (
                          <button
                            key={colKey}
                            type="button"
                            onClick={() => handleSelectTheme(colKey)}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left text-[11px] transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-100 dark:bg-slate-800 font-bold ring-2 ring-indigo-500/50 shadow-xs'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full ${t.swatchColor} shrink-0 ring-1 ring-black/10`}
                            />
                            <span className="truncate text-[10px]">
                              {t.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Center: Important notifications sent directly to devices */}
          <NotificationCenter
            notifications={notifications}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
            onClearNotifications={onClearNotifications}
            onSendBroadcastNotification={onSendBroadcastNotification}
            theme={theme}
            currentUser={currentUser}
            activeProject={activeProject}
            isAdmin={isCurrentUserAdmin}
          />

          {/* Dark / Light Toggle */}
          <button
            id="btn-toggle-dark-mode"
            type="button"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Current User with Role Indicator & Role Switcher */}
          <div className="relative" ref={userMenuRef}>
            <button
              id="btn-user-profile-menu"
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 hover:opacity-85 transition-opacity text-left cursor-pointer"
              title="Xem thông tin phân quyền & Chuyển đổi tài khoản thử nghiệm"
            >
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[100px]">
                    {currentUser.name}
                  </p>
                  {isCurrentUserAdmin ? (
                    <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-none mt-1 truncate max-w-[110px]">
                  {isCurrentUserAdmin ? 'Quản trị viên' : 'Thành viên'}
                </p>
              </div>
            </button>

            {/* User Profile & Role Switcher Popover */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${
                        isCurrentUserAdmin
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {isCurrentUserAdmin ? (
                        <>
                          <Crown className="w-3 h-3 text-amber-500" />
                          Quản trị viên (Admin)
                        </>
                      ) : (
                        'Thành viên nhóm'
                      )}
                    </span>
                  </div>
                </div>

                {/* Permissions Breakdown */}
                <div className="py-2.5 text-[11px] space-y-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                      Quyền thêm thành viên:
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Cho phép</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      Quyền xóa thành viên:
                    </span>
                    {isCurrentUserAdmin ? (
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Có quyền
                      </span>
                    ) : (
                      <span className="font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Chỉ Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Switcher for Testing Roles */}
                {onSwitchUser && allMembers.length > 1 && (
                  <div className="pt-2.5 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Đổi vai trò để thử nghiệm phân quyền:
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {allMembers.map((m) => {
                        const isCurrent = m.id === currentUser.id;
                        const isThisMemberAdmin =
                          m.id === activeProject.adminId ||
                          m.isAdmin === true ||
                          m.role?.includes('Trưởng nhóm') ||
                          m.role?.includes('Quản trị viên');

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSwitchUser(m);
                              setShowUserMenu(false);
                            }}
                            className={`w-full flex items-center justify-between p-1.5 rounded-xl text-left text-xs transition-colors ${
                              isCurrent
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-700 dark:text-indigo-300'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={m.avatar}
                                alt={m.name}
                                className="w-6 h-6 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <span className="block truncate text-[11px]">{m.name}</span>
                                <span className="block text-[9px] text-slate-400 truncate">
                                  {isThisMemberAdmin ? 'Quản trị viên' : 'Thành viên'}
                                </span>
                              </div>
                            </div>
                            {isCurrent && <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Row (Desktop & Tablet) */}
      <nav aria-label="Các mục làm việc" className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? `${theme.bgLight} ${theme.textLight} shadow-2xs`
                    : tab.isAi
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/50 dark:border-indigo-800/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? theme.subtleBadge
                        : tab.isAi
                        ? 'bg-indigo-200/80 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Smartphones < 768px) */}
      <nav
        aria-label="Điều hướng di động nhanh"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden flex items-center justify-around px-1 py-1.5 shadow-lg safe-bottom"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const mobileLabel =
            tab.id === 'overview'
              ? 'Tổng quan'
              : tab.id === 'tasks'
              ? 'Nhiệm vụ'
              : tab.id === 'slides'
              ? 'Tạo Slide'
              : tab.id === 'chat'
              ? 'Tin nhắn'
              : tab.id === 'documents'
              ? 'Tài liệu'
              : 'UP AI';

          return (
            <button
              key={tab.id}
              id={`tab-mobile-nav-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] font-bold transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
                isActive
                  ? `${theme.textLight} bg-indigo-50/80 dark:bg-indigo-950/60 font-black shadow-2xs`
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <div className={`w-5 h-5 flex items-center justify-center mb-0.5 ${isActive ? 'scale-110' : ''} transition-transform relative`}>
                {tab.icon}
                {tab.id === 'chat' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span className="truncate max-w-[58px] text-[10px]">{mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
