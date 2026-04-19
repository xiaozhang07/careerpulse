export type ApplicationStatus = 'Wishlist' | 'UnderEvaluation' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface InterviewRound {
  id: string;
  name: string; // e.g., "一面 (业务面)", "二面 (总监面)", "三面 (HR面)"
  date: string; // 日期时间
  link: string; // 面试链接
  status: 'Pending' | 'Passed' | 'Failed'; // 待反馈, 通过, 未通过
}

export interface InterviewAssistantData {
  predictions?: string;
  logs: {
    id: string;
    content: string;
    timestamp: string;
  }[];
  retrospective?: string;
}

export interface Application {
  id: string;
  company: string;
  department?: string; // 集团/部门
  subDepartment?: string; // 部门名称
  role: string;
  status: ApplicationStatus;
  deadline: string; // ISO date
  openDate?: string;
  appliedDate?: string;
  link?: string;
  positionsCount?: number;
  baseLocation?: string;
  jdText?: string;
  jobDescriptionImages: string[];
  hasAssessment: boolean;
  assessmentDeadline?: string;
  assessmentLink?: string;
  assessmentCompleted?: boolean;
  hasOnlineTest: boolean;
  onlineTestDeadline?: string;
  onlineTestLink?: string;
  onlineTestCompleted?: boolean;
  materials: {
    name: string;
    submitted: boolean;
  }[];
  interviewRounds: InterviewRound[];
  totalRounds?: number; // 面试总轮数
  notes: string;
  priority: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
  interviewAssistant?: InterviewAssistantData;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type: 'interview_reminder' | 'system';
}

export interface UserProfile {
  nickname: string;
  avatarUrl?: string;
  resumeName?: string;
  resumeUrl?: string; // File URL or base64
  themeColor?: string; // HEX or Tailwind color name
  notifications?: AppNotification[];
}

export const THEME_COLORS = [
  { name: '经典蓝', value: '#4f46e5' }, // indigo-600
  { name: '翡翠绿', value: '#10b981' }, // emerald-500
  { name: '曜石黑', value: '#0f172a' }, // slate-900
  { name: '落日橙', value: '#f97316' }, // orange-500
  { name: '樱花粉', value: '#ec4899' }, // pink-500
  { name: '极光紫', value: '#8b5cf6' }, // violet-500
];

export const QUOTES = [
  "别灰心，下一份好运正在路上！✨",
  "每一次投递都是对自己未来的一份投资。📈",
  "面试是双向的选择，你也正在考察他们。🤝",
  "保持自信，你比你想象的更优秀。🌟",
  "心之所向，素履以往。🏔️",
  "乾坤未定，你我皆是黑马！🐎",
  "在这个内卷的时代，也要记得爱自己。❤️",
  "种一棵树最好的时间是十年前，其次是现在。🌱",
  "好饭不怕晚，好事就在眼前。🎊",
  "所有的努力，终将以另一种方式呈现。💫"
];

export const STATUS_CONFIG = {
  Wishlist: { 
    label: '待投递', 
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    columnBg: 'bg-slate-50/50',
    tagColor: 'bg-slate-100 text-slate-600'
  },
  Applied: { 
    label: '已投递', 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    columnBg: 'bg-blue-50/20',
    tagColor: 'bg-blue-100 text-blue-600'
  },
  UnderEvaluation: { 
    label: '筛选评估中', 
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    columnBg: 'bg-indigo-50/20',
    tagColor: 'bg-indigo-100 text-indigo-600'
  },
  Interview: { 
    label: '面试中', 
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    columnBg: 'bg-amber-50/20',
    tagColor: 'bg-amber-100 text-amber-600'
  },
  Offer: { 
    label: 'Offer', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    columnBg: 'bg-emerald-50/20',
    tagColor: 'bg-emerald-100 text-emerald-600'
  },
  Rejected: { 
    label: '已结束', 
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    columnBg: 'bg-rose-50/20',
    tagColor: 'bg-rose-100 text-rose-600'
  },
};
