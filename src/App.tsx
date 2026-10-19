import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { VoiceRoomBar } from './components/VoiceRoomBar';
import { DashboardView } from './components/DashboardView';
import { TaskBoardView } from './components/TaskBoardView';
import { PresentationEditor } from './components/PresentationEditor';
import { ChatView } from './components/ChatView';
import { DocumentsView } from './components/DocumentsView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { UpAiView } from './components/UpAiView';
import { AddMemberModal } from './components/AddMemberModal';
import { JoinTeamModal } from './components/JoinTeamModal';
import { DeviceToast } from './components/DeviceToast';
import {
  INITIAL_PROJECTS,
  CURRENT_USER,
  INITIAL_TASKS,
  INITIAL_MESSAGES,
  INITIAL_DOCUMENTS,
  INITIAL_SLIDES,
  INITIAL_NOTIFICATIONS,
} from './data/mockData';
import { THEMES, createPastelTheme, applyThemeCssVariables } from './utils/theme';
import {
  ActiveTab,
  ThemeColor,
  Project,
  Member,
  Task,
  TaskStatus,
  ChatMessage,
  DocumentResource,
  SlideDeck,
  AppNotification,
  TeamInvitation,
} from './types';
import { sendDeviceNotification, requestDeviceNotificationPermission } from './utils/notificationService';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Theme & Dark mode: support 5 classic colors, 12 pastel presets, and custom pastel hex
  const [themeColor, setThemeColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('teamup_theme');
      if (savedTheme) return savedTheme;
      const saved = localStorage.getItem('teamup_theme_color');
      if (saved) return saved;
    }
    return 'pastel-mint';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_dark_mode');
      if (saved !== null) return saved === 'true';
    }
    // Default to clean Light Mode
    return false;
  });

  // App navigation & state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_projects');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved projects', e);
        }
      }
    }
    return INITIAL_PROJECTS;
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECTS[0].id);

  // Persist tasks in localStorage so assigned members and status are never lost
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_tasks');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved tasks', e);
        }
      }
    }
    return INITIAL_TASKS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_tasks', JSON.stringify(tasks));
      } catch (e) {
        console.error('Failed to save tasks to localStorage', e);
      }
    }
  }, [tasks]);

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  // Persist documents in localStorage so uploaded files are stored and displayed across sessions
  const [documents, setDocuments] = useState<DocumentResource[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_documents');
      if (saved) {
        try {
          const parsed: DocumentResource[] = JSON.parse(saved);
          const existingIds = new Set(parsed.map((d) => d.id));
          const missing = INITIAL_DOCUMENTS.filter((d) => !existingIds.has(d.id));
          return [...parsed, ...missing];
        } catch (e) {
          console.error('Failed to parse saved documents', e);
        }
      }
    }
    return INITIAL_DOCUMENTS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_documents', JSON.stringify(documents));
      } catch (e) {
        console.error('Failed to save documents to localStorage', e);
      }
    }
  }, [documents]);

  const [presentation, setPresentation] = useState<SlideDeck>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_presentation');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved presentation', e);
        }
      }
    }
    return INITIAL_SLIDES;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_presentation', JSON.stringify(presentation));
      } catch (e) {
        console.error('Failed to save presentation to localStorage', e);
      }
    }
  }, [presentation]);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Canva Style Email Invitation State
  const [invitationToJoin, setInvitationToJoin] = useState<TeamInvitation | null>(null);
  const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);

  // Check URL query parameters and pathname for invite link (proj_...?code=TU-...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const currentUrl = window.location.href;
      const searchParams = new URLSearchParams(window.location.search);
      const inviteToken = searchParams.get('invite');
      const codeParam = searchParams.get('code');
      const projectParam = searchParams.get('project');

      // 1. Email token invite (?invite=token)
      if (inviteToken) {
        fetch(`/api/invitations/${encodeURIComponent(inviteToken)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.invitation) {
              setInvitationToJoin(data.invitation);
              setIsJoinTeamModalOpen(true);
            }
          })
          .catch((err) => {
            console.error('Error fetching invitation details:', err);
          });
        return;
      }

      // 2. Direct unique link format: /invite/proj_...?code=TU-... or /proj_...?code=TU-... or ?project=proj_...&code=TU-...
      let detectedProjectId = projectParam || '';
      const pathMatch = window.location.pathname.match(/(?:invite\/)?(proj_[a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        detectedProjectId = pathMatch[1];
      }

      // Also check full URL or search string if user pasted proj_...?code=TU-...
      if (!detectedProjectId) {
        const fullMatch = currentUrl.match(/(proj_[a-zA-Z0-9_-]+)(?:\?code=(TU-[a-zA-Z0-9_-]+))?/);
        if (fullMatch) {
          detectedProjectId = fullMatch[1];
        }
      }

      if (detectedProjectId) {
        // Find if project already exists in user's projects or INITIAL_PROJECTS
        let targetProj = projects.find((p) => p.id === detectedProjectId) ||
                         INITIAL_PROJECTS.find((p) => p.id === detectedProjectId);

        if (!targetProj) {
          // If project not in local list, create it so user enters immediately
          targetProj = {
            id: detectedProjectId,
            name: `Nhóm Dự Án ${detectedProjectId.replace('proj_', '').toUpperCase()}`,
            description: 'Không gian làm việc nhóm qua liên kết mời',
            category: 'Báo cáo môn học',
            members: [CURRENT_USER],
            status: 'active',
            progress: 30,
            avatarColor: 'from-indigo-600 to-purple-600',
            deadline: '2026-10-30',
            adminId: 'usr_me',
          };
          setProjects((prev) => [targetProj!, ...prev]);
        }

        // Switch to project immediately
        setActiveProjectId(targetProj.id);

        // Ensure current user is in project members
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id === targetProj!.id) {
              if (p.members.some((m) => m.id === CURRENT_USER.id || m.email === CURRENT_USER.email)) {
                return p;
              }
              return {
                ...p,
                members: [...p.members, CURRENT_USER],
              };
            }
            return p;
          })
        );

        // Celebration feedback
        const joinTitle = '🎉 Tham gia nhóm thành công!';
        const joinBody = `Bạn đã gia nhập nhóm "${targetProj.name}" qua liên kết mời (Mã: ${codeParam || 'TU-2026'}).`;
        setActiveToast({
          id: `toast_join_${Date.now()}`,
          title: joinTitle,
          body: joinBody,
          type: 'member_add',
        });
        sendDeviceNotification({
          title: joinTitle,
          body: joinBody,
          type: 'member_add',
        });
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        // Clean up URL without reloading
        try {
          window.history.replaceState({}, document.title, window.location.origin);
        } catch {}
      }
    } catch (e) {
      console.warn('Could not parse invite param from URL', e);
    }
  }, []);

  // New project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<Project['category']>('Báo cáo môn học');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const activeTheme = useMemo(() => {
    if (THEMES[themeColor]) return THEMES[themeColor];
    if (themeColor.startsWith('#')) {
      return createPastelTheme(themeColor, 'Pastel Tùy Chọn');
    }
    return THEMES['pastel-mint'] || THEMES.indigo;
  }, [themeColor]);
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  // Sync dark class on document element & persist
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('teamup_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('teamup_dark_mode', 'false');
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem('teamup_theme', themeColor);
      localStorage.setItem('teamup_theme_color', themeColor);
      applyThemeCssVariables(activeTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage', e);
    }
  }, [themeColor, activeTheme]);

  // Save projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('teamup_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  const [currentUser, setCurrentUser] = useState<Member>(CURRENT_USER);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_notifications');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse notifications', e);
        }
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [activeToast, setActiveToast] = useState<{
    id: string;
    title: string;
    body: string;
    type?: 'urgent' | 'member_add' | 'member_remove' | 'deadline' | 'info';
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('teamup_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }, [notifications]);

  // Member operations
  const handleAddMember = (projectId: string, newMember: Member) => {
    const targetProj = projects.find((p) => p.id === projectId);
    const projName = targetProj ? targetProj.name : 'nhóm';

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          if (p.members.some((m) => m.id === newMember.id || (newMember.email && m.email && m.email === newMember.email))) {
            return p;
          }
          return {
            ...p,
            members: [...p.members, newMember],
          };
        }
        return p;
      })
    );

    // Gửi thông báo quan trọng trực tiếp về máy cho các thành viên
    const notifTitle = '👥 Thành viên mới gia nhập nhóm';
    const notifBody = `"${newMember.name}" (${newMember.role}) vừa tham gia nhóm "${projName}".`;
    sendDeviceNotification({
      title: notifTitle,
      body: notifBody,
      type: 'member_add',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: notifTitle,
      body: notifBody,
      timestamp: 'Vừa xong',
      read: false,
      type: 'member_add',
      projectId,
      projectName: projName,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title: notifTitle,
      body: notifBody,
      type: 'member_add',
    });
  };

  const handleRemoveMember = (projectId: string, memberId: string) => {
    const targetProj = projects.find((p) => p.id === projectId);
    if (!targetProj) return;

    // Enforce RBAC: Chỉ Quản trị viên mới có quyền xóa thành viên!
    const isUserAdmin = Boolean(
      currentUser && (
        targetProj.adminId === currentUser.id ||
        currentUser.isAdmin === true ||
        currentUser.role?.includes('Trưởng nhóm') ||
        currentUser.role?.includes('Quản trị viên')
      )
    );

    if (!isUserAdmin) {
      const blockedTitle = '⛔ Không thể thực hiện';
      const blockedBody = 'Chỉ Quản trị viên nhóm mới có quyền xóa thành viên khỏi nhóm.';
      setActiveToast({
        id: `toast_err_${Date.now()}`,
        title: blockedTitle,
        body: blockedBody,
        type: 'urgent',
      });
      return;
    }

    const removedMember = targetProj.members.find((m) => m.id === memberId);
    const removedName = removedMember ? removedMember.name : 'thành viên';

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            members: p.members.filter((m) => m.id !== memberId),
          };
        }
        return p;
      })
    );

    // Gửi thông báo quan trọng trực tiếp về máy cho các thành viên
    const notifTitle = '⚠️ Thành viên bị xóa khỏi nhóm';
    const notifBody = `Quản trị viên đã loại "${removedName}" khỏi nhóm "${targetProj.name}".`;
    sendDeviceNotification({
      title: notifTitle,
      body: notifBody,
      type: 'member_remove',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: notifTitle,
      body: notifBody,
      timestamp: 'Vừa xong',
      read: false,
      type: 'member_remove',
      projectId,
      projectName: targetProj.name,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title: notifTitle,
      body: notifBody,
      type: 'member_remove',
    });
  };

  // Canva Style Email Invitation Accept Handler
  const handleAcceptInvitation = async (
    invitation: TeamInvitation,
    userInfo: { name: string; email: string; avatar: string; role: string }
  ) => {
    try {
      // 1. Call server to update database record to 'accepted'
      const res = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || `user_${Date.now()}`,
          name: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.avatar,
          role: userInfo.role,
        }),
      });
      const data = await res.json();
      console.log('Accepted invitation response:', data);

      const newMember: Member = {
        id: `mem_${Date.now()}`,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar,
        role: userInfo.role,
        isOnline: true,
        statusText: 'Đã tham gia nhóm qua email mời',
      };

      // 2. Update currentUser session in-app
      setCurrentUser((prev) => ({
        ...prev,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar,
        role: userInfo.role,
      }));

      // 3. Add to projects or create the project if not yet in user's state
      setProjects((prev) => {
        const existing = prev.find((p) => p.id === invitation.projectId);
        if (existing) {
          return prev.map((p) => {
            if (p.id === invitation.projectId) {
              const alreadyMember = p.members.some(
                (m) =>
                  m.email.toLowerCase() === userInfo.email.toLowerCase() ||
                  m.name === userInfo.name
              );
              if (alreadyMember) return p;
              return {
                ...p,
                members: [...p.members, newMember],
              };
            }
            return p;
          });
        } else {
          const newProject: Project = {
            id: invitation.projectId,
            name: invitation.projectName,
            description: `Không gian làm việc nhóm ${invitation.projectName}`,
            category: (invitation.projectCategory as any) || 'Học tập',
            members: [
              {
                id: 'mem_inviter',
                name: invitation.inviterName,
                email: invitation.inviterEmail || 'truongnhom@teamup.workspace',
                role: 'Trưởng nhóm / Quản trị viên',
                avatar:
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                isOnline: true,
                isAdmin: true,
              },
              newMember,
            ],
            status: 'active',
            progress: 20,
            avatarColor: 'from-indigo-500 to-purple-600',
            deadline: '2026-06-30',
          };
          return [newProject, ...prev];
        }
      });

      // 4. Switch view to that project
      setActiveProjectId(invitation.projectId);

      // 5. Native OS & In-App Notification
      const toastTitle = '🎉 Tham gia nhóm thành công!';
      const toastBody = `Chào mừng bạn đã gia nhập nhóm "${invitation.projectName}" với vai trò ${userInfo.role}.`;
      sendDeviceNotification({
        title: toastTitle,
        body: toastBody,
        type: 'member_add',
      });
      setActiveToast({
        id: `toast_joined_${Date.now()}`,
        title: toastTitle,
        body: toastBody,
        type: 'member_add',
      });

      // 6. Clean up URL ?invite=... parameter without page reload
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {
        console.warn('Could not replace URL state', e);
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  const handleSendBroadcastNotification = (title: string, body: string) => {
    sendDeviceNotification({
      title,
      body,
      type: 'urgent',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title,
      body,
      timestamp: 'Vừa xong',
      read: false,
      type: 'urgent',
      projectId: activeProject.id,
      projectName: activeProject.name,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title,
      body,
      type: 'urgent',
    });
  };

  // Task operations
  const handleAddTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: `task_${Date.now()}`,
    };
    setTasks((prev) => [task, ...prev]);
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Chat message operations
  const handleSendMessage = (newMsg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const msg: ChatMessage = {
      ...newMsg,
      id: `msg_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, msg]);
  };

  // Document operations
  const handleAddDocument = (newDoc: DocumentResource | Omit<DocumentResource, 'id'>) => {
    const doc: DocumentResource = 'id' in newDoc && newDoc.id ? (newDoc as DocumentResource) : {
      ...newDoc,
      id: `doc_${Date.now()}`,
    };
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSaveSlideToDocuments = (slideDoc: DocumentResource) => {
    // 1. Tự động thêm file .ppt vào danh sách tài liệu ở Kho Lưu Trữ ngay lập tức
    setDocuments((prev) => [slideDoc, ...prev]);

    // 2. Thông báo đã lưu vào Kho Lưu Trữ
    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      projectId: activeProject.id,
      projectName: activeProject.name,
      title: 'Đã lưu vào Kho Lưu Trữ',
      body: `Bản trình chiếu "${slideDoc.name}" (${slideDoc.size}) đã được lưu tự động vào Kho Lưu Trữ tài liệu nhóm.`,
      timestamp: 'Vừa xong',
      type: 'system',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: newProjectName.trim(),
      category: newProjectCategory,
      description: newProjectDesc.trim() || 'Không gian làm việc nhóm TEAM UP mới.',
      adminId: currentUser.id, // Người tạo là Quản trị viên nhóm
      members: [{ ...currentUser, isAdmin: true, role: 'Trưởng nhóm / Quản trị viên' }],
      status: 'active',
      progress: 0,
      avatarColor: 'from-purple-600 to-indigo-600',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsNewProjectModalOpen(false);

    // Gửi thông báo trực tiếp về máy
    const notifTitle = `🎉 Đã tạo nhóm "${newProj.name}"`;
    const notifBody = `Bạn là Quản trị viên nhóm. Bạn có toàn quyền xóa thành viên, các thành viên còn lại có quyền thêm thành viên.`;
    sendDeviceNotification({
      title: notifTitle,
      body: notifBody,
      type: 'urgent',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: notifTitle,
      body: notifBody,
      timestamp: 'Vừa xong',
      read: false,
      type: 'urgent',
      projectId: newProj.id,
      projectName: newProj.name,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title: notifTitle,
      body: notifBody,
      type: 'urgent',
    });
  };

  return (
    <div
      className="min-h-screen dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200"
      style={{
        backgroundColor: isDark ? undefined : 'color-mix(in srgb, var(--bg-color) 18%, #f8fafc)',
      }}
    >
      {/* Top Main Navigation Header */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProjectId(p.id)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={activeTheme}
        onThemeColorChange={setThemeColor}
        isDarkMode={isDark}
        onToggleDarkMode={() => setIsDark(!isDark)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
        currentUser={currentUser}
        notifications={notifications}
        onMarkAllNotificationsAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearNotifications={() => setNotifications([])}
        onSendBroadcastNotification={handleSendBroadcastNotification}
        onSwitchUser={setCurrentUser}
        allMembers={activeProject.members}
      />

      {/* Voice Room Control Bar (Microphone & Live Audio Room) */}
      <VoiceRoomBar
        members={activeProject.members}
        theme={activeTheme}
        projectName={activeProject.name}
        onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
      />

      {/* Main Content Area (with bottom padding on mobile for sticky bottom nav) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {activeTab === 'overview' && (
          <DashboardView
            project={activeProject}
            allProjects={projects}
            onSelectProject={(p) => setActiveProjectId(p.id)}
            tasks={tasks}
            slideDeck={presentation}
            onNavigateTab={setActiveTab}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
            theme={activeTheme}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskBoardView
            project={activeProject}
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onDeleteTask={handleDeleteTask}
            theme={activeTheme}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
          />
        )}

        {activeTab === 'slides' && (
          <PresentationEditor
            deck={presentation}
            onUpdateDeck={setPresentation}
            theme={activeTheme}
            projectName={activeProject.name}
            onSaveToDocuments={handleSaveSlideToDocuments}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            project={activeProject}
            currentUser={currentUser}
            messages={messages}
            onSendMessage={handleSendMessage}
            theme={activeTheme}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsView
            project={activeProject}
            documents={documents}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            theme={activeTheme}
          />
        )}

        {activeTab === 'up_ai' && (
          <UpAiView
            project={activeProject}
            documents={documents}
            theme={activeTheme}
            onNavigateTab={setActiveTab}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onApplyAiSlides={(newSlides) => {
              setPresentation((prev) => ({
                ...prev,
                slides: [...prev.slides, ...newSlides],
                lastModified: 'Vừa xong',
              }));
              setActiveTab('slides');
            }}
            onApplyAiTasks={(newTasks) => {
              setTasks((prev) => [...newTasks, ...prev]);
              setActiveTab('tasks');
            }}
          />
        )}
      </main>

      {/* Global AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        project={activeProject}
        theme={activeTheme}
      />

      {/* Add / Manage Project Members Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        project={activeProject}
        onAddMember={(newMember) => handleAddMember(activeProject.id, newMember)}
        onRemoveMember={(memberId) => handleRemoveMember(activeProject.id, memberId)}
        theme={activeTheme}
        currentUser={currentUser}
      />

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tạo Nhóm / Dự Án Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên nhóm hoặc tên đề tài
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tiểu luận Kinh tế Lượng - Nhóm 4"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lĩnh vực / Học phần
                </label>
                <select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Báo cáo môn học">Báo cáo môn học & Thuyết trình</option>
                  <option value="Dự án nghiên cứu">Dự án nghiên cứu khoa học sinh viên</option>
                  <option value="Khởi nghiệp">Khởi nghiệp & Kinh doanh</option>
                  <option value="Hoạt động CLB">Hoạt động ngoại khóa & CLB</option>
                  <option value="Học tập">Học tập & Ôn thi nhóm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả mục tiêu chung của nhóm
                </label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu bài báo cáo, phân công các phần và mốc thời gian bàn giao..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-create-project"
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold rounded-xl ${activeTheme.primary} shadow-sm`}
                >
                  Tạo Không Gian Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Canva Style Join Team Modal for Email Invitees */}
      <JoinTeamModal
        isOpen={isJoinTeamModalOpen}
        onClose={() => setIsJoinTeamModalOpen(false)}
        invitation={invitationToJoin}
        onAccept={handleAcceptInvitation}
        theme={activeTheme}
        currentUser={currentUser}
      />

      {/* Floating Device Toast for native in-app & OS notification feedback */}
      <DeviceToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
      />
    </div>
  );
}
