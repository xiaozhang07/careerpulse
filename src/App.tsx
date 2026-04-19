/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  ChevronRight,
  TrendingUp,
  X,
  FileText,
  MapPin,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  Users,
  Layers,
  Check,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  User,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Camera,
  Bell,
  BrainCircuit,
  History,
  MessageSquare,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Application, 
  ApplicationStatus, 
  STATUS_CONFIG, 
  InterviewRound, 
  UserProfile, 
  QUOTES, 
  THEME_COLORS,
  AppNotification,
  InterviewAssistantData 
} from './types';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';

//const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

// Mock initial data
const INITIAL_APPLICATIONS: Application[] = [
  {
    id: '1',
    company: 'Google',
    role: 'Software Engineer Intern',
    status: 'Applied',
    deadline: '2026-05-15',
    appliedDate: '2026-04-10',
    jobDescriptionImages: [],
    interviewRounds: [],
    materials: [
      { name: '简历', submitted: true },
      { name: '成绩单', submitted: true },
    ],
    notes: '面试可能涉及算法和系统设计。',
    priority: 'High',
    hasAssessment: false,
    hasOnlineTest: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    company: 'ByteDance',
    role: 'Product Manager Intern',
    status: 'Interview',
    deadline: '2026-04-25',
    appliedDate: '2026-03-20',
    jobDescriptionImages: [],
    interviewRounds: [
      { id: '1', name: '一面', date: '2026-04-15', link: '', status: 'Passed' }
    ],
    materials: [
      { name: '简历', submitted: true },
    ],
    notes: '二面在4月20日下周二。',
    priority: 'Medium',
    hasAssessment: false,
    hasOnlineTest: false,
    lastUpdated: new Date().toISOString(),
  },
];

export default function App() {
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('career_pulse_applications');
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'interview'>('details');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('career_pulse_profile');
    return saved ? JSON.parse(saved) : { nickname: '求职者', themeColor: '#4f46e5' };
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantAppId, setAssistantAppId] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    localStorage.setItem('career_pulse_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('career_pulse_applications', JSON.stringify(applications));
  }, [applications]);

  // Interview & Assessment Notification System
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const newNotifications: AppNotification[] = [];
      
      applications.forEach(app => {
        // Check Interview Rounds
        app.interviewRounds.forEach(round => {
          if (!round.date) return;
          const interviewDate = new Date(round.date);
          const diffMs = interviewDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          
          if (diffHours > 23 && diffHours < 24) {
             const id = `24h-int-${app.id}-${round.id}`;
             if (!userProfile.notifications?.find(n => n.id === id)) {
                newNotifications.push({
                   id,
                   title: '面试提醒 (24h)',
                   content: `您在 ${app.company} 的 ${round.name} 将于约 24 小时后（${round.date}）开始。`,
                   timestamp: new Date().toISOString(),
                   isRead: false,
                   type: 'interview_reminder'
                });
             }
          }
          
          if (diffHours > 1.5 && diffHours < 2) {
             const id = `2h-int-${app.id}-${round.id}`;
             if (!userProfile.notifications?.find(n => n.id === id)) {
                newNotifications.push({
                   id,
                   title: '面试提醒 (2h)',
                   content: `您在 ${app.company} 的 ${round.name} 将于约 2 小时后（${round.date}）开始。请检查网络和设备！`,
                   timestamp: new Date().toISOString(),
                   isRead: false,
                   type: 'interview_reminder'
                });
             }
          }
        });

        // Check Assessments
        if (app.hasAssessment && !app.assessmentCompleted && app.assessmentDeadline) {
          const deadlineDate = new Date(app.assessmentDeadline);
          const diffMs = deadlineDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours > 23 && diffHours < 24) {
            const id = `24h-ass-${app.id}`;
            if (!userProfile.notifications?.find(n => n.id === id)) {
               newNotifications.push({
                  id,
                  title: '测评截止提醒 (24h)',
                  content: `您在 ${app.company} 的测评将于 24 小时后截止（${app.assessmentDeadline}）。`,
                  timestamp: new Date().toISOString(),
                  isRead: false,
                  type: 'interview_reminder'
               });
            }
          }

          if (diffHours > 1.5 && diffHours < 2) {
            const id = `2h-ass-${app.id}`;
            if (!userProfile.notifications?.find(n => n.id === id)) {
               newNotifications.push({
                  id,
                  title: '测评截止提醒 (2h)',
                  content: `您在 ${app.company} 的测评将于 2 小时内截止，请尽快完成！`,
                  timestamp: new Date().toISOString(),
                  isRead: false,
                  type: 'interview_reminder'
               });
            }
          }
        }

        // Check Online Tests
        if (app.hasOnlineTest && !app.onlineTestCompleted && app.onlineTestDeadline) {
          const deadlineDate = new Date(app.onlineTestDeadline);
          const diffMs = deadlineDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours > 23 && diffHours < 24) {
            const id = `24h-ot-${app.id}`;
            if (!userProfile.notifications?.find(n => n.id === id)) {
               newNotifications.push({
                  id,
                  title: '笔试截止提醒 (24h)',
                  content: `您在 ${app.company} 的笔试将于 24 小时后截止（${app.onlineTestDeadline}）。`,
                  timestamp: new Date().toISOString(),
                  isRead: false,
                  type: 'interview_reminder'
               });
            }
          }

          if (diffHours > 1.5 && diffHours < 2) {
            const id = `2h-ot-${app.id}`;
            if (!userProfile.notifications?.find(n => n.id === id)) {
               newNotifications.push({
                  id,
                  title: '笔试截止提醒 (2h)',
                  content: `您在 ${app.company} 的笔试将于 2 小时内截止，请尽快参加！`,
                  timestamp: new Date().toISOString(),
                  isRead: false,
                  type: 'interview_reminder'
               });
            }
          }
        }
      });
      
      if (newNotifications.length > 0) {
        setUserProfile(p => ({
          ...p,
          notifications: [...(p.notifications || []), ...newNotifications]
        }));
      }
    };
    
    checkReminders();
    const timer = setInterval(checkReminders, 1000 * 60 * 30); // Check every 30 mins
    return () => clearInterval(timer);
  }, [applications, userProfile?.notifications]);

  const refreshQuote = () => {
    setQuoteIndex(prev => {
      let next = Math.floor(Math.random() * QUOTES.length);
      while (next === prev && QUOTES.length > 1) {
        next = Math.floor(Math.random() * QUOTES.length);
      }
      return next;
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUserProfile(p => ({
          ...p,
          avatarUrl: ev.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUserProfile(p => ({
          ...p,
          resumeName: file.name,
          resumeUrl: ev.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateInterviewAssistant = (appId: string, data: Partial<InterviewAssistantData>) => {
    setApplications(prev => prev.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          interviewAssistant: {
            logs: [],
            ...app.interviewAssistant,
            ...data
          }
        };
      }
      return app;
    }));
  };

   const predictInterviewQuestions = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    setIsPredicting(true);
    try {
      const prompt = `你是一个顶级面试教练。请根据以下岗位JD和求职者的背景，进行深度的面试预测。
      
      岗位公司: ${app.company}
      岗位名称: ${app.role}
      岗位JD: ${app.jdText || '暂无详细JD'}
      
      请预测 5-8 个核心考察点或问题，并为每个问题提供：
      1. 提问意图
      2. 建议回答思路
      3. 可能的追问
      
      请运用 Markdown 格式输出。`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      updateInterviewAssistant(appId, { predictions: response.text });
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleTotalRoundsChange = (val: number) => {
    setFormData(p => ({ ...p, totalRounds: val }));
    setDraftRounds(prev => {
      const next = [...prev];
      if (val > next.length) {
        for (let i = next.length; i < val; i++) {
          next.push({
            id: Math.random().toString(36).substr(2, 9),
            name: i === 0 ? '一面' : i === 1 ? '二面' : i === 2 ? '三面' : `${i + 1}面`,
            date: '',
            link: '',
            status: 'Pending'
          });
        }
      } else if (val < next.length) {
        return next.slice(0, val);
      }
      return next;
    });
  };

  const updateRound = (index: number, field: string, value: any) => {
    setDraftRounds(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  
  // Form field state
  const [formData, setFormData] = useState<Partial<Application>>({});
  const [draftMaterials, setDraftMaterials] = useState<Application['materials']>([]);
  const [draftRounds, setDraftRounds] = useState<InterviewRound[]>([]);
  const [draftImages, setDraftImages] = useState<string[]>([]);

  useEffect(() => {
    if (isModalOpen) {
      setDraftMaterials(selectedApp?.materials || []);
      setDraftRounds(selectedApp?.interviewRounds || []);
      setDraftImages(selectedApp?.jobDescriptionImages || []);
      setFormData({
        company: selectedApp?.company || '',
        department: selectedApp?.department || '',
        subDepartment: selectedApp?.subDepartment || '',
        role: selectedApp?.role || '',
        status: selectedApp?.status || 'Wishlist',
        deadline: selectedApp?.deadline || '',
        openDate: selectedApp?.openDate || '',
        appliedDate: selectedApp?.appliedDate || new Date().toISOString().split('T')[0],
        link: selectedApp?.link || '',
        baseLocation: selectedApp?.baseLocation || '',
        jdText: selectedApp?.jdText || '',
        priority: selectedApp?.priority || 'Medium',
        notes: selectedApp?.notes || '',
        hasAssessment: selectedApp?.hasAssessment || false,
        assessmentDeadline: selectedApp?.assessmentDeadline || '',
        assessmentLink: selectedApp?.assessmentLink || '',
        hasOnlineTest: selectedApp?.hasOnlineTest || false,
        onlineTestDeadline: selectedApp?.onlineTestDeadline || '',
        onlineTestLink: selectedApp?.onlineTestLink || '',
        totalRounds: selectedApp?.totalRounds || 0,
      });
      setActiveTab('details');
    }
  }, [isModalOpen, selectedApp]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    const isUpcoming = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= now && d <= threeDaysLater;
    };

    return {
      total: applications.length,
      upcoming: applications.filter(a => 
        isUpcoming(a.deadline) || 
        isUpcoming(a.assessmentDeadline) || 
        isUpcoming(a.onlineTestDeadline)
      ).length,
      interviews: applications.filter(a => a.status === 'Interview').length,
      offers: applications.filter(a => a.status === 'Offer').length,
      interviewRate: applications.length > 0 ? (applications.filter(a => ['Interview', 'Offer', 'Rejected'].includes(a.status) && a.interviewRounds.length > 0).length / applications.length * 100).toFixed(1) : '0',
      round1PassRate: applications.filter(a => a.interviewRounds[0]?.status === 'Passed').length > 0 ? (applications.filter(a => a.interviewRounds[0]?.status === 'Passed').length / applications.filter(a => a.interviewRounds[0]).length * 100).toFixed(1) : '0',
      round2PassRate: applications.filter(a => a.interviewRounds[1]?.status === 'Passed').length > 0 ? (applications.filter(a => a.interviewRounds[1]?.status === 'Passed').length / applications.filter(a => a.interviewRounds[1]).length * 100).toFixed(1) : '0',
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => 
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [applications, searchTerm]);

  const groupedApplications = useMemo(() => {
    const groups: Record<ApplicationStatus, Application[]> = {
      Wishlist: [],
      UnderEvaluation: [],
      Applied: [],
      Interview: [],
      Offer: [],
      Rejected: [],
    };
    filteredApplications.forEach(app => {
      groups[app.status].push(app);
    });
    return groups;
  }, [filteredApplications]);

  const addOrUpdateApplication = () => {
    if (!formData.company?.trim() || !formData.role?.trim() || !formData.status) {
      alert('请填写必填项（公司名称、岗位名称、流程进度）');
      return;
    }

    if (selectedApp?.id) {
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? { 
        ...a, 
        ...formData, 
        materials: draftMaterials,
        interviewRounds: draftRounds,
        jobDescriptionImages: draftImages,
        lastUpdated: new Date().toISOString() 
      } as Application : a));
    } else {
      const newApp: Application = {
        id: Math.random().toString(36).substr(2, 9),
        company: formData.company || '未知公司',
        department: formData.department,
        subDepartment: formData.subDepartment,
        role: formData.role || '职位待定',
        status: formData.status as ApplicationStatus || 'Wishlist',
        deadline: formData.deadline || '',
        openDate: formData.openDate,
        appliedDate: formData.appliedDate,
        link: formData.link,
        baseLocation: formData.baseLocation,
        jdText: formData.jdText,
        jobDescriptionImages: draftImages,
        materials: draftMaterials,
        totalRounds: formData.totalRounds || 0,
        interviewRounds: draftRounds,
        notes: formData.notes || '',
        priority: formData.priority as 'Low' | 'Medium' | 'High' || 'Medium',
        hasAssessment: formData.hasAssessment,
        assessmentDeadline: formData.assessmentDeadline,
        assessmentLink: formData.assessmentLink,
        hasOnlineTest: formData.hasOnlineTest,
        onlineTestDeadline: formData.onlineTestDeadline,
        onlineTestLink: formData.onlineTestLink,
        lastUpdated: new Date().toISOString(),
      };
      setApplications(prev => [...prev, newApp]);
    }
    setIsModalOpen(false);
    setSelectedApp(null);
  };

  const smartExtract = async (imageData: string) => {
    setIsExtracting(true);
    try {
      // Extract actual mime type from data URL
      const mimeTypeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = imageData.split(',')[1];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: "请核对这张招聘JD图片，提取以下信息并以JSON格式返回：公司名(company)、集团/事业群(department)、部门名(subDepartment)、职位名(role)、工作地点(baseLocation)、开始投递日期(openDate, YYYY-MM-DD)、截止日期(deadline, YYYY-MM-DD)、岗位详情描述(jdText)。岗位详情描述请尽可能保留原来职位的职责和要求，并使用换行符进行清晰的分条列点整理。如果不确定，请返回空字符串。" },
            { inlineData: { mimeType, data: base64Data } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              department: { type: Type.STRING },
              subDepartment: { type: Type.STRING },
              role: { type: Type.STRING },
              baseLocation: { type: Type.STRING },
              openDate: { type: Type.STRING },
              deadline: { type: Type.STRING },
              jdText: { type: Type.STRING },
            }
          }
        }
      });

      // Simple cleanup for potential markdown wrapping if somehow bypasses responseMimeType
      let text = response.text?.trim() || "{}";
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const extracted = JSON.parse(text);
      if (extracted) {
        setFormData(prev => ({
          ...prev,
          company: extracted.company || prev.company,
          department: extracted.department || prev.department,
          subDepartment: extracted.subDepartment || prev.subDepartment,
          role: extracted.role || prev.role,
          baseLocation: extracted.baseLocation || prev.baseLocation,
          openDate: extracted.openDate || prev.openDate,
          deadline: extracted.deadline || prev.deadline,
          jdText: extracted.jdText || prev.jdText,
        }));
      }
    } catch (error) {
      console.error("Extraction failed", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setDraftImages(prev => [...prev, base64]);
        smartExtract(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
       if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              setDraftImages(prev => [...prev, base64]);
              smartExtract(base64);
            };
            reader.readAsDataURL(blob);
          }
       }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping into a column or over another card
    const overStatus = (Object.keys(STATUS_CONFIG).includes(overId) ? overId : applications.find(a => a.id === overId)?.status) as ApplicationStatus;
    
    if (overStatus) {
      setApplications(prev => prev.map(app => {
        if (app.id === activeId) {
          return { ...app, status: overStatus, lastUpdated: new Date().toISOString() };
        }
        return app;
      }));
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div 
      className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans tracking-tight" 
      onPaste={isModalOpen ? handlePaste : undefined}
      style={{ 
        '--brand-color': userProfile.themeColor || '#4f46e5',
        '--brand-color-soft': `${userProfile.themeColor || '#4f46e5'}1a`
      } as any}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-4 lg:gap-8 overflow-hidden">
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-brand p-2 rounded-xl text-white shadow-lg shadow-indigo-200" style={{ backgroundColor: 'var(--brand-color)' }}>
                <TrendingUp size={20} />
              </div>
              <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, var(--brand-color), #4f46e5)` }}>
                CareerPulse
              </h1>
            </div>

            {/* In-Nav Quote */}
            <div 
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all max-w-sm"
              onClick={refreshQuote}
            >
              <Sparkles size={14} className="text-brand shrink-0" style={{ color: 'var(--brand-color)' }} />
              <motion.span 
                key={quoteIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-bold text-slate-500 italic truncate"
              >
                {QUOTES[quoteIndex]}
              </motion.span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="搜索公司或岗位..." 
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-2xl text-sm w-40 lg:w-64 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              onClick={() => { setSelectedApp(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-brand hover:opacity-90 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-100 active:scale-95"
              style={{ backgroundColor: 'var(--brand-color)' }}
            >
              <Plus size={18} />
              <span className="hidden xs:inline">新增申请</span>
            </button>

            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 p-1 pr-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all active:scale-95 group"
              title="个人中心"
            >
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-brand shadow-sm overflow-hidden border-2 border-transparent group-hover:border-indigo-400" style={{ color: 'var(--brand-color)' }}>
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={18} />
                )}
              </div>
              <span className="text-xs font-black uppercase tracking-tight text-slate-500">{userProfile.nickname}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Modern Stats Section */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            { label: '总申请数', value: stats.total, icon: Briefcase, color: 'text-brand', bg: 'bg-brand-soft', style: { color: 'var(--brand-color)', backgroundColor: 'var(--brand-color-soft)' } },
            { label: '即将截止（3天内）', value: stats.upcoming, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: '面试安排', value: stats.interviews, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: '录用意向', value: stats.offers, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`} style={stat.style}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-4xl font-black mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Interview Conversion Analysis */}
        <section className="mb-6">
          <div className="bg-white rounded-[24px] p-5 md:p-6 border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
              <BarChart3 size={120} className="text-indigo-600" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp size={14} />
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">面试转化分析</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: '总进面率', value: stats.interviewRate, desc: '简历投递 -> 面试', color: 'indigo' },
                { label: '一面通过率', value: stats.round1PassRate, desc: '初试 -> 复试', color: 'blue' },
                { label: '二面通过率', value: stats.round2PassRate, desc: '复试 -> 后续', color: 'emerald' },
              ].map((rate, i) => (
                <div key={rate.label} className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{rate.label}</p>
                      <p className={`text-2xl font-black text-${rate.color}-600 tracking-tighter`}>{rate.value}<span className="text-sm opacity-40 ml-0.5">%</span></p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${rate.value}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className={`h-full bg-${rate.color}-500 rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Board View */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            申请流程看板
            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Kanban</span>
          </h2>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm self-start"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            提示：可拖动卡片至不同阶段以更新进度
          </motion.div>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex lg:grid lg:grid-cols-6 gap-4 h-[calc(100vh-320px)] overflow-x-auto lg:overflow-hidden pb-4 custom-scrollbar">
            {(Object.keys(STATUS_CONFIG) as ApplicationStatus[]).map((status) => (
              <DroppableColumn key={status} id={status} status={status} count={groupedApplications[status].length}>
                <SortableContext 
                  items={groupedApplications[status].map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="popLayout">
                    {groupedApplications[status].map((app) => (
                      <SortableCard 
                        key={app.id} 
                        app={app} 
                        onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} 
                        onAssistantClick={(e) => {
                          e.stopPropagation();
                          setAssistantAppId(app.id);
                          setIsAssistantOpen(true);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
                
                {groupedApplications[status].length === 0 && (
                  <div className="border-2 border-dashed border-slate-100 rounded-3xl py-12 flex flex-col items-center justify-center text-slate-300">
                    <div className="bg-slate-50 p-4 rounded-2xl mb-4 opacity-40">
                      <FolderOpen size={32} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-40">暂无记录</p>
                  </div>
                )}
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      </main>

      {/* Enhanced Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-white to-slate-50">
                <div className="flex items-center gap-4">
                   <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100">
                      {selectedApp ? <Layers size={24} /> : <Plus size={24} />}
                   </div>
                   <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedApp ? '编辑申请' : '录入求职申请'}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                       <Check size={12} className="text-emerald-500" /> 支持图片粘贴识别, 自动填充表单
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(['Applied', 'UnderEvaluation', 'Interview', 'Offer'].includes(selectedApp?.status || '')) && (
                    <button 
                      onClick={() => {
                        setAssistantAppId(selectedApp.id);
                        setIsAssistantOpen(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      <BrainCircuit size={16} />
                      面试预测助手
                    </button>
                  )}
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 bg-white border border-slate-100 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Removing separate Tab Buttons as they are merged now */}
              <div className="flex px-10 border-b border-slate-50 bg-white">
                 <TabButton active={true} onClick={() => {}} icon={<Briefcase size={16}/>} label="申请资料" />
              </div>

              {/* Content Areas */}
              <div className="flex-1 overflow-y-auto px-10 py-8 space-y-10 custom-scrollbar bg-slate-50/30">
                <form id="app-form" onSubmit={(e) => {
                  e.preventDefault();
                  addOrUpdateApplication();
                }}>
                  <div className="space-y-10">
                    {/* Smart Extraction at the top */}
                    <div className="bg-indigo-600/5 p-8 rounded-[40px] border border-indigo-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 ${isExtracting ? 'animate-pulse' : ''}`}>
                             <Sparkles size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-indigo-900 uppercase italic">智慧录入引擎</h4>
                            <p className="text-[10px] font-bold text-indigo-400">粘贴截图自动解析</p>
                          </div>
                        </div>
                        <label className="cursor-pointer bg-white border border-indigo-100 hover:bg-slate-50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm">
                           上传 JD 图片
                           <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {draftImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                            {draftImages.map((img, i) => (
                              <div key={i} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-slate-100 bg-white">
                                <img src={img} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                   <button type="button" onClick={() => smartExtract(img)}><Sparkles size={16} /></button>
                                   <button type="button" onClick={() => setDraftImages(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <FormGroup label="公司名称" name="company" value={formData.company} onChange={(v: string) => setFormData(p => ({ ...p, company: v }))} required placeholder="例如: 字节跳动" />
                        <FormGroup label="集团/部门" name="department" value={formData.department} onChange={(v: string) => setFormData(p => ({ ...p, department: v }))} placeholder="例如: 抖音集团" />
                        <FormGroup label="部门名称" name="subDepartment" value={formData.subDepartment} onChange={(v: string) => setFormData(p => ({ ...p, subDepartment: v }))} placeholder="例如: 商业产品" />
                        <FormGroup label="岗位名称" name="role" value={formData.role} onChange={(v: string) => setFormData(p => ({ ...p, role: v }))} required placeholder="例如: 产品经理" />
                        <FormGroup label="Base地" name="baseLocation" value={formData.baseLocation} onChange={(v: string) => setFormData(p => ({ ...p, baseLocation: v }))} placeholder="例如: 北京/上海" />
                        <FormGroup label="投递链接" name="link" value={formData.link} onChange={(v: string) => setFormData(p => ({ ...p, link: v }))} placeholder="https://..." />
                      </div>

                      <FormGroup type="textarea" label="岗位JD" name="jdText" value={formData.jdText} onChange={(v: string) => setFormData(p => ({ ...p, jdText: v }))} placeholder="此处填写岗位详情..." rows={6} />

                      <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 ml-1">状态 <span className="text-rose-500">*</span></label>
                           <div className="relative">
                            <select 
                              name="status"
                              value={formData.status || 'Wishlist'}
                              onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as ApplicationStatus }))}
                              className="w-full px-6 py-4 rounded-[20px] border border-slate-100 bg-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none shadow-sm pr-12 cursor-pointer hover:bg-slate-50"
                            >
                              {(Object.keys(STATUS_CONFIG) as ApplicationStatus[]).map(status => (
                                <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                              ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>
                        <FormGroup type="date" label="截止日期" name="deadline" value={formData.deadline} onChange={(v: string) => setFormData(p => ({ ...p, deadline: v }))} />
                        <FormGroup type="date" label="投递日期" name="appliedDate" value={formData.appliedDate} onChange={(v: string) => setFormData(p => ({ ...p, appliedDate: v }))} />
                      </div>
                    </div>

                    <div className="bg-indigo-50/40 p-8 rounded-[40px] border border-indigo-100 space-y-6">
                      <h4 className="text-sm font-black text-indigo-900 uppercase italic">考核环节</h4>
                      <div className="space-y-4">
                        <div className="bg-white p-6 rounded-[32px] border border-indigo-50 shadow-sm space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer group">
                             <input type="checkbox" className="peer hidden" checked={formData.hasAssessment} onChange={(e) => setFormData(p => ({ ...p, hasAssessment: e.target.checked }))} />
                             <div className="w-5 h-5 border-2 border-indigo-200 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                               <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                             </div>
                             <span className="text-sm font-bold text-slate-700">有测评（性格测试、能力测评等）</span>
                          </label>
                          <AnimatePresence>
                            {formData.hasAssessment && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pl-8 space-y-4">
                                <div className="space-y-2 flex-1">
                                  <label className="text-[10px] font-black text-indigo-400 uppercase">测评截止日期</label>
                                  <input type="date" value={formData.assessmentDeadline} onChange={(e) => setFormData(p => ({ ...p, assessmentDeadline: e.target.value }))} className="w-full px-6 py-3 rounded-2xl border border-indigo-50 bg-slate-50/50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="flex items-center gap-3 px-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="peer hidden" checked={formData.assessmentCompleted} onChange={(e) => setFormData(p => ({ ...p, assessmentCompleted: e.target.checked }))} />
                                    <div className="w-4 h-4 border-2 border-indigo-200 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                      <Check size={10} className="text-white opacity-0 peer-checked:opacity-100" />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">已完成</span>
                                  </label>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-indigo-50 shadow-sm space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer group">
                             <input type="checkbox" className="peer hidden" checked={formData.hasOnlineTest} onChange={(e) => setFormData(p => ({ ...p, hasOnlineTest: e.target.checked }))} />
                             <div className="w-5 h-5 border-2 border-indigo-200 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                               <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                             </div>
                             <span className="text-sm font-bold text-slate-700">有笔试（技术笔试、算法题等）</span>
                          </label>
                          <AnimatePresence>
                            {formData.hasOnlineTest && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pl-8 flex flex-wrap gap-4 items-end">
                                <div className="space-y-2 flex-1">
                                  <label className="text-[10px] font-black text-indigo-400 uppercase">笔试截止日期</label>
                                  <input type="date" value={formData.onlineTestDeadline} onChange={(e) => setFormData(p => ({ ...p, onlineTestDeadline: e.target.value }))} className="w-full px-6 py-3 rounded-2xl border border-indigo-50 bg-slate-50/50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="flex items-center gap-3 px-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="peer hidden" checked={formData.onlineTestCompleted} onChange={(e) => setFormData(p => ({ ...p, onlineTestCompleted: e.target.checked }))} />
                                    <div className="w-4 h-4 border-2 border-indigo-200 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                      <Check size={10} className="text-white opacity-0 peer-checked:opacity-100" />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">已完成</span>
                                  </label>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50/40 p-8 rounded-[40px] border border-purple-100 space-y-8">
                       <div className="space-y-4">
                         <label className="text-sm font-black text-purple-900 uppercase italic">面试总轮数</label>
                         <div className="relative">
                            <select 
                              value={formData.totalRounds || 0}
                              onChange={(e) => handleTotalRoundsChange(Number(e.target.value))}
                              className="w-full px-6 py-4 rounded-[20px] border border-purple-100 bg-white font-bold text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none shadow-sm pr-12 cursor-pointer hover:bg-slate-50"
                            >
                              <option value={0}>尚未进入面试</option>
                              {[1,2,3,4,5,6].map(n => (
                                <option key={n} value={n}>{n} 轮</option>
                              ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
                               <ChevronDown size={14} />
                            </div>
                          </div>
                       </div>

                       <AnimatePresence>
                        {draftRounds.map((round, index) => (
                           <motion.div 
                            key={round.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-6 rounded-[32px] border border-purple-50 shadow-sm space-y-6"
                           >
                             <div className="flex items-center justify-between">
                               <input 
                                 className="text-sm font-black text-purple-900 bg-transparent border-none outline-none focus:ring-0 w-1/2" 
                                 value={round.name} 
                                 onChange={(e) => updateRound(index, 'name', e.target.value)}
                               />
                               <div className="flex items-center gap-4">
                                 <span className="text-[10px] font-black text-slate-400 uppercase">是否通过:</span>
                                 <div className="relative">
                                    <select 
                                      value={round.status}
                                      onChange={(e) => updateRound(index, 'status', e.target.value)}
                                      className="px-6 py-2 rounded-xl border border-slate-100 bg-slate-50 font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none appearance-none pr-10"
                                    >
                                      <option value="Pending">待反馈</option>
                                      <option value="Passed">通过</option>
                                      <option value="Failed">未通过</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                 </div>
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                               <input 
                                 type="datetime-local" 
                                 value={round.date}
                                 onChange={(e) => updateRound(index, 'date', e.target.value)}
                                 className="px-6 py-3 rounded-2xl border border-slate-50 bg-slate-50 font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                               />
                               <input 
                                 type="text" 
                                 placeholder="面试链接 (可选)"
                                 value={round.link}
                                 onChange={(e) => updateRound(index, 'link', e.target.value)}
                                 className="px-6 py-3 rounded-2xl border border-slate-50 bg-slate-50 font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                               />
                             </div>
                           </motion.div>
                        ))}
                       </AnimatePresence>
                    </div>

                    {/* Removed duplicated smart extract from bottom */}
                  </div>
                </form>
              </div>

               {/* Bottom Actions */}
              <div className="px-10 py-8 bg-white border-t border-slate-50 flex items-center justify-between shrink-0">
                <div>
                   {selectedApp && (
                      <DeleteButton 
                        onDelete={() => {
                          const appIdToRemove = selectedApp.id;
                          setApplications(prev => {
                            const next = prev.filter(a => a.id !== appIdToRemove);
                            localStorage.setItem('career_pulse_applications', JSON.stringify(next));
                            return next;
                          });
                          setIsModalOpen(false);
                          setSelectedApp(null);
                        }} 
                      />
                   )}
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3.5 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest"
                  >
                    取消
                  </button>
                    <button 
                      type="submit" 
                      form="app-form"
                      className="px-12 py-3.5 bg-brand hover:opacity-90 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95"
                      style={{ backgroundColor: 'var(--brand-color)' }}
                    >
                      {selectedApp ? '更新申请' : '保存申请'}
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onUpdate={setUserProfile}
        onUploadResume={handleResumeUpload}
        onUploadAvatar={handleAvatarUpload}
      />

      <InterviewAssistantModal 
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        app={applications.find(a => a.id === assistantAppId) || null}
        onUpdate={(data) => assistantAppId && updateInterviewAssistant(assistantAppId, data)}
        onPredict={() => assistantAppId && predictInterviewQuestions(assistantAppId)}
        isPredicting={isPredicting}
      />
    </div>
  );
}

function ProfileModal({ isOpen, onClose, profile, onUpdate, onUploadResume, onUploadAvatar }: { 
  isOpen: boolean, 
  onClose: () => void, 
  profile: UserProfile, 
  onUpdate: (u: UserProfile) => void,
  onUploadResume: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onUploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');
  
  if (!isOpen) return null;

  const markNotificationRead = (id: string) => {
    onUpdate({
      ...profile,
      notifications: profile.notifications?.map(n => n.id === id ? { ...n, isRead: true } : n)
    });
  };

  const unreadCount = profile.notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-br from-brand to-brand-soft px-10 py-12 text-white relative shrink-0" style={{ backgroundImage: `linear-gradient(to bottom right, var(--brand-color), #3730a3)` }}>
          <button onClick={onClose} className="absolute right-8 top-8 p-2 hover:bg-white/20 rounded-full transition-all">
            <X size={24} />
          </button>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center border-4 border-white/30 shadow-2xl overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={48} className="text-indigo-600" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-white text-indigo-600 rounded-xl shadow-lg cursor-pointer transform translate-x-1/4 translate-y-1/4 hover:scale-110 transition-all border border-indigo-100">
                <Camera size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={onUploadAvatar} />
              </label>
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter mb-1">个人信息中心</h2>
              <p className="text-indigo-100 font-bold text-sm tracking-widest uppercase italic">Personal Intelligence Hub</p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 shrink-0">
          <TabButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User size={16} />} 
            label="基本资料" 
          />
          <TabButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
            icon={
              <div className="relative">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                )}
              </div>
            } 
            label="消息列表" 
          />
        </div>

        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'profile' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">我的昵称</label>
                <input 
                  type="text" 
                  value={profile.nickname}
                  onChange={(e) => onUpdate({ ...profile, nickname: e.target.value })}
                  placeholder="请输入您的昵称..."
                  className="w-full px-8 py-5 rounded-[24px] border border-slate-100 bg-slate-50 font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">主页主题色</label>
                <div className="flex flex-wrap gap-3 p-1">
                  {THEME_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => onUpdate({ ...profile, themeColor: color.value })}
                      className={`w-10 h-10 rounded-full border-2 transition-all transform hover:scale-110 active:scale-90 ${
                        profile.themeColor === color.value 
                          ? 'border-slate-900 scale-110 shadow-lg' 
                          : 'border-transparent shadow-sm'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">简历管理</label>
                {profile.resumeUrl ? (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 border border-indigo-50">
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-700 text-sm italic truncate max-w-[180px]">{profile.resumeName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">已上传</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsPreviewOpen(true)}
                            className="p-3 bg-white text-brand rounded-xl hover:bg-brand hover:text-white transition-all shadow-sm"
                            style={{ color: 'var(--brand-color)' }}
                            title="在线预览"
                          >
                          <Eye size={18} />
                        </button>
                        <a 
                          href={profile.resumeUrl} 
                          download={profile.resumeName}
                          className="p-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="下载到本地"
                        >
                          <Download size={18} />
                        </a>
                        <label className="p-3 bg-white text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm cursor-pointer" title="重新上传">
                          <Upload size={18} />
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={onUploadResume} />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-100 bg-slate-50 rounded-[32px] p-10 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 bg-white rounded-[24px] shadow-sm flex items-center justify-center text-slate-200 border border-slate-50">
                      <Upload size={32} />
                    </div>
                    <div>
                      <label className="cursor-pointer group flex flex-col items-center">
                        <span className="px-8 py-3.5 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest group-hover:opacity-90 transition-all shadow-lg shadow-brand-soft" style={{ backgroundColor: 'var(--brand-color)' }}>
                          上传个人简历
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-4 italic">支持 PDF, DOC, DOCX 格式</span>
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={onUploadResume} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <div className="p-1 px-2.5 bg-amber-500 text-white rounded-lg text-[10px] font-black mt-0.5">TIP</div>
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">此列表将为您展示即将开始的面试、测评或笔试的倒计时提醒（提前 24h / 2h）。</p>
              </div>
              {profile.notifications && profile.notifications.length > 0 ? (
                [...profile.notifications].reverse().map(n => (
                  <NotificationItem 
                    key={n.id} 
                    notification={n} 
                    onRead={() => markNotificationRead(n.id)} 
                  />
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <Bell size={48} className="opacity-10" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">暂无任何消息</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-10 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
          >
            保存并返回
          </button>
        </div>

        {/* PDF Preview Portal */}
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-[60] bg-white flex flex-col"
            >
              <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-600" size={18} />
                  <span className="text-sm font-black text-slate-700 italic truncate max-w-[200px]">{profile.resumeName}</span>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 bg-slate-100 p-4">
                {profile.resumeUrl?.startsWith('data:application/pdf') ? (
                  <iframe 
                    src={profile.resumeUrl} 
                    className="w-full h-full rounded-2xl border border-slate-200 shadow-inner bg-white"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center max-w-sm">
                      <TrendingUp className="text-indigo-600 mb-4" size={32} />
                      <p className="font-bold text-slate-600 mb-2">简历预览说明</p>
                      <p className="text-xs leading-relaxed">目前仅支持 PDF 格式文件的在线预览。Word 文档建议下载后查看，或将其转换为 PDF 后上传以获得最佳体验。</p>
                      <a 
                        href={profile.resumeUrl} 
                        download={profile.resumeName}
                        className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100/50"
                      >
                        立即下载查看
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function InterviewAssistantModal({ isOpen, onClose, app, onUpdate, onPredict, isPredicting }: { 
  isOpen: boolean, 
  onClose: () => void, 
  app: Application | null, 
  onUpdate: (data: Partial<InterviewAssistantData>) => void,
  onPredict: () => void,
  isPredicting: boolean
}) {
  const [activeTab, setActiveTab] = useState<'predict' | 'logs' | 'retro'>('predict');
  const [newLog, setNewLog] = useState('');

  if (!app) return null;

  const data = app.interviewAssistant || { logs: [] };

  const handleAddLog = () => {
    if (!newLog.trim()) return;
    const log = { id: Math.random().toString(36).substr(2, 9), content: newLog, timestamp: new Date().toISOString() };
    onUpdate({ logs: [log, ...(data.logs || [])] });
    setNewLog('');
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-brand px-10 py-10 text-white relative shrink-0" style={{ backgroundColor: 'var(--brand-color)' }}>
                <button onClick={onClose} className="absolute right-8 top-8 p-2 hover:bg-white/20 rounded-full transition-all">
                  <X size={24} />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <BrainCircuit size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter mb-1">{app.company} 面试助手</h2>
                    <p className="text-indigo-100 font-bold text-sm tracking-widest uppercase italic">{app.role}</p>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 overflow-x-auto custom-scrollbar shrink-0">
                <TabButton active={activeTab === 'predict'} onClick={() => setActiveTab('predict')} icon={<Sparkles size={16} />} label="面试预测" />
                <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<MessageSquare size={16} />} label="面试记录" />
                <TabButton active={activeTab === 'retro'} onClick={() => setActiveTab('retro')} icon={<History size={16} />} label="面试复盘" />
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {activeTab === 'predict' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-sm font-black text-slate-800 uppercase italic">AI 面试预测</h4>
                       <button 
                        onClick={onPredict}
                        disabled={isPredicting}
                        className={`px-6 py-2.5 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${isPredicting ? 'opacity-50' : 'hover:scale-105 shadow-brand-soft'}`}
                        style={{ backgroundColor: 'var(--brand-color)' }}
                       >
                        {isPredicting ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        {data.predictions ? '重新预测' : '生成预测'}
                       </button>
                    </div>
                    {data.predictions ? (
                      <div className="prose prose-slate max-w-none text-sm font-bold bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner markdown-body">
                        <ReactMarkdown>{data.predictions}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="border-4 border-dashed border-slate-100 rounded-[32px] p-20 flex flex-col items-center text-center opacity-40">
                         <BrainCircuit size={48} className="text-slate-200 mb-6" />
                         <p className="font-bold text-slate-400">点击按钮，通过 AI 深度分析 JD 构建你的面试题库</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">新增面试点/记录</label>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          value={newLog}
                          onChange={(e) => setNewLog(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
                          placeholder="例如: 考官问了原型链, 我回答得不够清晰..."
                          className="flex-1 px-8 py-5 rounded-[24px] border border-slate-100 bg-slate-50 font-bold text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
                        />
                        <button 
                          onClick={handleAddLog}
                          className="px-8 bg-brand text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-soft hover:scale-105 transition-all"
                          style={{ backgroundColor: 'var(--brand-color)' }}
                        >
                          记录
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">历史记录</label>
                      {data.logs?.length > 0 ? (
                        <div className="space-y-4">
                          {data.logs.map((log) => (
                            <div key={log.id} className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 group relative">
                              <p className="text-sm font-bold text-slate-700 leading-relaxed pr-8">{log.content}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 italic tracking-wider">{new Date(log.timestamp).toLocaleString()}</p>
                              <button 
                                onClick={() => onUpdate({ logs: data.logs.filter(l => l.id !== log.id) })}
                                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                           <MessageSquare size={32} className="opacity-20" />
                           <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">暂无互动记录</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'retro' && (
                  <div className="space-y-6 flex flex-col h-full">
                    <div className="flex-1 flex flex-col space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">面试总结与得失分析</label>
                      <textarea 
                        value={data.retrospective || ''}
                        onChange={(e) => onUpdate({ retrospective: e.target.value })}
                        placeholder="总结这次面试的表现, 记录闪光点与不足..."
                        className="flex-1 min-h-[300px] w-full px-8 py-8 rounded-[32px] border border-slate-100 bg-slate-50 font-bold text-lg focus:ring-2 focus:ring-brand outline-none transition-all shadow-inner resize-none custom-scrollbar leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timerRef = useRef<any>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isConfirming) {
      onDelete();
      setIsConfirming(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      setIsConfirming(true);
      timerRef.current = setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button 
      type="button"
      onClick={handleClick}
      className={`font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
        isConfirming ? 'bg-rose-600 text-white animate-pulse' : 'text-rose-500 hover:bg-rose-50'
      }`}
    >
      {isConfirming ? '确定删除?' : '删除记录'}
    </button>
  );
}

function NotificationItem({ notification, onRead }: { notification: AppNotification, onRead: () => void }) {
  return (
    <div className={`p-5 rounded-3xl border transition-all ${notification.isRead ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-brand-soft shadow-sm ring-1 ring-brand/5'}`} style={!notification.isRead ? { borderColor: 'var(--brand-color-soft)' } : {}}>
      <div className="flex justify-between gap-4">
        <div className="flex-1">
          <p className="font-black text-slate-800 text-sm mb-1">{notification.title}</p>
          <p className="text-xs text-slate-500 leading-relaxed font-bold">{notification.content}</p>
          <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">{new Date(notification.timestamp).toLocaleString()}</p>
        </div>
        {!notification.isRead && (
          <button onClick={onRead} className="text-brand font-black text-[10px] uppercase tracking-widest self-start" style={{ color: 'var(--brand-color)' }}>标记已读</button>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-8 py-6 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${
        active ? 'border-brand text-brand' : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
      style={active ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
    >
      {icon} {label}
    </button>
  );
}

function SortableCard({ app, onClick, onAssistantClick }: { app: Application, onClick: () => void, onAssistantClick: (e: React.MouseEvent) => void, key?: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 cursor-pointer transition-all duration-300 group relative touch-none"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase italic">
            {app.company}{app.department ? ` - ${app.department}` : ''}
          </h4>
          <p className="text-[11px] text-slate-500 font-bold mt-1 leading-tight flex items-center gap-1">
            <MapPin size={10} /> {app.baseLocation || 'Remote'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {['Applied', 'UnderEvaluation', 'Interview'].includes(app.status) && (
            <button 
              onClick={onAssistantClick}
              className="p-1.5 bg-brand text-white rounded-lg hover:scale-110 transition-all shadow-lg shadow-brand-soft"
              style={{ backgroundColor: 'var(--brand-color)' }}
              title="面试预测助手"
            >
              <BrainCircuit size={12} />
            </button>
          )}
          <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shrink-0 ${
            app.priority === 'High' ? 'bg-rose-50 text-rose-600' : 
            app.priority === 'Medium' ? 'bg-indigo-50 text-indigo-600' : 
            'bg-slate-50 text-slate-500'
          }`}>
            {app.priority === 'High' ? '高' : app.priority === 'Medium' ? '中' : '低'}
          </div>
        </div>
      </div>

      <div className="space-y-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-700">{app.role}</p>
          </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
            <CalendarDays size={12} className="text-indigo-400" />
            <span>截止 {app.deadline || '--'}</span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            {app.hasAssessment && (
              <div className={`p-1 rounded-md transition-all ${app.assessmentCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`} title={`测评: ${app.assessmentCompleted ? '已完成' : '截止 ' + (app.assessmentDeadline || '未定')}`}>
                {app.assessmentCompleted ? <CheckCircle size={10} /> : <ClipboardList size={10} />}
              </div>
            )}
            {app.hasOnlineTest && (
              <div className={`p-1 rounded-md transition-all ${app.onlineTestCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`} title={`笔试: ${app.onlineTestCompleted ? '已完成' : '截止 ' + (app.onlineTestDeadline || '未定')}`}>
                {app.onlineTestCompleted ? <CheckCircle size={10} /> : <FileText size={10} />}
              </div>
            )}
            {app.status === 'Interview' && (
              <div className="flex items-center gap-1.5 text-[9px] text-amber-500 font-bold">
                <Users size={12} />
                <span>{app.interviewRounds?.length || 0}轮</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress */}
        {app.materials?.length > 0 && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700 ease-out" 
                style={{ width: `${(app.materials.filter(m => m.submitted).length / app.materials.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ id, status, count, children }: { id: string, status: ApplicationStatus, count: number, children: React.ReactNode, key?: any }) {
  const { setNodeRef, isOver } = useSortable({ id });
  const config = STATUS_CONFIG[status];

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col min-w-[280px] lg:min-w-0 p-3 rounded-[32px] transition-all duration-300 border border-transparent ${config.columnBg} ${isOver ? 'ring-2 ring-indigo-500/20 bg-indigo-50/50 shadow-inner translate-y-1' : ''}`}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.color.split(' ')[0]}`}></div>
          <h3 className="text-sm font-black text-slate-700">{config.label}</h3>
          <span className={`text-[10px] font-black ${config.tagColor} px-2 py-0.5 rounded-lg shadow-sm`}>
            {count}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[50px]">
        {children}
      </div>
    </div>
  );
}

function FormGroup({ label, name, value, onChange, type = 'text', icon, placeholder, required, rows = 4, textClass = "" }: any) {
  const isTextArea = type === 'textarea';
  return (
    <div className={`space-y-1.5 ${isTextArea ? 'col-span-full' : ''}`}>
      <label className="text-xs font-bold text-slate-600 ml-1">
        {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {isTextArea ? (
        <textarea 
          name={name}
          rows={rows}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-5 py-4 rounded-[12px] border border-slate-100 bg-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-sm placeholder:text-slate-200 leading-relaxed ${textClass}`}
        />
      ) : (
        <input 
          type={type}
          name={name}
          value={value || ''}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className={`w-full px-5 py-3.5 rounded-[12px] border border-slate-100 bg-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-200 ${textClass}`}
        />
      )}
    </div>
  );
}
