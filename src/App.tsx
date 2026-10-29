import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  BookOpen,
  Award,
  Plus,
  CheckCircle2,
  GraduationCap,
  LogIn,
  LogOut,
  Search,
  Edit3,
  Trash2,
  Compass,
  Send,
  Bookmark,
  Sparkles,
  MapPin,
  Users,
  Menu,
  X,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';

import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  OperationType,
  BETA_CODE_STORAGE_KEY,
  DEMO_SESSION_STORAGE_KEY,
  ADMIN_EMAIL,
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_UID,
  getAiAuthHeaders,
  generateFamilyShareCode,
  isSecureFamilyShareCode,
  secureFamilyShareCode,
} from './firebase';
import {
  ActivityItem,
  JournalEntryItem,
  HonorAwardItem,
  UserProfile,
  GradeLevel,
  ALL_GRADES,
  GRADE_LABELS,
  JOURNAL_PROMPTS,
  JournalMood,
  RecognitionLevel,
  INITIAL_DEMO_PROFILE,
  INITIAL_DEMO_ACTIVITIES,
  INITIAL_DEMO_JOURNALS,
  INITIAL_DEMO_HONORS,
  FamilyProfileItem,
  INITIAL_DEMO_FAMILY_PROFILE,
  EssayDraftItem,
  INITIAL_DEMO_ESSAY_DRAFTS,
  CollegeDeadlineItem,
  INITIAL_DEMO_COLLEGE_DEADLINES,
  CollegeApplicationStatus,
  StudentChildProfile,
  getDefaultGradYearForGrade,
  SoftDeletedRecordType,
  SoftDeletedTrashItem,
  PortfolioSnapshotItem,
} from './types';
import {
  evaluateBadges,
  calculateActivityTotalHours,
  calculateStudentLevel,
} from './badges';
import { ActivityModal } from './components/ActivityModal';
import { JournalModal, HonorModal } from './components/JournalAndHonorModals';
import { CommonAppExportView } from './components/CommonAppExportView';
import { CumulativeHoursChart } from './components/CumulativeHoursChart';
import {
  HeroEditorialArtwork,
  StudentWebsiteHeroBackground,
  StudentIllustratedAvatar,
  SubpageHeroBanner,
} from './components/EditorialIllustrations';
import { ActivityCard } from './components/ActivityCard';
import { StudentFamilyProfileView } from './components/StudentFamilyProfileView';
import { AICoachAndEssayView } from './components/AICoachAndEssayView';
import { RecentSchoolCompetitionsPicker } from './components/RecentSchoolCompetitionsPicker';
import { LandingPage } from './components/LandingPage';
import { PrivacyPage } from './components/PrivacyPage';

type NavTab =
  | 'landing'
  | 'privacy'
  | 'overview'
  | 'activities'
  | 'journal'
  | 'honors'
  | 'ai-coach'
  | 'profile'
  | 'badges'
  | 'commonapp';

const LOCAL_STORAGE_KEYS = {
  PROFILE: 'pathfolio_profile_v3',
  FAMILY_PROFILE: 'pathfolio_family_profile_v3',
  FAMILY_STUDENTS: 'pathfolio_family_students_v3',
  ACTIVE_STUDENT_ID: 'pathfolio_active_student_id_v3',
  ACTIVITIES: 'pathfolio_activities_v3',
  JOURNAL: 'pathfolio_journal_v3',
  HONORS: 'pathfolio_honors_v3',
  ESSAY_DRAFTS: 'pathfolio_essay_drafts_v3',
  COLLEGE_DEADLINES: 'pathfolio_college_deadlines_v3',
  ACTIVE_TAB: 'pathfolio_active_tab_v3',
  DELETED_TRASH: 'pathfolio_deleted_trash_v3',
  PORTFOLIO_SNAPSHOTS: 'pathfolio_snapshots_v3',
};

const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

const CLEAN_DEFAULT_PROFILE: UserProfile = {
  uid: 'guest_student',
  displayName: '',
  currentGrade: 9,
  gradYear: 2030,
  dreamColleges: '',
  streakDays: 0,
  xp: 0,
  lastCheckInDate: '',
};

const CLEAN_DEFAULT_FAMILY_PROFILE: FamilyProfileItem = {
  ownerId: 'guest_student',
  studentFullName: '',
  preferredName: '',
  highSchoolName: '',
  highSchoolCityState: '',
  curriculumType: 'AP / Honors',
  unweightedGpa: '',
  weightedGpa: '',
  classRank: '',
  satActScore: '',
  intendedMajors: '',
  careerInterests: '',
  householdStructure: 'Both Parents',
  firstGenerationCollege: false,
  languagesSpokenAtHome: '',
  feeWaiverEligible: false,
  parent1Name: '',
  parent1Relationship: 'Mother',
  parent1Education: 'Bachelors Degree',
  parent1AlmaMater: '',
  parent1Occupation: '',
  parent2Name: '',
  parent2Relationship: 'Father',
  parent2Education: 'Bachelors Degree',
  parent2AlmaMater: '',
  parent2Occupation: '',
  siblingsCount: 0,
  siblingsSummary: '',
  familyResponsibilitiesNotes: '',
  accountRole: 'Parent / Guardian',
  studentEmail: '',
  parentEmail: '',
  parent2Email: '',
  familyShareCode: '',
};

function isDemoProfileData(p?: Partial<UserProfile> | null): boolean {
  if (!p) return false;
  // Matching profiles are wiped, so a real student who happens to be named
  // "Jordan" must never match: require the demo uid or several demo fields.
  const demoNames = [
    INITIAL_DEMO_PROFILE.displayName,
    'Maya Lin',
    'Jordan Rivera',
    'Jordan Alexander Rivera',
  ];
  return (
    p.uid === DEMO_ACCOUNT_UID ||
    p.uid === INITIAL_DEMO_PROFILE.uid ||
    (demoNames.includes(p.displayName || '') &&
      p.dreamColleges === INITIAL_DEMO_PROFILE.dreamColleges)
  );
}

function isDemoFamilyData(f?: Partial<FamilyProfileItem> | null): boolean {
  if (!f) return false;
  return (
    f.ownerId === DEMO_ACCOUNT_UID ||
    f.ownerId === INITIAL_DEMO_FAMILY_PROFILE.ownerId ||
    (f.studentFullName === INITIAL_DEMO_FAMILY_PROFILE.studentFullName &&
      f.highSchoolName === INITIAL_DEMO_FAMILY_PROFILE.highSchoolName) ||
    f.familyShareCode === INITIAL_DEMO_FAMILY_PROFILE.familyShareCode
  );
}

function isDemoActivityItem(a?: Partial<ActivityItem> | null): boolean {
  if (!a) return false;
  return INITIAL_DEMO_ACTIVITIES.some(
    (d) =>
      d.id === a.id ||
      (d.organization === a.organization &&
        d.position === a.position &&
        d.description === a.description)
  );
}

function isDemoJournalItem(j?: Partial<JournalEntryItem> | null): boolean {
  if (!j) return false;
  return INITIAL_DEMO_JOURNALS.some(
    (d) => d.id === j.id || (d.title === j.title && d.content === j.content)
  );
}

function isDemoHonorItem(h?: Partial<HonorAwardItem> | null): boolean {
  if (!h) return false;
  return INITIAL_DEMO_HONORS.some(
    (d) => d.id === h.id || (d.title === h.title && d.notes === h.notes)
  );
}

function isDemoEssayDraftItem(e?: Partial<EssayDraftItem> | null): boolean {
  if (!e) return false;
  return INITIAL_DEMO_ESSAY_DRAFTS.some(
    (d) =>
      d.id === e.id ||
      (d.versionTitle === e.versionTitle && d.essayText === e.essayText)
  );
}

function isDemoCollegeDeadlineItem(
  c?: Partial<CollegeDeadlineItem> | null
): boolean {
  if (!c) return false;
  return INITIAL_DEMO_COLLEGE_DEADLINES.some(
    (d) =>
      d.id === c.id ||
      (d.collegeName === c.collegeName &&
        d.supplementalStatus === c.supplementalStatus)
  );
}

function deduplicateFamilyStudents(
  list: StudentChildProfile[],
  isDemoActive = false
): StudentChildProfile[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const merged: StudentChildProfile[] = [];

  for (const raw of list) {
    if (!raw || raw.isDeleted) continue;
    const cleanName = (raw.name || '').trim().replace(/\s+/g, ' ');
    if (!cleanName || cleanName === 'Student Scholar') continue;
    if (
      !isDemoActive &&
      (raw.id === 'stu_demo_jordan' || raw.id === 'stu_demo_maya')
    ) {
      continue;
    }

    const rawLower = cleanName.toLowerCase();
    const rawFirst = rawLower.split(' ')[0];
    const rawGrade = (Number(raw.grade) || 9) as GradeLevel;

    const matchIdx = merged.findIndex((existing) => {
      if (existing.id && raw.id && existing.id === raw.id) return true;
      const exName = existing.name.trim().replace(/\s+/g, ' ');
      const exLower = exName.toLowerCase();
      if (exLower === rawLower) return true;
      const exFirst = exLower.split(' ')[0];
      const oneIsFirstNameOnly =
        !exLower.includes(' ') || !rawLower.includes(' ');
      if (
        oneIsFirstNameOnly &&
        exFirst === rawFirst &&
        (existing.grade === rawGrade ||
          existing.id === 'stu_primary' ||
          raw.id === 'stu_primary')
      ) {
        return true;
      }
      return false;
    });

    if (matchIdx === -1) {
      merged.push({
        ...raw,
        id: raw.id || `stu_${rawLower.replace(/[^a-z0-9]+/g, '_')}`,
        name: cleanName,
        grade: rawGrade,
        gradYear: Number(raw.gradYear) || getDefaultGradYearForGrade(rawGrade),
      });
    } else {
      const cur = merged[matchIdx];
      const bestId =
        cur.id && cur.id !== 'stu_primary'
          ? cur.id
          : raw.id && raw.id !== 'stu_primary'
            ? raw.id
            : cur.id || raw.id || 'stu_primary';
      const bestName =
        cleanName.length > cur.name.trim().length ? cleanName : cur.name.trim();
      const bestGrade =
        cur.id === 'stu_primary' && raw.id !== 'stu_primary'
          ? rawGrade
          : raw.id === 'stu_primary' && cur.id !== 'stu_primary'
            ? cur.grade
            : rawGrade || cur.grade;

      merged[matchIdx] = {
        ...cur,
        ...raw,
        id: bestId,
        name: bestName,
        grade: bestGrade,
        gradYear: getDefaultGradYearForGrade(bestGrade),
        schoolName: raw.schoolName || cur.schoolName || '',
        cityState: raw.cityState || cur.cityState || '',
        studentEmail: raw.studentEmail || cur.studentEmail || '',
        curriculumType:
          raw.curriculumType || cur.curriculumType || 'AP / Honors',
        unweightedGpa: raw.unweightedGpa || cur.unweightedGpa || '',
        weightedGpa: raw.weightedGpa || cur.weightedGpa || '',
        classRank: raw.classRank || cur.classRank || '',
        satActScore: raw.satActScore || cur.satActScore || '',
        intendedMajors: raw.intendedMajors || cur.intendedMajors || '',
        careerInterests: raw.careerInterests || cur.careerInterests || '',
        dreamColleges: raw.dreamColleges || cur.dreamColleges || '',
      };
    }
  }

  return merged.sort(
    (a, b) => a.grade - b.grade || a.name.localeCompare(b.name)
  );
}

const MOOD_LIST: JournalMood[] = [
  'Proud',
  'Energized',
  'Curious',
  'Grateful',
  'Challenged',
];

type ActivityCategoryGroup =
  | 'all'
  | 'athletics'
  | 'stem'
  | 'arts'
  | 'service'
  | 'leadership';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.replace(/\/+$/, '') === '/privacy') {
        return 'privacy';
      }
      const savedTab = (sessionStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB) ||
        localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB)) as NavTab | null;
      const validTabs: NavTab[] = [
        'landing',
        'privacy',
        'overview',
        'activities',
        'journal',
        'honors',
        'ai-coach',
        'profile',
        'badges',
        'commonapp',
      ];
      if (savedTab && validTabs.includes(savedTab)) {
        return savedTab;
      }
    }
    return 'landing';
  });
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [isDemoSessionActive, setIsDemoSessionActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEMO_SESSION_STORAGE_KEY) === 'true';
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [showAllStepsMobile, setShowAllStepsMobile] = useState(false);

  // Beta Access & Daily AI Quota State
  const [betaStatus, setBetaStatus] = useState<{
    isAdmin: boolean;
    isApproved: boolean;
    demoLoginEnabled: boolean;
    aiRemainingToday: number;
    dailyUserLimit: number;
    globalRemainingToday: number;
    globalDailyLimit: number;
    activeInviteCode?: string;
    approvedEmails?: string[];
    todayGlobalUsed?: number;
  }>({
    isAdmin: false,
    isApproved: true,
    demoLoginEnabled: true,
    aiRemainingToday: 10,
    dailyUserLimit: 10,
    globalRemainingToday: 100,
    globalDailyLimit: 100,
  });
  const [betaCodeInput, setBetaCodeInput] = useState('');
  const [betaCodeError, setBetaCodeError] = useState('');
  const [redeemingBetaCode, setRedeemingBetaCode] = useState(false);
  const [isBetaAdminModalOpen, setIsBetaAdminModalOpen] = useState(false);
  const [adminAddEmailInput, setAdminAddEmailInput] = useState('');
  const [adminInviteCodeInput, setAdminInviteCodeInput] = useState('ADMIT2026');
  const [adminUserLimitInput, setAdminUserLimitInput] = useState(10);
  const [adminGlobalLimitInput, setAdminGlobalLimitInput] = useState(100);

  const refreshBetaStatus = async (currentUser?: User | null) => {
    const activeUser = currentUser !== undefined ? currentUser : user;
    try {
      const isDemoNow =
        localStorage.getItem(DEMO_SESSION_STORAGE_KEY) === 'true';
      const headers = await getAiAuthHeaders();
      if (activeUser && !headers.Authorization) {
        try {
          headers.Authorization = `Bearer ${await activeUser.getIdToken()}`;
        } catch {
          // continue unauthenticated
        }
      }

      const res = await fetch('/api/beta/status', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        const demoEnabled =
          typeof data.demoLoginEnabled === 'boolean'
            ? data.demoLoginEnabled
            : true;
        if (!demoEnabled && isDemoNow) {
          localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
          setIsDemoSessionActive(false);
        }
        setBetaStatus({
          isAdmin: Boolean(data.isAdmin),
          isApproved: Boolean(data.isApproved),
          demoLoginEnabled: demoEnabled,
          aiRemainingToday:
            typeof data.aiRemainingToday === 'number' ? data.aiRemainingToday : 10,
          dailyUserLimit:
            typeof data.dailyUserLimit === 'number' ? data.dailyUserLimit : 10,
          globalRemainingToday:
            typeof data.globalRemainingToday === 'number'
              ? data.globalRemainingToday
              : 100,
          globalDailyLimit:
            typeof data.globalDailyLimit === 'number' ? data.globalDailyLimit : 100,
          activeInviteCode: data.activeInviteCode,
          approvedEmails: data.approvedEmails,
          todayGlobalUsed: data.todayGlobalUsed,
        });
        if (data.activeInviteCode) {
          setAdminInviteCodeInput(data.activeInviteCode);
        }
        if (typeof data.dailyUserLimit === 'number' && !data.isAdmin) {
          setAdminUserLimitInput(data.dailyUserLimit);
        }
        if (typeof data.globalDailyLimit === 'number') {
          setAdminGlobalLimitInput(data.globalDailyLimit);
        }
      }
    } catch {
      // ignore transient network error
    }
  };

  useEffect(() => {
    void refreshBetaStatus(user);
  }, [user, isDemoSessionActive]);

  useEffect(() => {
    const handleQuotaEvent = (e: Event) => {
      const custom = e as CustomEvent<{
        aiRemainingToday?: number;
        dailyUserLimit?: number;
      }>;
      if (typeof custom.detail?.aiRemainingToday === 'number') {
        setBetaStatus((prev) => ({
          ...prev,
          aiRemainingToday: custom.detail.aiRemainingToday!,
          ...(typeof custom.detail?.dailyUserLimit === 'number'
            ? { dailyUserLimit: custom.detail.dailyUserLimit }
            : {}),
        }));
      }
    };
    window.addEventListener('pathtoadmit:ai-quota-updated', handleQuotaEvent);
    return () =>
      window.removeEventListener('pathtoadmit:ai-quota-updated', handleQuotaEvent);
  }, []);

  const handleRedeemBetaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = betaCodeInput.trim().toUpperCase();
    if (!clean) {
      setBetaCodeError('Please enter the Family Beta Invite Code.');
      return;
    }
    setRedeemingBetaCode(true);
    setBetaCodeError('');
    try {
      const res = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify({
          email: user?.email || '',
          uid: user?.uid || '',
          inviteCode: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setBetaCodeError(
          data.error || 'Invalid invite code. Please check with PathToAdmit.'
        );
        return;
      }
      localStorage.setItem(BETA_CODE_STORAGE_KEY, clean);
      setBetaCodeInput('');
      await refreshBetaStatus(user);
      showToast('Family Beta Access unlocked! Welcome to PathToAdmit.');
    } catch {
      setBetaCodeError('Unable to verify invite code right now.');
    } finally {
      setRedeemingBetaCode(false);
    }
  };

  const setActiveTab = (nextTab: NavTab) => {
    setActiveTabState(nextTab);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, nextTab);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, nextTab);
      } catch {
        // ignore storage quota errors
      }
      const targetPath = nextTab === 'privacy' ? '/privacy' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname.replace(/\/+$/, '') === '/privacy') {
        setActiveTabState('privacy');
      } else {
        setActiveTabState((prev) => (prev === 'privacy' ? 'landing' : prev));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<
    GradeLevel | 'all'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'impact' | 'hours'>('impact');

  // Subpage-specific filters
  const [activityCategoryGroup, setActivityCategoryGroup] =
    useState<ActivityCategoryGroup>('all');
  const [journalFilterMode, setJournalFilterMode] = useState<'all' | 'seeds'>(
    'all'
  );
  const [honorTierFilter, setHonorTierFilter] = useState<
    RecognitionLevel | 'all'
  >('all');
  const [badgeFilterMode, setBadgeFilterMode] = useState<
    'all' | 'unlocked' | 'locked'
  >('all');

  // Quick Reflection Composer on Home
  const [quickMemoryText, setQuickMemoryText] = useState('');
  const [quickMemoryMood, setQuickMemoryMood] = useState<JournalMood>('Proud');
  const [promptIndex, setPromptIndex] = useState(0);
  const [savingQuickMemory, setSavingQuickMemory] = useState(false);

  // User Profile State (Defaults to clean blank profile, never demo data)
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfile;
        if (!isDemoProfileData(parsed)) {
          const correctedGradYear =
            parsed.currentGrade === 9 && parsed.gradYear === 2029
              ? 2030
              : parsed.gradYear || getDefaultGradYearForGrade(parsed.currentGrade || 9);
          return {
            ...parsed,
            gradYear: correctedGradYear,
            lastCheckInDate: parsed.streakDays > 0 ? parsed.lastCheckInDate : '',
          };
        }
      } catch {
        // fallback
      }
    }
    return CLEAN_DEFAULT_PROFILE;
  });

  // Student & Family Profile State (Defaults to clean blank family profile)
  const [familyProfile, setFamilyProfile] = useState<FamilyProfileItem>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.FAMILY_PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FamilyProfileItem;
        if (!isDemoFamilyData(parsed)) {
          return parsed.familyShareCode && !isSecureFamilyShareCode(parsed.familyShareCode)
            ? { ...parsed, familyShareCode: generateFamilyShareCode() }
            : parsed;
        }
      } catch {
        // fallback
      }
    }
    return CLEAN_DEFAULT_FAMILY_PROFILE;
  });

  // Activities State (Defaults to clean empty list)
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVITIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ActivityItem[];
        if (Array.isArray(parsed)) {
          return parsed.filter((a) => !isDemoActivityItem(a));
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Journal Entries State (Defaults to clean empty list)
  const [journalEntries, setJournalEntries] = useState<JournalEntryItem[]>(
    () => {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.JOURNAL);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as JournalEntryItem[];
          if (Array.isArray(parsed)) {
            return parsed.filter((j) => !isDemoJournalItem(j));
          }
        } catch {
          // fallback
        }
      }
      return [];
    }
  );

  // Honors State (Defaults to clean empty list)
  const [honors, setHonors] = useState<HonorAwardItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.HONORS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as HonorAwardItem[];
        if (Array.isArray(parsed)) {
          return parsed.filter((h) => !isDemoHonorItem(h));
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Saved Essay Drafts State (Defaults to clean empty list)
  const [essayDrafts, setEssayDrafts] = useState<EssayDraftItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ESSAY_DRAFTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as EssayDraftItem[];
        if (Array.isArray(parsed)) {
          return parsed.filter((e) => !isDemoEssayDraftItem(e));
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  // College Deadlines State (Defaults to clean empty list)
  const [collegeDeadlines, setCollegeDeadlines] = useState<
    CollegeDeadlineItem[]
  >(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.COLLEGE_DEADLINES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CollegeDeadlineItem[];
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => !isDemoCollegeDeadlineItem(c));
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Multi-Student Family Portfolio State (Supports 1 or more kids in the same family account)
  const [familyStudents, setFamilyStudents] = useState<StudentChildProfile[]>(
    () => {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.FAMILY_STUDENTS);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as StudentChildProfile[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const isDemoActive =
              localStorage.getItem(DEMO_SESSION_STORAGE_KEY) === 'true';
            const cleaned = deduplicateFamilyStudents(parsed, isDemoActive);
            if (cleaned.length > 0) return cleaned;
          }
        } catch {
          // fallback
        }
      }
      const initialName = (
        familyProfile.studentFullName ||
        profile.displayName ||
        ''
      ).trim();
      if (initialName && !isDemoFamilyData(familyProfile) && !isDemoProfileData(profile)) {
        return [
          {
            id: 'stu_primary',
            name: initialName,
            grade: profile.currentGrade,
            gradYear: profile.gradYear,
            schoolName: familyProfile.highSchoolName || '',
            cityState: familyProfile.highSchoolCityState || '',
            studentEmail: familyProfile.studentEmail || '',
            curriculumType: familyProfile.curriculumType || 'AP / Honors',
            unweightedGpa: familyProfile.unweightedGpa || '',
            weightedGpa: familyProfile.weightedGpa || '',
            classRank: familyProfile.classRank || '',
            satActScore: familyProfile.satActScore || '',
            intendedMajors: familyProfile.intendedMajors || '',
            careerInterests: familyProfile.careerInterests || '',
            dreamColleges: profile.dreamColleges || '',
          },
        ];
      }
      return [];
    }
  );

  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID);
    if (saved) return saved;
    return 'stu_primary';
  });

  // Track which student is being edited or added inside Step 1 Registration Modal ('new' means adding a new sibling/child)
  const [regEditingStudentId, setRegEditingStudentId] = useState<string>('');

  // Modals State
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(
    null
  );
  const [activityPrefill, setActivityPrefill] = useState<{
    activityType: string;
    position: string;
    organization: string;
    description: string;
    extendedNotes: string;
    hoursPerWeek: number;
    weeksPerYear: number;
  } | null>(null);
  const [showRecentCompetitionsPanel, setShowRecentCompetitionsPanel] =
    useState(true);

  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] =
    useState<JournalEntryItem | null>(null);

  const [isHonorModalOpen, setIsHonorModalOpen] = useState(false);
  const [editingHonor, setEditingHonor] = useState<HonorAwardItem | null>(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  // Registration & Family Link quick-form state
  const [regRole, setRegRole] = useState<'Parent / Guardian' | 'Student'>(
    familyProfile.accountRole || 'Parent / Guardian'
  );
  const [regStudentName, setRegStudentName] = useState(
    familyProfile.studentFullName || profile.displayName
  );
  const [regGrade, setRegGrade] = useState<GradeLevel>(profile.currentGrade);
  const [regSchoolName, setRegSchoolName] = useState(
    familyProfile.highSchoolName || ''
  );
  const [regCityState, setRegCityState] = useState(
    familyProfile.highSchoolCityState || ''
  );
  const [regStudentEmail, setRegStudentEmail] = useState(
    familyProfile.studentEmail || ''
  );
  const [regParentEmail, setRegParentEmail] = useState(
    familyProfile.parentEmail || ''
  );
  const [regParent2Email, setRegParent2Email] = useState(
    familyProfile.parent2Email || ''
  );
  const [regShareCodeInput, setRegShareCodeInput] = useState('');

  // Whenever the Step 1 modal opens or activeStudentId/familyProfile updates, ensure Step 1 inputs show the saved student info (unless explicitly adding a new sibling)
  useEffect(() => {
    if (!isRegistrationModalOpen) return;
    if (regEditingStudentId === 'new') return;

    const targetStu =
      familyStudents.find((s) => s.id === (regEditingStudentId || activeStudentId)) ||
      familyStudents[0];

    if (targetStu) {
      setRegEditingStudentId(targetStu.id);
      setRegStudentName(targetStu.name);
      setRegGrade(targetStu.grade);
      setRegSchoolName(targetStu.schoolName || '');
      setRegCityState(targetStu.cityState || familyProfile.highSchoolCityState || '');
      setRegStudentEmail(targetStu.studentEmail || '');
    } else {
      setRegStudentName(familyProfile.studentFullName || profile.displayName || '');
      setRegGrade(profile.currentGrade || 9);
      setRegSchoolName(familyProfile.highSchoolName || '');
      setRegCityState(familyProfile.highSchoolCityState || '');
      setRegStudentEmail(familyProfile.studentEmail || '');
    }
    setRegRole(familyProfile.accountRole || 'Parent / Guardian');
    setRegParentEmail((prev) => familyProfile.parentEmail || prev || user?.email || '');
    setRegParent2Email((prev) => familyProfile.parent2Email || prev || '');
  }, [
    isRegistrationModalOpen,
    regEditingStudentId,
    activeStudentId,
    familyStudents,
    familyProfile,
    profile,
    user,
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<{
    type: 'activity' | 'journal' | 'honor' | 'essayDraft' | 'collegeDeadline';
    id: string;
  } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [lastSoftDeletedItem, setLastSoftDeletedItem] =
    useState<SoftDeletedTrashItem | null>(null);

  // 30-Day Soft-Delete Trash Vault (auto-purges items older than 30 days)
  const [deletedTrash, setDeletedTrash] = useState<SoftDeletedTrashItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.DELETED_TRASH);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SoftDeletedTrashItem[];
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      return parsed.filter(
        (item) => item && item.purgeAfter && Date.parse(item.purgeAfter) > now
      );
    } catch {
      return [];
    }
  });

  // Automatic Pre-Delete & Pre-Overwrite Snapshots (kept for 30 days, up to 25 recent snapshots)
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<
    PortfolioSnapshotItem[]
  >(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.PORTFOLIO_SNAPSHOTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PortfolioSnapshotItem[];
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      return parsed
        .filter((s) => s && s.purgeAfter && Date.parse(s.purgeAfter) > now)
        .slice(0, 25);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setDeleteConfirmInput('');
  }, [deleteConfirmId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.DELETED_TRASH,
        JSON.stringify(deletedTrash)
      );
    } catch {
      // ignore storage errors
    }
  }, [deletedTrash]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.PORTFOLIO_SNAPSHOTS,
        JSON.stringify(portfolioSnapshots)
      );
    } catch {
      // ignore storage errors
    }
  }, [portfolioSnapshots]);

  // Capture an automatic snapshot of the current record & portfolio right before any delete or bulk overwrite
  const capturePortfolioSnapshot = (
    reason: string,
    studentNameOverride?: string,
    recordType: SoftDeletedRecordType | 'bulk' = 'bulk',
    recordTitle?: string,
    singleRecord?: SoftDeletedTrashItem['recordPayload']
  ): PortfolioSnapshotItem => {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const purgeAfter = new Date(now + SOFT_DELETE_RETENTION_MS).toISOString();
    const resolvedStuName =
      studentNameOverride ||
      familyStudents.find((s) => s.id === activeStudentId)?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      'Family Portfolio';
    const snap: PortfolioSnapshotItem = {
      id: `snap_${now}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt,
      purgeAfter,
      reason,
      studentName: resolvedStuName,
      recordType,
      recordTitle,
      singleRecord,
      portfolioState: {
        profile: { ...profile },
        familyProfile: { ...familyProfile },
        familyStudents: familyStudents.map((s) => ({ ...s })),
        activeStudentId,
        activities: activities.map((a) => ({ ...a })),
        journalEntries: journalEntries.map((j) => ({ ...j })),
        honors: honors.map((h) => ({ ...h })),
        essayDrafts: essayDrafts.map((d) => ({ ...d })),
        collegeDeadlines: collegeDeadlines.map((c) => ({ ...c })),
      },
    };
    setPortfolioSnapshots((prev) => [snap, ...prev].slice(0, 25));
    return snap;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4800);
  };

  // Clear legacy v2 localStorage keys that previously cached demo data
  useEffect(() => {
    [
      'pathfolio_profile_v2',
      'pathfolio_family_profile_v2',
      'pathfolio_activities_v2',
      'pathfolio_journal_v2',
      'pathfolio_honors_v2',
      'pathfolio_essay_drafts_v2',
      'pathfolio_college_deadlines_v2',
    ].forEach((legacyKey) => localStorage.removeItem(legacyKey));
  }, []);

  // Auth listener: move signed-in users into their dashboard automatically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setIsSampleMode(false);
        setActiveTabState((prev) => (prev === 'landing' ? 'overview' : prev));
      }
    });
    return () => unsubscribe();
  }, []);

  // Always sync non-sample portfolio state to localStorage (both guest and signed-in) so returning to the screen never flashes blank
  useEffect(() => {
    if (!isSampleMode) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.PROFILE,
        JSON.stringify(profile)
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.FAMILY_PROFILE,
        JSON.stringify(familyProfile)
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.FAMILY_STUDENTS,
        JSON.stringify(familyStudents)
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID,
        activeStudentId
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ACTIVITIES,
        JSON.stringify(activities)
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.JOURNAL,
        JSON.stringify(journalEntries)
      );
      localStorage.setItem(LOCAL_STORAGE_KEYS.HONORS, JSON.stringify(honors));
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ESSAY_DRAFTS,
        JSON.stringify(essayDrafts)
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.COLLEGE_DEADLINES,
        JSON.stringify(collegeDeadlines)
      );
    }
  }, [
    profile,
    familyProfile,
    familyStudents,
    activeStudentId,
    activities,
    journalEntries,
    honors,
    essayDrafts,
    collegeDeadlines,
    isSampleMode,
  ]);

  // Firestore real-time listeners when authenticated (preserving any student details already entered locally)
  useEffect(() => {
    if (!isAuthReady || !user || isSampleMode) return;

    const uid = user.uid;
    const userDocRef = doc(db, 'users', uid);
    const familyDocRef = doc(db, 'users', uid, 'familyProfile', 'main');

    const unsubProfile = onSnapshot(
      userDocRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          if (isDemoProfileData(data)) {
            const cleanedProfile: UserProfile = {
              uid,
              displayName: '',
              currentGrade: 9,
              gradYear: 2030,
              dreamColleges: '',
              xp: 0,
              streakDays: 0,
              lastCheckInDate: '',
            };
            setProfile(cleanedProfile);
            try {
              await setDoc(userDocRef, {
                ...cleanedProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
            }
          } else {
            // If Firestore has a saved displayName, use it; if Firestore is blank but user already saved a student locally, preserve the local student!
            setProfile((prev) => {
              if (!data.displayName && prev.displayName && !isDemoProfileData(prev)) {
                return { ...data, displayName: prev.displayName, currentGrade: prev.currentGrade, gradYear: prev.gradYear };
              }
              return {
                ...data,
                gradYear:
                  data.currentGrade === 9 && data.gradYear === 2029
                    ? 2030
                    : data.gradYear || getDefaultGradYearForGrade(data.currentGrade || 9),
                lastCheckInDate: data.streakDays > 0 ? data.lastCheckInDate : '',
              };
            });
          }
        } else {
          // Initialize Firestore user doc using any local student name already entered
          const localName = !isDemoProfileData(profile) ? (profile.displayName || '').slice(0, 80) : '';
          const localGrade = profile.currentGrade || 9;
          const localGradYear = getDefaultGradYearForGrade(localGrade);
          const newProfile = {
            uid,
            displayName: localName,
            currentGrade: localGrade,
            gradYear: localGradYear,
            dreamColleges: (profile.dreamColleges || '').slice(0, 200),
            xp: profile.xp || 0,
            streakDays: profile.streakDays || 0,
            lastCheckInDate: profile.streakDays > 0 ? profile.lastCheckInDate : '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          setProfile((prev) => ({
            ...prev,
            uid,
            displayName: localName,
            currentGrade: localGrade,
            gradYear: localGradYear,
          }));
          try {
            await setDoc(userDocRef, newProfile);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubFamilyProfile = onSnapshot(
      familyDocRef,
      async (snap) => {
        const buildCleanFamily = (): FamilyProfileItem => ({
          ...CLEAN_DEFAULT_FAMILY_PROFILE,
          ownerId: uid,
          accountRole: regRole || 'Parent / Guardian',
          studentEmail: regRole === 'Student' ? user.email || '' : '',
          parentEmail:
            regRole === 'Parent / Guardian' ? user.email || '' : '',
          familyShareCode: generateFamilyShareCode(),
        });

        if (snap.exists()) {
          const fData = snap.data() as FamilyProfileItem;
          if (isDemoFamilyData(fData)) {
            const cleanFamily = buildCleanFamily();
            setFamilyProfile(cleanFamily);
            try {
              const { createdAt: _c, updatedAt: _u, ...cleanFields } = cleanFamily;
              await setDoc(familyDocRef, {
                ...cleanFields,
                ownerId: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `users/${uid}/familyProfile/main`
              );
            }
          } else {
            if (fData.familyShareCode && !isSecureFamilyShareCode(fData.familyShareCode)) {
              const upgradedCode = generateFamilyShareCode();
              fData.familyShareCode = upgradedCode;
              updateDoc(familyDocRef, {
                familyShareCode: upgradedCode,
                updatedAt: serverTimestamp(),
              }).catch((err) => {
                try {
                  handleFirestoreError(
                    err,
                    OperationType.UPDATE,
                    `users/${uid}/familyProfile/main`
                  );
                } catch {
                  // already logged by handleFirestoreError
                }
              });
            }
            setFamilyProfile((prev) => {
              // If Firestore has empty studentFullName while local state already has a saved student, preserve local state
              if (!fData.studentFullName && prev.studentFullName && !isDemoFamilyData(prev)) {
                return { ...fData, ...prev, ownerId: uid };
              }
              return fData;
            });
            if (fData.studentFullName) {
              setRegRole(fData.accountRole || 'Parent / Guardian');
              setRegStudentName(fData.studentFullName);
              setRegSchoolName(fData.highSchoolName || '');
              setRegCityState(fData.highSchoolCityState || '');
              setRegStudentEmail(fData.studentEmail || '');
              setRegParentEmail(fData.parentEmail || user.email || '');
              setRegParent2Email(fData.parent2Email || '');
              if (fData.activeStudentId && fData.activeStudentId !== 'stu_primary') {
                setActiveStudentId((prev) =>
                  !prev || prev === 'stu_primary' ? fData.activeStudentId! : prev
                );
              }
              setFamilyStudents((prev) => {
                if (prev.length === 0) {
                  return [
                    {
                      id: fData.activeStudentId || 'stu_primary',
                      name: fData.studentFullName,
                      grade: profile.currentGrade || 9,
                      gradYear: getDefaultGradYearForGrade(profile.currentGrade || 9),
                      schoolName: fData.highSchoolName || '',
                      cityState: fData.highSchoolCityState || '',
                      studentEmail: fData.studentEmail || '',
                      curriculumType: fData.curriculumType || 'AP / Honors',
                      unweightedGpa: fData.unweightedGpa || '',
                      weightedGpa: fData.weightedGpa || '',
                      classRank: fData.classRank || '',
                      satActScore: fData.satActScore || '',
                      intendedMajors: fData.intendedMajors || '',
                      careerInterests: fData.careerInterests || '',
                      dreamColleges: profile.dreamColleges || '',
                    },
                  ];
                }
                return prev;
              });
            }
          }
        } else {
          // Brand new Firestore family doc: if the user ALREADY entered student details locally, keep them instead of wiping to blank!
          setFamilyProfile((prev) => {
            if (prev.studentFullName && !isDemoFamilyData(prev)) {
              return {
                ...prev,
                ownerId: uid,
                parentEmail: prev.parentEmail || (regRole !== 'Student' ? user.email || '' : ''),
              };
            }
            return buildCleanFamily();
          });
          if (regRole === 'Student') {
            setRegStudentEmail((prev) => prev || user.email || '');
          } else {
            setRegParentEmail((prev) => prev || user.email || '');
          }
          if (user.email) {
            handlePullSharedFamilyPortfolio(user.email);
          }
          // Only auto-open Registration Wizard if no student has been saved yet
          if (!familyProfile.studentFullName && familyStudents.length === 0) {
            setIsRegistrationModalOpen(true);
          }
        }
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${uid}/familyProfile/main`
        )
    );

    const activitiesQuery = query(
      collection(db, 'activities'),
      where('ownerId', '==', uid)
    );
    const unsubActivities = onSnapshot(
      activitiesQuery,
      (snap) => {
        const valid: ActivityItem[] = [];
        const cloudSoftDeleted: SoftDeletedTrashItem[] = [];
        snap.docs.forEach((d) => {
          const item: ActivityItem = {
            ...(d.data() as ActivityItem),
            id: d.id,
            impactScore: (d.data() as ActivityItem).impactScore ?? 4,
          };
          if (isDemoActivityItem(item)) {
            deleteDoc(doc(db, 'activities', d.id)).catch(() => {});
          } else if (item.isDeleted) {
            const delMs = item.deletedAt ? Date.parse(item.deletedAt) : Date.now();
            if (Date.now() - delMs > SOFT_DELETE_RETENTION_MS) {
              deleteDoc(doc(db, 'activities', d.id)).catch(() => {});
            } else {
              cloudSoftDeleted.push({
                id: `trash_activity_${item.id}`,
                recordType: 'activity',
                recordId: item.id,
                title: `${item.organization} — ${item.position}`,
                subtitle: `${item.activityType} · ${item.hoursPerWeek} hrs/wk`,
                studentId: item.studentId,
                studentName: item.studentName || '',
                deletedAt: item.deletedAt || new Date(delMs).toISOString(),
                purgeAfter: new Date(delMs + SOFT_DELETE_RETENTION_MS).toISOString(),
                recordPayload: { ...item, isDeleted: false, deletedAt: '' },
              });
            }
          } else {
            valid.push(item);
          }
        });
        setActivities(valid);
        if (cloudSoftDeleted.length > 0) {
          setDeletedTrash((prev) => {
            const byKey = new Map(prev.map((t) => [`${t.recordType}_${t.recordId}`, t]));
            for (const c of cloudSoftDeleted) {
              byKey.set(`${c.recordType}_${c.recordId}`, c);
            }
            return Array.from(byKey.values()).sort((a, b) =>
              b.deletedAt.localeCompare(a.deletedAt)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activities')
    );

    const journalQuery = query(
      collection(db, 'journals'),
      where('ownerId', '==', uid)
    );
    const unsubJournal = onSnapshot(
      journalQuery,
      (snap) => {
        const valid: JournalEntryItem[] = [];
        const cloudSoftDeleted: SoftDeletedTrashItem[] = [];
        snap.docs.forEach((d) => {
          const item: JournalEntryItem = {
            ...(d.data() as JournalEntryItem),
            id: d.id,
          };
          if (isDemoJournalItem(item)) {
            deleteDoc(doc(db, 'journals', d.id)).catch(() => {});
          } else if (item.isDeleted) {
            const delMs = item.deletedAt ? Date.parse(item.deletedAt) : Date.now();
            if (Date.now() - delMs > SOFT_DELETE_RETENTION_MS) {
              deleteDoc(doc(db, 'journals', d.id)).catch(() => {});
            } else {
              cloudSoftDeleted.push({
                id: `trash_journal_${item.id}`,
                recordType: 'journal',
                recordId: item.id,
                title: item.title,
                subtitle: `${item.entryDate} · ${item.gradeLevel}th Grade`,
                studentId: item.studentId,
                studentName: item.studentName || '',
                deletedAt: item.deletedAt || new Date(delMs).toISOString(),
                purgeAfter: new Date(delMs + SOFT_DELETE_RETENTION_MS).toISOString(),
                recordPayload: { ...item, isDeleted: false, deletedAt: '' },
              });
            }
          } else {
            valid.push(item);
          }
        });
        valid.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        setJournalEntries(valid);
        if (cloudSoftDeleted.length > 0) {
          setDeletedTrash((prev) => {
            const byKey = new Map(prev.map((t) => [`${t.recordType}_${t.recordId}`, t]));
            for (const c of cloudSoftDeleted) {
              byKey.set(`${c.recordType}_${c.recordId}`, c);
            }
            return Array.from(byKey.values()).sort((a, b) =>
              b.deletedAt.localeCompare(a.deletedAt)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'journals')
    );

    const honorsQuery = query(
      collection(db, 'honors'),
      where('ownerId', '==', uid)
    );
    const unsubHonors = onSnapshot(
      honorsQuery,
      (snap) => {
        const valid: HonorAwardItem[] = [];
        const cloudSoftDeleted: SoftDeletedTrashItem[] = [];
        snap.docs.forEach((d) => {
          const item: HonorAwardItem = {
            ...(d.data() as HonorAwardItem),
            id: d.id,
          };
          if (isDemoHonorItem(item)) {
            deleteDoc(doc(db, 'honors', d.id)).catch(() => {});
          } else if (item.isDeleted) {
            const delMs = item.deletedAt ? Date.parse(item.deletedAt) : Date.now();
            if (Date.now() - delMs > SOFT_DELETE_RETENTION_MS) {
              deleteDoc(doc(db, 'honors', d.id)).catch(() => {});
            } else {
              cloudSoftDeleted.push({
                id: `trash_honor_${item.id}`,
                recordType: 'honor',
                recordId: item.id,
                title: item.title,
                subtitle: `${item.recognitionLevel} · ${item.gradeLevel}th Grade`,
                studentId: item.studentId,
                studentName: item.studentName || '',
                deletedAt: item.deletedAt || new Date(delMs).toISOString(),
                purgeAfter: new Date(delMs + SOFT_DELETE_RETENTION_MS).toISOString(),
                recordPayload: { ...item, isDeleted: false, deletedAt: '' },
              });
            }
          } else {
            valid.push(item);
          }
        });
        setHonors(valid);
        if (cloudSoftDeleted.length > 0) {
          setDeletedTrash((prev) => {
            const byKey = new Map(prev.map((t) => [`${t.recordType}_${t.recordId}`, t]));
            for (const c of cloudSoftDeleted) {
              byKey.set(`${c.recordType}_${c.recordId}`, c);
            }
            return Array.from(byKey.values()).sort((a, b) =>
              b.deletedAt.localeCompare(a.deletedAt)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'honors')
    );

    const essayDraftsQuery = query(
      collection(db, 'essayDrafts'),
      where('ownerId', '==', uid)
    );
    const unsubEssayDrafts = onSnapshot(
      essayDraftsQuery,
      (snap) => {
        const valid: EssayDraftItem[] = [];
        const cloudSoftDeleted: SoftDeletedTrashItem[] = [];
        snap.docs.forEach((d) => {
          const item: EssayDraftItem = {
            ...(d.data() as EssayDraftItem),
            id: d.id,
          };
          if (isDemoEssayDraftItem(item)) {
            deleteDoc(doc(db, 'essayDrafts', d.id)).catch(() => {});
          } else if (item.isDeleted) {
            const delMs = item.deletedAt ? Date.parse(item.deletedAt) : Date.now();
            if (Date.now() - delMs > SOFT_DELETE_RETENTION_MS) {
              deleteDoc(doc(db, 'essayDrafts', d.id)).catch(() => {});
            } else {
              cloudSoftDeleted.push({
                id: `trash_essayDraft_${item.id}`,
                recordType: 'essayDraft',
                recordId: item.id,
                title: item.versionTitle,
                subtitle: `${item.wordCount} words · Score ${item.overallScore}/100`,
                studentId: item.studentId,
                studentName: item.studentName || '',
                deletedAt: item.deletedAt || new Date(delMs).toISOString(),
                purgeAfter: new Date(delMs + SOFT_DELETE_RETENTION_MS).toISOString(),
                recordPayload: { ...item, isDeleted: false, deletedAt: '' },
              });
            }
          } else {
            valid.push(item);
          }
        });
        setEssayDrafts(valid);
        if (cloudSoftDeleted.length > 0) {
          setDeletedTrash((prev) => {
            const byKey = new Map(prev.map((t) => [`${t.recordType}_${t.recordId}`, t]));
            for (const c of cloudSoftDeleted) {
              byKey.set(`${c.recordType}_${c.recordId}`, c);
            }
            return Array.from(byKey.values()).sort((a, b) =>
              b.deletedAt.localeCompare(a.deletedAt)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'essayDrafts')
    );

    const collegeDeadlinesQuery = query(
      collection(db, 'collegeDeadlines'),
      where('ownerId', '==', uid)
    );
    const unsubCollegeDeadlines = onSnapshot(
      collegeDeadlinesQuery,
      (snap) => {
        const valid: CollegeDeadlineItem[] = [];
        const cloudSoftDeleted: SoftDeletedTrashItem[] = [];
        snap.docs.forEach((d) => {
          const item: CollegeDeadlineItem = {
            ...(d.data() as CollegeDeadlineItem),
            id: d.id,
          };
          if (isDemoCollegeDeadlineItem(item)) {
            deleteDoc(doc(db, 'collegeDeadlines', d.id)).catch(() => {});
          } else if (item.isDeleted) {
            const delMs = item.deletedAt ? Date.parse(item.deletedAt) : Date.now();
            if (Date.now() - delMs > SOFT_DELETE_RETENTION_MS) {
              deleteDoc(doc(db, 'collegeDeadlines', d.id)).catch(() => {});
            } else {
              cloudSoftDeleted.push({
                id: `trash_collegeDeadline_${item.id}`,
                recordType: 'collegeDeadline',
                recordId: item.id,
                title: item.collegeName,
                subtitle: `${item.category} · ${item.appRound} (${item.deadlineDate})`,
                studentId: item.studentId,
                studentName: item.studentName || '',
                deletedAt: item.deletedAt || new Date(delMs).toISOString(),
                purgeAfter: new Date(delMs + SOFT_DELETE_RETENTION_MS).toISOString(),
                recordPayload: { ...item, isDeleted: false, deletedAt: '' },
              });
            }
          } else {
            valid.push(item);
          }
        });
        setCollegeDeadlines(valid);
        if (cloudSoftDeleted.length > 0) {
          setDeletedTrash((prev) => {
            const byKey = new Map(prev.map((t) => [`${t.recordType}_${t.recordId}`, t]));
            for (const c of cloudSoftDeleted) {
              byKey.set(`${c.recordType}_${c.recordId}`, c);
            }
            return Array.from(byKey.values()).sort((a, b) =>
              b.deletedAt.localeCompare(a.deletedAt)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'collegeDeadlines')
    );

    const studentsColRef = collection(db, 'users', uid, 'students');
    const unsubStudents = onSnapshot(
      studentsColRef,
      (snap) => {
        if (snap.empty) return;
        const loaded: StudentChildProfile[] = [];
        const rawDocIds: string[] = [];
        snap.docs.forEach((d) => {
          const data = d.data() as StudentChildProfile;
          if (
            data &&
            !data.isDeleted &&
            data.name &&
            data.id !== 'stu_demo_jordan' &&
            data.id !== 'stu_demo_maya'
          ) {
            const docStuId = data.id || d.id;
            rawDocIds.push(d.id);
            loaded.push({
              id: docStuId,
              name: data.name,
              grade: (Number(data.grade) || 9) as GradeLevel,
              gradYear:
                Number(data.gradYear) ||
                getDefaultGradYearForGrade((Number(data.grade) || 9) as GradeLevel),
              schoolName: data.schoolName || '',
              cityState: data.cityState || '',
              studentEmail: data.studentEmail || '',
              curriculumType: data.curriculumType || 'AP / Honors',
              unweightedGpa: data.unweightedGpa || '',
              weightedGpa: data.weightedGpa || '',
              classRank: data.classRank || '',
              satActScore: data.satActScore || '',
              intendedMajors: data.intendedMajors || '',
              careerInterests: data.careerInterests || '',
              dreamColleges: data.dreamColleges || '',
            });
          }
        });
        if (loaded.length > 0) {
          const dedupedLoaded = deduplicateFamilyStudents(loaded, false);
          const keptIds = new Set(dedupedLoaded.map((s) => s.id));
          // Clean up any duplicate student docs in Firestore that were merged into a canonical child profile
          for (const docId of rawDocIds) {
            if (!keptIds.has(docId)) {
              deleteDoc(doc(db, 'users', uid, 'students', docId)).catch(() => {});
            }
          }
          setFamilyStudents((prev) =>
            deduplicateFamilyStudents([...prev, ...dedupedLoaded], false)
          );
          setActiveStudentId((prevId) => {
            if (prevId && keptIds.has(prevId)) return prevId;
            const savedLocalId = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID);
            if (savedLocalId && keptIds.has(savedLocalId)) return savedLocalId;
            return dedupedLoaded[0].id;
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/students`)
    );

    return () => {
      unsubProfile();
      unsubFamilyProfile();
      unsubStudents();
      unsubActivities();
      unsubJournal();
      unsubHonors();
      unsubEssayDrafts();
      unsubCollegeDeadlines();
    };
  }, [isAuthReady, user, isSampleMode]);

  // Helper to persist a single child profile to Firestore /users/{uid}/students/{studentId}
  const persistStudentChildToFirestore = async (
    uid: string,
    stu: StudentChildProfile
  ) => {
    const cleanId = (stu.id || 'stu_primary').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const stuRef = doc(db, 'users', uid, 'students', cleanId);
    const payload = {
      ownerId: uid,
      id: cleanId,
      name: (stu.name || 'Student').trim().slice(0, 80),
      grade: (Number(stu.grade) || 9) as GradeLevel,
      gradYear:
        Number(stu.gradYear) ||
        getDefaultGradYearForGrade((Number(stu.grade) || 9) as GradeLevel),
      schoolName: (stu.schoolName || '').trim().slice(0, 120),
      cityState: (stu.cityState || '').trim().slice(0, 100),
      studentEmail: (stu.studentEmail || '').trim().slice(0, 120),
      curriculumType: (stu.curriculumType || 'AP / Honors').slice(0, 40),
      unweightedGpa: (stu.unweightedGpa || '').trim().slice(0, 20),
      weightedGpa: (stu.weightedGpa || '').trim().slice(0, 20),
      classRank: (stu.classRank || '').trim().slice(0, 40),
      satActScore: (stu.satActScore || '').trim().slice(0, 60),
      intendedMajors: (stu.intendedMajors || '').trim().slice(0, 160),
      careerInterests: (stu.careerInterests || '').trim().slice(0, 160),
      dreamColleges: (stu.dreamColleges || '').trim().slice(0, 200),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(stuRef, payload);
    } catch {
      try {
        await setDoc(stuRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/students/${cleanId}`);
      }
    }
  };

  // Auto-reconcile & backfill multi-child profiles from cloud activities + siblingsSummary so existing multi-child families (like Lily, Ethan & Grace Chen) restore all children and their exact grades/schools/GPAs automatically
  useEffect(() => {
    if (isSampleMode || isDemoSessionActive) return;
    if (activities.length === 0 && !familyProfile.siblingsSummary) return;

    // Parse siblingsSummary entries like "Lily Chen (Age 11, 6th Grade at Hillside Middle School)"
    const parsedSiblings = new Map<
      string,
      { name: string; grade?: GradeLevel; schoolName?: string }
    >();
    if (familyProfile.siblingsSummary) {
      const parts = familyProfile.siblingsSummary.split(';').map((s) => s.trim());
      for (const part of parts) {
        const m = part.match(
          /^([^(]+)\(\s*(?:Age\s*\d+\s*,\s*)?(\d{1,2})th\s+Grade(?:\s+at\s+([^)]+))?\)/i
        );
        if (m) {
          const sName = m[1].trim();
          const sGrade = Math.min(12, Math.max(6, Number(m[2]) || 9)) as GradeLevel;
          const sSchool = (m[3] || '').trim();
          parsedSiblings.set(sName.toLowerCase(), {
            name: sName,
            grade: sGrade,
            schoolName: sSchool,
          });
        }
      }
    }

    // Group activities by studentId / studentName to discover children & their highest grade
    const activityChildren = new Map<
      string,
      { id: string; name: string; maxGrade: GradeLevel }
    >();
    for (const act of activities) {
      const sName = (act.studentName || '').trim();
      const sId = (act.studentId || '').trim();
      if (!sName && !sId) continue;
      const key = sName ? sName.toLowerCase() : sId;
      const maxG = (
        act.grades && act.grades.length > 0 ? Math.max(...act.grades) : 9
      ) as GradeLevel;
      const existing = activityChildren.get(key);
      if (!existing) {
        activityChildren.set(key, {
          id: sId || `stu_${sName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          name: sName || 'Student',
          maxGrade: maxG,
        });
      } else if (maxG > existing.maxGrade) {
        existing.maxGrade = maxG;
      }
    }

    if (activityChildren.size === 0 && parsedSiblings.size === 0) return;

    let changed = false;
    const nextList = [...familyStudents];
    const familyFullLower = (familyProfile.studentFullName || '').trim().toLowerCase();

    // 1. Repair or add any child found in activities
    for (const [, info] of activityChildren.entries()) {
      const nameLower = info.name.toLowerCase();
      const sibMeta = parsedSiblings.get(nameLower);
      const isSavedFamilyStudent = nameLower === familyFullLower;
      const inferredGrade = sibMeta?.grade || info.maxGrade;
      const inferredGradYear = getDefaultGradYearForGrade(inferredGrade);
      const inferredSchool =
        sibMeta?.schoolName ||
        (isSavedFamilyStudent || inferredGrade >= 9
          ? familyProfile.highSchoolName || ''
          : '');

      const idx = nextList.findIndex(
        (s) => s.id === info.id || s.name.toLowerCase() === nameLower
      );
      if (idx === -1) {
        changed = true;
        nextList.push({
          id: info.id,
          name: info.name,
          grade: inferredGrade,
          gradYear: inferredGradYear,
          schoolName: inferredSchool,
          cityState: familyProfile.highSchoolCityState || '',
          studentEmail: isSavedFamilyStudent ? familyProfile.studentEmail || '' : '',
          curriculumType: isSavedFamilyStudent
            ? familyProfile.curriculumType || 'AP / Honors'
            : 'AP / Honors',
          unweightedGpa: isSavedFamilyStudent ? familyProfile.unweightedGpa || '' : '',
          weightedGpa: isSavedFamilyStudent ? familyProfile.weightedGpa || '' : '',
          classRank: isSavedFamilyStudent ? familyProfile.classRank || '' : '',
          satActScore: isSavedFamilyStudent ? familyProfile.satActScore || '' : '',
          intendedMajors: isSavedFamilyStudent ? familyProfile.intendedMajors || '' : '',
          careerInterests: isSavedFamilyStudent ? familyProfile.careerInterests || '' : '',
          dreamColleges: isSavedFamilyStudent ? profile.dreamColleges || '' : '',
        });
      } else {
        const cur = nextList[idx];
        // If this child was saved with a stale grade (e.g. Grace restored as 9th grade when her activities are 11th-12th) or missing school/academic fields
        const needsGradeFix =
          cur.id === 'stu_primary' &&
          cur.grade === 9 &&
          info.maxGrade > 9 &&
          isSavedFamilyStudent;
        const nextGrade = needsGradeFix ? inferredGrade : cur.grade;
        const nextSchool = cur.schoolName || inferredSchool;
        const nextId =
          cur.id === 'stu_primary' && info.id && info.id !== 'stu_primary'
            ? info.id
            : cur.id;
        const nextColleges =
          cur.dreamColleges !== undefined
            ? cur.dreamColleges
            : isSavedFamilyStudent
              ? profile.dreamColleges || ''
              : '';
        const nextMajors =
          cur.intendedMajors !== undefined
            ? cur.intendedMajors
            : isSavedFamilyStudent
              ? familyProfile.intendedMajors || ''
              : '';

        if (
          needsGradeFix ||
          nextSchool !== cur.schoolName ||
          nextId !== cur.id ||
          nextColleges !== (cur.dreamColleges || '') ||
          nextMajors !== (cur.intendedMajors || '')
        ) {
          changed = true;
          nextList[idx] = {
            ...cur,
            id: nextId,
            grade: nextGrade,
            gradYear: getDefaultGradYearForGrade(nextGrade),
            schoolName: nextSchool,
            dreamColleges: nextColleges,
            intendedMajors: nextMajors,
            careerInterests:
              cur.careerInterests ??
              (isSavedFamilyStudent ? familyProfile.careerInterests || '' : ''),
            unweightedGpa:
              cur.unweightedGpa ??
              (isSavedFamilyStudent ? familyProfile.unweightedGpa || '' : ''),
            weightedGpa:
              cur.weightedGpa ??
              (isSavedFamilyStudent ? familyProfile.weightedGpa || '' : ''),
            satActScore:
              cur.satActScore ??
              (isSavedFamilyStudent ? familyProfile.satActScore || '' : ''),
          };
        }
      }
    }

    const dedupedNext = deduplicateFamilyStudents(nextList, isDemoSessionActive);
    if (changed || dedupedNext.length !== familyStudents.length) {
      setFamilyStudents(dedupedNext);
      if (
        !dedupedNext.some((s) => s.id === activeStudentId) &&
        dedupedNext.length > 0
      ) {
        const matchedActive =
          dedupedNext.find((s) => s.name.toLowerCase() === familyFullLower) ||
          dedupedNext[0];
        setActiveStudentId(matchedActive.id);
      }
      if (user) {
        const keptIds = new Set(dedupedNext.map((s) => s.id));
        for (const oldStu of familyStudents) {
          if (oldStu.id && !keptIds.has(oldStu.id)) {
            deleteDoc(doc(db, 'users', user.uid, 'students', oldStu.id)).catch(
              () => {}
            );
          }
        }
        for (const s of dedupedNext) {
          void persistStudentChildToFirestore(user.uid, s);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, familyProfile.siblingsSummary, familyProfile.studentFullName, user]);

  // Self-heal any duplicate children in familyStudents state (e.g. from cached localStorage or duplicate IDs)
  useEffect(() => {
    if (familyStudents.length <= 1) return;
    const deduped = deduplicateFamilyStudents(familyStudents, isDemoSessionActive);
    if (deduped.length !== familyStudents.length) {
      setFamilyStudents(deduped);
      if (!deduped.some((s) => s.id === activeStudentId) && deduped.length > 0) {
        setActiveStudentId(deduped[0].id);
      }
      if (user) {
        const keptIds = new Set(deduped.map((s) => s.id));
        for (const oldStu of familyStudents) {
          if (oldStu.id && !keptIds.has(oldStu.id)) {
            deleteDoc(doc(db, 'users', user.uid, 'students', oldStu.id)).catch(
              () => {}
            );
          }
        }
      }
    }
  }, [familyStudents, activeStudentId, isDemoSessionActive, user]);

  // Helper to award XP
  const awardXp = async (
    points: number,
    isJournalEntry = false,
    reason = ''
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let computedXp = profile.xp + points;
    let computedStreak = profile.streakDays || 0;
    let computedLastCheckIn = profile.lastCheckInDate;

    setProfile((prev) => {
      let nextStreak = prev.streakDays || 0;
      if (isJournalEntry) {
        if (prev.lastCheckInDate !== todayStr) {
          nextStreak += 1;
        } else if (nextStreak === 0) {
          nextStreak = 1;
        }
      }
      computedXp = (prev.xp || 0) + points;
      computedStreak = nextStreak;
      computedLastCheckIn = isJournalEntry ? todayStr : prev.lastCheckInDate;
      return {
        ...prev,
        xp: computedXp,
        streakDays: computedStreak,
        lastCheckInDate: computedLastCheckIn,
      };
    });

    if (reason) {
      showToast(`+${points} XP — ${reason}`);
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          xp: computedXp,
          streakDays: computedStreak,
          lastCheckInDate: computedLastCheckIn,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  // Update Current Grade (updates both active child and profile)
  const handleGradeChange = async (grade: GradeLevel) => {
    const gradYear = getDefaultGradYearForGrade(grade);
    const updated: UserProfile = {
      ...profile,
      currentGrade: grade,
      gradYear,
    };
    setProfile(updated);
    setFamilyStudents((prev) =>
      prev.map((s) => {
        if (s.id === activeStudentId || (prev.length === 1 && s.id === prev[0].id)) {
          const updatedStu = { ...s, grade, gradYear };
          if (user) {
            void persistStudentChildToFirestore(user.uid, updatedStu);
          }
          return updatedStu;
        }
        return s;
      })
    );
    showToast(`Current grade updated to ${grade}th Grade (Class of ${gradYear})`);

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          currentGrade: grade,
          gradYear,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  // Switch active student when a family has multiple kids (strictly isolates each child's school, GPA, testing, majors & dream colleges)
  const handleSwitchActiveStudent = (studentId: string) => {
    const found = familyStudents.find((s) => s.id === studentId);
    if (!found) return;
    setActiveStudentId(found.id);
    setRegEditingStudentId(found.id);
    const firstName = found.name.split(' ')[0] || found.name;
    const siblingList = familyStudents.filter((s) => s.id !== found.id);
    const dynamicSiblingsSummary =
      siblingList.length > 0
        ? siblingList
            .map((sib) => {
              const approxAge = sib.grade + 5;
              const sch = sib.schoolName ? ` at ${sib.schoolName}` : '';
              return `${sib.name} (Age ${approxAge}, ${sib.grade}th Grade${sch})`;
            })
            .join('; ')
        : '';

    const nextProfile: UserProfile = {
      ...profile,
      displayName: firstName,
      currentGrade: found.grade,
      gradYear: found.gradYear || getDefaultGradYearForGrade(found.grade),
      dreamColleges: found.dreamColleges || '',
    };
    const nextFamily: FamilyProfileItem = {
      ...familyProfile,
      studentFullName: found.name,
      preferredName: firstName,
      highSchoolName: found.schoolName || '',
      highSchoolCityState: found.cityState || familyProfile.highSchoolCityState,
      studentEmail: found.studentEmail || '',
      curriculumType: found.curriculumType || 'AP / Honors',
      unweightedGpa: found.unweightedGpa || '',
      weightedGpa: found.weightedGpa || '',
      classRank: found.classRank || '',
      satActScore: found.satActScore || '',
      intendedMajors: found.intendedMajors || '',
      careerInterests: found.careerInterests || '',
      siblingsCount: siblingList.length,
      siblingsSummary: dynamicSiblingsSummary,
      activeStudentId: found.id,
    };
    setProfile(nextProfile);
    setFamilyProfile(nextFamily);
    setRegStudentName(found.name);
    setRegGrade(found.grade);
    setRegSchoolName(found.schoolName || '');
    setRegCityState(found.cityState || familyProfile.highSchoolCityState || '');
    setRegStudentEmail(found.studentEmail || '');
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID, found.id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(nextProfile));
    localStorage.setItem(LOCAL_STORAGE_KEYS.FAMILY_PROFILE, JSON.stringify(nextFamily));
    if (user) {
      const familyDocRef = doc(db, 'users', user.uid, 'familyProfile', 'main');
      void updateDoc(familyDocRef, {
        activeStudentId: found.id,
        studentFullName: found.name,
        preferredName: firstName,
        highSchoolName: found.schoolName || '',
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    showToast(`Switched active portfolio to ${found.name} (${found.grade}th Grade)`);
  };

  // Quick-add a sibling/child from inside ActivityModal or Overview (starts with clean per-child fields)
  const handleQuickAddStudent = (
    name: string,
    grade: GradeLevel,
    schoolName = ''
  ): StudentChildProfile => {
    const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 80);
    const gradYear = getDefaultGradYearForGrade(grade);
    const existingMatch = familyStudents.find(
      (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    const newStudent: StudentChildProfile = existingMatch
      ? {
          ...existingMatch,
          name: cleanName,
          grade,
          gradYear,
          schoolName: (schoolName || existingMatch.schoolName || '').trim(),
        }
      : {
          id: `stu_${Date.now()}`,
          name: cleanName,
          grade,
          gradYear,
          schoolName: (schoolName || '').trim(),
          cityState: familyProfile.highSchoolCityState || '',
          studentEmail: '',
          curriculumType: 'AP / Honors',
          unweightedGpa: '',
          weightedGpa: '',
          classRank: '',
          satActScore: '',
          intendedMajors: '',
          careerInterests: '',
          dreamColleges: '',
        };
    const nextList = deduplicateFamilyStudents(
      [...familyStudents, newStudent],
      isDemoSessionActive
    );
    setFamilyStudents(nextList);
    setActiveStudentId(newStudent.id);
    setRegEditingStudentId(newStudent.id);

    const nextProfile: UserProfile = {
      ...profile,
      displayName: cleanName.split(' ')[0] || cleanName,
      currentGrade: grade,
      gradYear,
      dreamColleges: '',
    };
    const nextFamily: FamilyProfileItem = {
      ...familyProfile,
      studentFullName: cleanName,
      preferredName: cleanName.split(' ')[0] || cleanName,
      highSchoolName: newStudent.schoolName,
      unweightedGpa: '',
      weightedGpa: '',
      classRank: '',
      satActScore: '',
      intendedMajors: '',
      careerInterests: '',
      siblingsCount: Math.max(0, nextList.length - 1),
      activeStudentId: newStudent.id,
    };
    setProfile(nextProfile);
    setFamilyProfile(nextFamily);
    localStorage.setItem(LOCAL_STORAGE_KEYS.FAMILY_STUDENTS, JSON.stringify(nextList));
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID, newStudent.id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(nextProfile));
    localStorage.setItem(LOCAL_STORAGE_KEYS.FAMILY_PROFILE, JSON.stringify(nextFamily));
    if (user) {
      void persistStudentChildToFirestore(user.uid, newStudent);
    }
    showToast(`Added ${cleanName} (${grade}th Grade) to your family portfolio`);
    return newStudent;
  };

  // Save Student & Family Profile
  const handleSaveProfileAndFamily = async (
    updatedUser: Partial<UserProfile>,
    updatedFamily: FamilyProfileItem,
    targetStudentId?: string
  ) => {
    // Save an automatic pre-overwrite snapshot if family profile already has student data
    if (familyProfile.studentFullName || familyStudents.length > 0) {
      capturePortfolioSnapshot(
        `Pre-Overwrite: Profile Update (${updatedFamily.studentFullName || familyProfile.studentFullName || 'Student'})`,
        updatedFamily.studentFullName || familyProfile.studentFullName,
        'bulk'
      );
    }
    const nextProfile: UserProfile = {
      ...profile,
      ...updatedUser,
    };
    setProfile(nextProfile);
    setFamilyProfile(updatedFamily);

    // Sync registration form fields immediately so reopening Step 1 always shows the saved info
    if (updatedFamily.studentFullName) {
      setRegStudentName(updatedFamily.studentFullName);
    }
    if (updatedUser.currentGrade) {
      setRegGrade(updatedUser.currentGrade);
    }
    if (updatedFamily.highSchoolName !== undefined) {
      setRegSchoolName(updatedFamily.highSchoolName);
    }
    if (updatedFamily.highSchoolCityState !== undefined) {
      setRegCityState(updatedFamily.highSchoolCityState);
    }
    if (updatedFamily.studentEmail !== undefined) {
      setRegStudentEmail(updatedFamily.studentEmail);
    }
    if (updatedFamily.parentEmail !== undefined) {
      setRegParentEmail(updatedFamily.parentEmail);
    }
    if (updatedFamily.parent2Email !== undefined) {
      setRegParent2Email(updatedFamily.parent2Email);
    }

    // Upsert into familyStudents array so multi-child selector always stays in sync
    let nextStudentsList = [...familyStudents];
    const cleanChildName = (
      updatedFamily.studentFullName ||
      nextProfile.displayName ||
      ''
    ).trim();
    if (cleanChildName) {
      const effectiveId =
        targetStudentId ||
        activeStudentId ||
        nextStudentsList[0]?.id ||
        'stu_primary';
      const childEntry: StudentChildProfile = {
        id: effectiveId,
        name: cleanChildName,
        grade: nextProfile.currentGrade,
        gradYear: nextProfile.gradYear,
        schoolName: updatedFamily.highSchoolName || '',
        cityState: updatedFamily.highSchoolCityState || '',
        studentEmail: updatedFamily.studentEmail || '',
        curriculumType: updatedFamily.curriculumType || 'AP / Honors',
        unweightedGpa: updatedFamily.unweightedGpa || '',
        weightedGpa: updatedFamily.weightedGpa || '',
        classRank: updatedFamily.classRank || '',
        satActScore: updatedFamily.satActScore || '',
        intendedMajors: updatedFamily.intendedMajors || '',
        careerInterests: updatedFamily.careerInterests || '',
        dreamColleges: nextProfile.dreamColleges || '',
      };
      const existingIdx = nextStudentsList.findIndex(
        (s) =>
          s.id === effectiveId ||
          s.name.toLowerCase() === cleanChildName.toLowerCase()
      );
      let resolvedId = childEntry.id;
      if (existingIdx >= 0) {
        resolvedId = nextStudentsList[existingIdx].id;
        nextStudentsList[existingIdx] = {
          ...nextStudentsList[existingIdx],
          ...childEntry,
          id: resolvedId,
        };
      } else {
        nextStudentsList = [...nextStudentsList, childEntry];
      }
      nextStudentsList = deduplicateFamilyStudents(
        nextStudentsList,
        isDemoSessionActive
      );
      const finalMatched =
        nextStudentsList.find(
          (s) =>
            s.id === resolvedId ||
            s.name.toLowerCase() === cleanChildName.toLowerCase()
        ) || nextStudentsList[0];
      if (finalMatched) {
        resolvedId = finalMatched.id;
        setActiveStudentId(resolvedId);
      }
      setFamilyStudents(nextStudentsList);
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.FAMILY_STUDENTS,
        JSON.stringify(nextStudentsList)
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID,
        resolvedId
      );
    }

    // Recompute siblingsSummary across all children in nextStudentsList
    const activeSavedId =
      targetStudentId || activeStudentId || nextStudentsList[0]?.id || 'stu_primary';
    const otherSiblings = nextStudentsList.filter((s) => s.id !== activeSavedId);
    const syncedFamily: FamilyProfileItem = {
      ...updatedFamily,
      siblingsCount: Math.max(0, nextStudentsList.length - 1),
      siblingsSummary:
        otherSiblings.length > 0
          ? otherSiblings
              .map((sib) => {
                const approxAge = sib.grade + 5;
                const sch = sib.schoolName ? ` at ${sib.schoolName}` : '';
                return `${sib.name} (Age ${approxAge}, ${sib.grade}th Grade${sch})`;
              })
              .join('; ')
          : updatedFamily.siblingsSummary,
      activeStudentId: activeSavedId,
      familyShareCode: secureFamilyShareCode(
        updatedFamily.familyShareCode,
        familyProfile.familyShareCode
      ),
    };
    setFamilyProfile(syncedFamily);

    // Persist immediately to localStorage whether signed in or not
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.PROFILE,
      JSON.stringify(nextProfile)
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.FAMILY_PROFILE,
      JSON.stringify(syncedFamily)
    );

    if (user) {
      try {
        // Persist EVERY child in nextStudentsList to /users/{uid}/students/{studentId}
        await Promise.allSettled(
          nextStudentsList.map((stu) => persistStudentChildToFirestore(user.uid, stu))
        );

        const userRef = doc(db, 'users', user.uid);
        try {
          await updateDoc(userRef, {
            displayName: nextProfile.displayName,
            currentGrade: nextProfile.currentGrade,
            gradYear: nextProfile.gradYear,
            dreamColleges: nextProfile.dreamColleges,
            updatedAt: serverTimestamp(),
          });
        } catch {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: nextProfile.displayName,
            currentGrade: nextProfile.currentGrade,
            gradYear: nextProfile.gradYear,
            dreamColleges: nextProfile.dreamColleges,
            xp: nextProfile.xp || 0,
            streakDays: nextProfile.streakDays || 0,
            lastCheckInDate: nextProfile.lastCheckInDate || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const familyDocRef = doc(db, 'users', user.uid, 'familyProfile', 'main');
        const {
          createdAt: _rawCreatedAt,
          updatedAt: _rawUpdatedAt,
          ...sanitizedFamily
        } = syncedFamily;
        try {
          await updateDoc(familyDocRef, {
            ...sanitizedFamily,
            ownerId: user.uid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          await setDoc(familyDocRef, {
            ...sanitizedFamily,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast(
          `Saved ${cleanChildName || 'Student'} (${nextProfile.currentGrade}th Grade) to your family portfolio`
        );
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/familyProfile/main`
        );
      }
    } else {
      showToast(
        `Saved ${cleanChildName || 'Student'} (${nextProfile.currentGrade}th Grade) — Step 1 complete!`
      );
    }

    // Publish to Shared Student + Parent Family Sync Hub
    try {
      const code =
        syncedFamily.familyShareCode;
      await fetch('/api/family-sync/publish', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify({
          familyShareCode: code,
          studentEmail: syncedFamily.studentEmail || '',
          parentEmail: syncedFamily.parentEmail || user?.email || '',
          parent2Email: syncedFamily.parent2Email || '',
          profile: nextProfile,
          familyProfile: { ...syncedFamily, familyShareCode: code },
          familyStudents: nextStudentsList,
          activeStudentId: activeSavedId,
          activities,
          journalEntries,
          honors,
          essayDrafts,
          collegeDeadlines,
        }),
      });
    } catch {
      // Ignore background sync errors
    }
  };

  // Pull Shared Family Portfolio by Family Share Code or Linked Email (Parent <-> Student)
  const handlePullSharedFamilyPortfolio = async (
    codeOrEmail: string
  ): Promise<boolean> => {
    const clean = codeOrEmail.trim();
    if (!clean) return false;
    try {
      const isEmail = clean.includes('@');
      const res = await fetch('/api/family-sync/lookup', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify(
          isEmail ? { email: clean } : { familyShareCode: clean }
        ),
      });
      const data = await res.json();
      if (data.found && data.bundle) {
        const b = data.bundle;
        if (
          isDemoProfileData(b.profile as UserProfile) ||
          isDemoFamilyData(b.familyProfile as FamilyProfileItem)
        ) {
          return false;
        }
        // Save an automatic snapshot before bulk family sync overwrite
        if (
          familyProfile.studentFullName ||
          familyStudents.length > 0 ||
          activities.length > 0
        ) {
          capturePortfolioSnapshot(
            `Pre-Overwrite: Family Sync (${clean})`,
            familyProfile.studentFullName || profile.displayName,
            'bulk'
          );
        }
        if (b.profile) setProfile(b.profile as UserProfile);
        if (b.familyProfile)
          setFamilyProfile(b.familyProfile as FamilyProfileItem);
        if (Array.isArray(b.familyStudents) && b.familyStudents.length > 0) {
          const dedupedPulled = deduplicateFamilyStudents(
            b.familyStudents as StudentChildProfile[],
            isDemoSessionActive
          );
          setFamilyStudents(dedupedPulled);
          if (b.activeStudentId && dedupedPulled.some((s) => s.id === String(b.activeStudentId))) {
            setActiveStudentId(String(b.activeStudentId));
          } else if (dedupedPulled.length > 0) {
            setActiveStudentId(dedupedPulled[0].id);
          }
        }
        if (Array.isArray(b.activities))
          setActivities(
            (b.activities as ActivityItem[]).filter(
              (a) => !isDemoActivityItem(a)
            )
          );
        if (Array.isArray(b.journalEntries))
          setJournalEntries(
            (b.journalEntries as JournalEntryItem[]).filter(
              (j) => !isDemoJournalItem(j)
            )
          );
        if (Array.isArray(b.honors))
          setHonors(
            (b.honors as HonorAwardItem[]).filter((h) => !isDemoHonorItem(h))
          );
        if (Array.isArray(b.essayDrafts))
          setEssayDrafts(
            (b.essayDrafts as EssayDraftItem[]).filter(
              (e) => !isDemoEssayDraftItem(e)
            )
          );
        if (Array.isArray(b.collegeDeadlines))
          setCollegeDeadlines(
            (b.collegeDeadlines as CollegeDeadlineItem[]).filter(
              (c) => !isDemoCollegeDeadlineItem(c)
            )
          );
        showToast(
          `Synced shared portfolio (${b.familyShareCode}) across Parent & Student accounts!`
        );
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Apply AI Admissions Coach 150-char upgrade to an activity
  const handleApplyActivityDescriptionUpgrade = async (
    activityId: string,
    upgradedDescription: string
  ) => {
    const cleanDesc = upgradedDescription.trim().slice(0, 150);
    if (user) {
      try {
        await updateDoc(doc(db, 'activities', activityId), {
          description: cleanDesc,
          updatedAt: serverTimestamp(),
        });
        showToast('Applied AI 150-character Common App upgrade!');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `activities/${activityId}`
        );
      }
    } else {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId ? { ...a, description: cleanDesc } : a
        )
      );
      showToast('Applied AI 150-character Common App upgrade!');
    }
  };

  // Save Activity from Modal
  const handleSaveActivity = async (
    data: Omit<ActivityItem, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    const normalizedScore = Math.min(
      5,
      Math.max(1, Math.round(Number(data.impactScore) || 4))
    );
    const targetId = existingId || editingActivity?.id;

    // Resolve studentId & studentName for multi-child portfolios
    const activeStudent =
      familyStudents.find((s) => s.id === (data.studentId || activeStudentId)) ||
      familyStudents[0];
    const resolvedStudentId =
      data.studentId || activeStudent?.id || activeStudentId || 'stu_primary';
    const resolvedStudentName =
      data.studentName ||
      activeStudent?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      '';

    // Ensure no two activities for the same child ever share the same Common App Top 10 slot (1..10)
    let resolvedCommonAppSlot = data.commonAppSlot ?? 0;
    if (resolvedCommonAppSlot >= 1 && resolvedCommonAppSlot <= 10) {
      const resolvedNameLower = resolvedStudentName.trim().toLowerCase();
      const childUsedSlots = new Set<number>();
      for (const act of activities) {
        if (targetId && act.id === targetId) continue;
        const sameId =
          act.studentId &&
          resolvedStudentId &&
          act.studentId === resolvedStudentId;
        const sameName =
          act.studentName &&
          resolvedNameLower &&
          act.studentName.trim().toLowerCase() === resolvedNameLower;
        if (sameId || sameName) {
          if (
            act.commonAppSlot >= 1 &&
            act.commonAppSlot <= 10 &&
            act.grades?.some((g) => g >= 9)
          ) {
            childUsedSlots.add(act.commonAppSlot);
          }
        }
      }
      if (childUsedSlots.has(resolvedCommonAppSlot)) {
        let nextFree = 0;
        for (let s = 1; s <= 10; s++) {
          if (!childUsedSlots.has(s)) {
            nextFree = s;
            break;
          }
        }
        resolvedCommonAppSlot = nextFree;
      }
    }

    // Strip undefined fields before sending to Firestore
    const cleanFirestoreData: Record<string, unknown> = {
      ...data,
      commonAppSlot: resolvedCommonAppSlot,
      impactScore: normalizedScore,
      studentId: resolvedStudentId,
      studentName: resolvedStudentName,
    };
    Object.keys(cleanFirestoreData).forEach((k) => {
      if (cleanFirestoreData[k] === undefined) {
        delete cleanFirestoreData[k];
      }
    });

    const ownerId = user ? user.uid : 'demo_student';
    const savedActId = targetId || `act_${Date.now()}`;
    const trimmedNotes = (data.extendedNotes || '').trim();

    if (targetId) {
      const updatedItem: ActivityItem = {
        ...data,
        commonAppSlot: resolvedCommonAppSlot,
        impactScore: normalizedScore,
        studentId: resolvedStudentId,
        studentName: resolvedStudentName,
        id: targetId,
        ownerId,
      };
      setActivities((prev) =>
        prev.map((a) => (a.id === targetId ? updatedItem : a))
      );
      if (user) {
        try {
          await updateDoc(doc(db, 'activities', targetId), {
            ...cleanFirestoreData,
            updatedAt: serverTimestamp(),
          });
          showToast('Activity updated');
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `activities/${targetId}`
          );
        }
      } else {
        showToast('Activity updated');
      }
      setEditingActivity(null);
    } else {
      const newItem: ActivityItem = {
        ...data,
        commonAppSlot: resolvedCommonAppSlot,
        impactScore: normalizedScore,
        studentId: resolvedStudentId,
        studentName: resolvedStudentName,
        id: savedActId,
        ownerId,
      };
      setActivities((prev) => [newItem, ...prev]);
      if (user) {
        try {
          await setDoc(doc(db, 'activities', savedActId), {
            ...cleanFirestoreData,
            ownerId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `activities/${savedActId}`
          );
        }
      }
      await awardXp(
        60,
        Boolean(trimmedNotes),
        resolvedStudentName
          ? `Activity added for ${resolvedStudentName}`
          : 'Activity added to portfolio'
      );
    }

    // Sync any reflection written inside the activity builder directly into Journal Entries
    if (trimmedNotes) {
      const todayStr = new Date().toISOString().split('T')[0];
      const reflectionGrade: GradeLevel =
        data.grades && data.grades.length > 0
          ? data.grades[data.grades.length - 1]
          : profile.currentGrade;
      const existingLinked = journalEntries.find(
        (j) =>
          j.linkedActivityId === savedActId &&
          (j.promptUsed === 'Activity Reflection' ||
            j.id === `jrn_act_${savedActId}`)
      );
      const journalId = existingLinked?.id || `jrn_act_${savedActId}`;
      const entryFields = {
        ownerId,
        studentId: resolvedStudentId,
        studentName: resolvedStudentName,
        title: `${data.organization} — ${data.position}`.slice(0, 100),
        content: trimmedNotes.slice(0, 3000),
        promptUsed: 'Activity Reflection',
        gradeLevel: reflectionGrade,
        linkedActivityId: savedActId,
        linkedActivityTitle: data.organization.slice(0, 100),
        mood: (existingLinked?.mood || 'Proud') as JournalMood,
        hoursLogged: existingLinked?.hoursLogged || 1,
        isEssaySeed: existingLinked?.isEssaySeed ?? false,
        entryDate: existingLinked?.entryDate || todayStr,
      };
      const syncedJournal: JournalEntryItem = {
        id: journalId,
        ...entryFields,
      };
      setJournalEntries((prev) => {
        const exists = prev.some((j) => j.id === journalId);
        if (exists) {
          return prev.map((j) => (j.id === journalId ? syncedJournal : j));
        }
        return [syncedJournal, ...prev];
      });
      if (user) {
        try {
          await setDoc(
            doc(db, 'journals', journalId),
            {
              ...entryFields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `journals/${journalId}`
          );
        }
      }
      if (targetId) {
        await awardXp(20, true, 'Activity reflection synced to Journal');
      }
    }
  };

  // Inline Update Impact Score on Card
  const handleUpdateImpactScore = async (
    act: ActivityItem,
    newScore: number
  ) => {
    const validScore = Math.min(5, Math.max(1, Math.round(newScore)));
    if (act.impactScore === validScore) return;

    if (user) {
      try {
        await updateDoc(doc(db, 'activities', act.id), {
          impactScore: validScore,
          updatedAt: serverTimestamp(),
        });
        showToast(`Impact score updated to ${validScore}/5`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `activities/${act.id}`);
      }
    } else {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === act.id ? { ...a, impactScore: validScore } : a
        )
      );
      showToast(`Impact score updated to ${validScore}/5`);
    }
  };

  // Inline Quick Reflection from Activity Card
  const handleAddQuickReflection = async (
    act: ActivityItem,
    reflectionText: string,
    mood: JournalMood
  ) => {
    const newId = `jrn_${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const ownerId = user ? user.uid : 'demo_student';
    const activeStu =
      familyStudents.find((s) => s.id === activeStudentId) || familyStudents[0];
    const resolvedStuId = act.studentId || activeStu?.id;
    const resolvedStuName =
      act.studentName ||
      activeStu?.name ||
      familyProfile.studentFullName.trim() ||
      profile.displayName;
    const entryFields = {
      ownerId,
      ...(resolvedStuId ? { studentId: resolvedStuId } : {}),
      ...(resolvedStuName ? { studentName: resolvedStuName } : {}),
      title: `${act.organization} — ${act.position}`.slice(0, 100),
      content: reflectionText.slice(0, 3000),
      promptUsed: 'Activity Reflection',
      gradeLevel: profile.currentGrade,
      linkedActivityId: act.id,
      linkedActivityTitle: act.organization.slice(0, 100),
      mood,
      hoursLogged: 1,
      isEssaySeed: false,
      entryDate: todayStr,
    };
    const newEntry: JournalEntryItem = {
      id: newId,
      ...entryFields,
    };

    if (user) {
      try {
        await setDoc(doc(db, 'journals', newId), {
          ...entryFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `journals/${newId}`);
      }
    } else {
      setJournalEntries((prev) => [newEntry, ...prev]);
    }
    await awardXp(30, true, 'Reflection saved');
  };

  // Toggle Essay Seed Bookmark on Reflection Card
  const handleToggleEssaySeed = async (entry: JournalEntryItem) => {
    const nextVal = !entry.isEssaySeed;
    if (user) {
      try {
        await setDoc(
          doc(db, 'journals', entry.id),
          {
            ...entry,
            isEssaySeed: nextVal,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `journals/${entry.id}`);
      }
    } else {
      setJournalEntries((prev) => {
        const exists = prev.some((j) => j.id === entry.id);
        if (exists) {
          return prev.map((j) =>
            j.id === entry.id ? { ...j, isEssaySeed: nextVal } : j
          );
        }
        return [{ ...entry, isEssaySeed: nextVal }, ...prev];
      });
    }
    showToast(
      nextVal
        ? 'Bookmarked as a College Essay Seed'
        : 'Removed Essay Seed bookmark'
    );
  };

  // Quick Daily Check-in Submit
  const handleQuickDailyCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMemoryText.trim()) return;
    setSavingQuickMemory(true);
    try {
      const newId = `jrn_${Date.now()}`;
      const todayStr = new Date().toISOString().split('T')[0];
      const activePromptObj =
        JOURNAL_PROMPTS[promptIndex % JOURNAL_PROMPTS.length];
      const ownerId = user ? user.uid : 'demo_student';
      const activeStu =
        familyStudents.find((s) => s.id === activeStudentId) ||
        familyStudents[0];
      const resolvedStuId = activeStu?.id;
      const resolvedStuName =
        activeStu?.name ||
        familyProfile.studentFullName.trim() ||
        profile.displayName;
      const entryFields = {
        ownerId,
        ...(resolvedStuId ? { studentId: resolvedStuId } : {}),
        ...(resolvedStuName ? { studentName: resolvedStuName } : {}),
        title: `${activePromptObj.label} (${profile.currentGrade}th Grade)`.slice(0, 100),
        content: quickMemoryText.trim().slice(0, 3000),
        promptUsed: activePromptObj.prompt.slice(0, 160),
        gradeLevel: profile.currentGrade,
        linkedActivityId: '',
        linkedActivityTitle: '',
        mood: quickMemoryMood,
        hoursLogged: 1,
        isEssaySeed: false,
        entryDate: todayStr,
      };
      const newEntry: JournalEntryItem = {
        id: newId,
        ...entryFields,
      };

      if (user) {
        await setDoc(doc(db, 'journals', newId), {
          ...entryFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        setJournalEntries((prev) => [newEntry, ...prev]);
      }
      setQuickMemoryText('');
      await awardXp(40, true, 'Daily reflection logged');
    } catch (err) {
      if (user) {
        handleFirestoreError(err, OperationType.CREATE, 'journals');
      }
    } finally {
      setSavingQuickMemory(false);
    }
  };

  // Toggle Star for College Top 10 (High School Grades 9–12 only)
  const handleToggleStarActivity = async (act: ActivityItem) => {
    const isCurrentlyStarred =
      act.commonAppSlot >= 1 && act.commonAppSlot <= 10;
    const hasHighSchoolGrade = act.grades.some((g) => g >= 9);
    let nextSlot = 0;

    if (!isCurrentlyStarred) {
      if (!hasHighSchoolGrade) {
        showToast(
          'Common App Top 10 slots are for High School (Grades 9–12). Middle school activities (Grades 6–8) are saved as your Foundation.'
        );
        return;
      }
      const used = new Set(
        studentScopedActivities
          .filter(
            (a) =>
              a.commonAppSlot >= 1 &&
              a.commonAppSlot <= 10 &&
              a.grades.some((g) => g >= 9)
          )
          .map((a) => a.commonAppSlot)
      );
      for (let s = 1; s <= 10; s++) {
        if (!used.has(s)) {
          nextSlot = s;
          break;
        }
      }
      if (nextSlot === 0) {
        showToast('All 10 Common App slots are currently filled.');
        return;
      }
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'activities', act.id), {
          commonAppSlot: nextSlot,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `activities/${act.id}`);
      }
    } else {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === act.id ? { ...a, commonAppSlot: nextSlot } : a
        )
      );
    }
    showToast(
      nextSlot > 0
        ? `Added to Common App Top 10 (#${nextSlot})`
        : 'Removed from Common App Top 10'
    );
  };

  // Swap Slots in CommonAppExportView (scoped to active student)
  const handleSwapSlots = async (
    activityA: ActivityItem,
    newSlotA: number
  ) => {
    const clampedSlot = Math.max(0, Math.min(10, newSlotA));
    const existingInTarget =
      clampedSlot > 0
        ? studentScopedActivities.find(
            (a) => a.commonAppSlot === clampedSlot && a.id !== activityA.id
          )
        : undefined;

    if (user) {
      try {
        await updateDoc(doc(db, 'activities', activityA.id), {
          commonAppSlot: clampedSlot,
          updatedAt: serverTimestamp(),
        });
        if (existingInTarget) {
          await updateDoc(doc(db, 'activities', existingInTarget.id), {
            commonAppSlot: activityA.commonAppSlot,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'activities');
      }
    } else {
      setActivities((prev) =>
        prev.map((a) => {
          if (a.id === activityA.id) {
            return { ...a, commonAppSlot: clampedSlot };
          }
          if (existingInTarget && a.id === existingInTarget.id) {
            return { ...a, commonAppSlot: activityA.commonAppSlot };
          }
          return a;
        })
      );
    }
  };

  // Save Journal Entry from Modal
  const handleSaveJournal = async (
    data: Omit<JournalEntryItem, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    const targetId = existingId || editingJournal?.id;
    const ownerId = user ? user.uid : 'demo_student';
    const activeStu =
      familyStudents.find((s) => s.id === (data.studentId || activeStudentId)) ||
      familyStudents.find((s) => s.id === activeStudentId) ||
      familyStudents[0];
    const resolvedStudentId =
      data.studentId || editingJournal?.studentId || activeStu?.id;
    const resolvedStudentName =
      data.studentName ||
      editingJournal?.studentName ||
      activeStu?.name ||
      familyProfile.studentFullName.trim() ||
      profile.displayName;
    const payloadWithStudent = {
      ...data,
      ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
      ...(resolvedStudentName ? { studentName: resolvedStudentName } : {}),
    };

    if (targetId) {
      const updatedItem: JournalEntryItem = {
        ...payloadWithStudent,
        id: targetId,
        ownerId,
      };
      if (user) {
        try {
          await updateDoc(doc(db, 'journals', targetId), {
            ...payloadWithStudent,
            updatedAt: serverTimestamp(),
          });
          showToast('Reflection updated');
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `journals/${targetId}`
          );
        }
      } else {
        setJournalEntries((prev) =>
          prev.map((j) => (j.id === targetId ? updatedItem : j))
        );
        showToast('Reflection updated');
      }
      setEditingJournal(null);
    } else {
      const newId = `jrn_${Date.now()}`;
      const newItem: JournalEntryItem = {
        ...payloadWithStudent,
        id: newId,
        ownerId,
      };
      if (user) {
        try {
          await setDoc(doc(db, 'journals', newId), {
            ...payloadWithStudent,
            ownerId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `journals/${newId}`);
        }
      } else {
        setJournalEntries((prev) => [newItem, ...prev]);
      }
      await awardXp(40, true, 'Reflection entry saved');
    }
  };

  // Save Honor from Modal
  const handleSaveHonor = async (
    data: Omit<HonorAwardItem, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    const targetId = existingId || editingHonor?.id;
    const ownerId = user ? user.uid : 'demo_student';
    const activeStu =
      familyStudents.find((s) => s.id === (data.studentId || activeStudentId)) ||
      familyStudents.find((s) => s.id === activeStudentId) ||
      familyStudents[0];
    const resolvedStudentId =
      data.studentId || editingHonor?.studentId || activeStu?.id;
    const resolvedStudentName =
      data.studentName ||
      editingHonor?.studentName ||
      activeStu?.name ||
      familyProfile.studentFullName.trim() ||
      profile.displayName;
    const payloadWithStudent = {
      ...data,
      ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
      ...(resolvedStudentName ? { studentName: resolvedStudentName } : {}),
    };

    if (targetId) {
      const updatedItem: HonorAwardItem = {
        ...payloadWithStudent,
        id: targetId,
        ownerId,
      };
      if (user) {
        try {
          await updateDoc(doc(db, 'honors', targetId), {
            ...payloadWithStudent,
            updatedAt: serverTimestamp(),
          });
          showToast('Honor updated');
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `honors/${targetId}`);
        }
      } else {
        setHonors((prev) =>
          prev.map((h) => (h.id === targetId ? updatedItem : h))
        );
        showToast('Honor updated');
      }
      setEditingHonor(null);
    } else {
      const newId = `hon_${Date.now()}`;
      const newItem: HonorAwardItem = {
        ...payloadWithStudent,
        id: newId,
        ownerId,
      };
      if (user) {
        try {
          await setDoc(doc(db, 'honors', newId), {
            ...payloadWithStudent,
            ownerId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `honors/${newId}`);
        }
      } else {
        setHonors((prev) => [newItem, ...prev]);
      }
      await awardXp(50, false, 'Academic honor recorded');
    }
  };

  // Save Essay Draft
  const handleSaveEssayDraft = async (
    draftData: Omit<EssayDraftItem, 'id' | 'ownerId'>
  ) => {
    const newId = `draft_${Date.now()}`;
    const ownerId = user ? user.uid : 'demo_student';
    const activeStu =
      familyStudents.find(
        (s) => s.id === (draftData.studentId || activeStudentId)
      ) ||
      familyStudents.find((s) => s.id === activeStudentId) ||
      familyStudents[0];
    const resolvedStudentId = draftData.studentId || activeStu?.id;
    const resolvedStudentName =
      draftData.studentName ||
      activeStu?.name ||
      familyProfile.studentFullName.trim() ||
      profile.displayName;
    const payloadWithStudent = {
      ...draftData,
      ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
      ...(resolvedStudentName ? { studentName: resolvedStudentName } : {}),
    };
    const newDraft: EssayDraftItem = {
      ...payloadWithStudent,
      id: newId,
      ownerId,
    };

    if (user) {
      try {
        await setDoc(doc(db, 'essayDrafts', newId), {
          ...payloadWithStudent,
          ownerId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Saved Essay Draft & AI Score to Vault!');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `essayDrafts/${newId}`
        );
      }
    } else {
      setEssayDrafts((prev) => [newDraft, ...prev]);
      showToast('Saved Essay Draft & AI Score to Vault!');
    }
    await awardXp(35, false, 'Essay version saved');
  };

  const handleDeleteEssayDraft = async (draftId: string) => {
    setDeleteConfirmId({ type: 'essayDraft', id: draftId });
  };

  // Save & Update College Deadlines
  const handleSaveCollegeDeadline = async (
    item: Omit<CollegeDeadlineItem, 'id' | 'ownerId'>
  ) => {
    const newId = `col_${Date.now()}`;
    const ownerId = user ? user.uid : 'demo_student';
    const activeStu =
      familyStudents.find((s) => s.id === (item.studentId || activeStudentId)) ||
      familyStudents.find((s) => s.id === activeStudentId) ||
      familyStudents[0];
    const resolvedStudentId = item.studentId || activeStu?.id;
    const resolvedStudentName =
      item.studentName ||
      activeStu?.name ||
      familyProfile.studentFullName.trim() ||
      profile.displayName;
    const payloadWithStudent = {
      ...item,
      ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
      ...(resolvedStudentName ? { studentName: resolvedStudentName } : {}),
    };
    const newCollege: CollegeDeadlineItem = {
      ...payloadWithStudent,
      id: newId,
      ownerId,
    };

    if (user) {
      try {
        await setDoc(doc(db, 'collegeDeadlines', newId), {
          ...payloadWithStudent,
          ownerId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Added ${item.collegeName} to College Tracker!`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `collegeDeadlines/${newId}`
        );
      }
    } else {
      setCollegeDeadlines((prev) => [...prev, newCollege]);
      showToast(`Added ${item.collegeName} to College Tracker!`);
    }
  };

  const handleUpdateCollegeStatus = async (
    collegeId: string,
    status: CollegeApplicationStatus
  ) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'collegeDeadlines', collegeId), {
          status,
          updatedAt: serverTimestamp(),
        });
        showToast(`Application status updated to ${status}`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `collegeDeadlines/${collegeId}`
        );
      }
    } else {
      setCollegeDeadlines((prev) =>
        prev.map((c) => (c.id === collegeId ? { ...c, status } : c))
      );
      showToast(`Application status updated to ${status}`);
    }
  };

  const handleDeleteCollegeDeadline = async (collegeId: string) => {
    setDeleteConfirmId({ type: 'collegeDeadline', id: collegeId });
  };

  // Start Fresh (Soft-Delete All Records for 30 Days + Capture Automatic Snapshot)
  const handleResetToCleanSlate = async () => {
    setIsSampleMode(false);
    const hadSavedData =
      activities.length +
        journalEntries.length +
        honors.length +
        essayDrafts.length +
        collegeDeadlines.length +
        familyStudents.length >
      0;
    // 1. Capture automatic full-portfolio snapshot right before bulk reset
    if (hadSavedData) {
      capturePortfolioSnapshot(
        'Pre-Reset: Full Family Portfolio Backup',
        familyProfile.studentFullName || profile.displayName || 'Family Portfolio',
        'bulk'
      );
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const purgeAfterIso = new Date(nowMs + SOFT_DELETE_RETENTION_MS).toISOString();

    const oldActivities = [...activities];
    const oldJournals = [...journalEntries];
    const oldHonors = [...honors];
    const oldDrafts = [...essayDrafts];
    const oldDeadlines = [...collegeDeadlines];
    const oldStudents = [...familyStudents];

    // 2. Add all existing records into the 30-Day Soft-Delete Trash
    const newTrashItems: SoftDeletedTrashItem[] = [
      ...oldActivities.map((a): SoftDeletedTrashItem => ({
        id: `trash_activity_${a.id}`,
        recordType: 'activity',
        recordId: a.id,
        title: `${a.organization} — ${a.position}`,
        subtitle: `${a.activityType} · ${a.hoursPerWeek} hrs/wk`,
        studentId: a.studentId,
        studentName: a.studentName || familyProfile.studentFullName || '',
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...a, isDeleted: false, deletedAt: '' },
      })),
      ...oldJournals.map((j): SoftDeletedTrashItem => ({
        id: `trash_journal_${j.id}`,
        recordType: 'journal',
        recordId: j.id,
        title: j.title,
        subtitle: `${j.entryDate} · ${j.gradeLevel}th Grade`,
        studentId: j.studentId,
        studentName: j.studentName || familyProfile.studentFullName || '',
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...j, isDeleted: false, deletedAt: '' },
      })),
      ...oldHonors.map((h): SoftDeletedTrashItem => ({
        id: `trash_honor_${h.id}`,
        recordType: 'honor',
        recordId: h.id,
        title: h.title,
        subtitle: `${h.recognitionLevel} · ${h.gradeLevel}th Grade`,
        studentId: h.studentId,
        studentName: h.studentName || familyProfile.studentFullName || '',
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...h, isDeleted: false, deletedAt: '' },
      })),
      ...oldDrafts.map((d): SoftDeletedTrashItem => ({
        id: `trash_essayDraft_${d.id}`,
        recordType: 'essayDraft',
        recordId: d.id,
        title: d.versionTitle,
        subtitle: `${d.wordCount} words · Score ${d.overallScore}/100`,
        studentId: d.studentId,
        studentName: d.studentName || familyProfile.studentFullName || '',
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...d, isDeleted: false, deletedAt: '' },
      })),
      ...oldDeadlines.map((c): SoftDeletedTrashItem => ({
        id: `trash_collegeDeadline_${c.id}`,
        recordType: 'collegeDeadline',
        recordId: c.id,
        title: c.collegeName,
        subtitle: `${c.category} · ${c.appRound} (${c.deadlineDate})`,
        studentId: c.studentId,
        studentName: c.studentName || familyProfile.studentFullName || '',
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...c, isDeleted: false, deletedAt: '' },
      })),
    ];

    if (newTrashItems.length > 0) {
      setDeletedTrash((prev) => [...newTrashItems, ...prev]);
    }

    setActivities([]);
    setJournalEntries([]);
    setHonors([]);
    setEssayDrafts([]);
    setCollegeDeadlines([]);

    const cleanFamily: FamilyProfileItem = {
      ownerId: user ? user.uid : 'demo_student',
      studentFullName: '',
      preferredName: '',
      highSchoolName: '',
      highSchoolCityState: '',
      curriculumType: 'AP / Honors',
      unweightedGpa: '',
      weightedGpa: '',
      classRank: '',
      satActScore: '',
      intendedMajors: '',
      careerInterests: '',
      householdStructure: 'Both Parents',
      firstGenerationCollege: false,
      languagesSpokenAtHome: '',
      feeWaiverEligible: false,
      parent1Name: '',
      parent1Relationship: 'Mother',
      parent1Education: 'Bachelors Degree',
      parent1AlmaMater: '',
      parent1Occupation: '',
      parent2Name: '',
      parent2Relationship: 'Father',
      parent2Education: 'Bachelors Degree',
      parent2AlmaMater: '',
      parent2Occupation: '',
      siblingsCount: 0,
      siblingsSummary: '',
      familyResponsibilitiesNotes: '',
      accountRole: familyProfile.accountRole || 'Parent / Guardian',
      studentEmail:
        familyProfile.studentEmail ||
        (familyProfile.accountRole === 'Student' ? user?.email || '' : ''),
      parentEmail:
        familyProfile.parentEmail ||
        (familyProfile.accountRole !== 'Student' ? user?.email || '' : ''),
      parent2Email: familyProfile.parent2Email || '',
      familyShareCode: isDemoFamilyData(familyProfile)
        ? generateFamilyShareCode()
        : secureFamilyShareCode(familyProfile.familyShareCode),
    };

    const cleanProfile: UserProfile = {
      ...profile,
      displayName: '',
      gradYear: getDefaultGradYearForGrade(profile.currentGrade || 9),
      dreamColleges: '',
      xp: 0,
      streakDays: 0,
      lastCheckInDate: '',
    };

    setFamilyProfile(cleanFamily);
    setProfile(cleanProfile);
    setFamilyStudents([]);
    setActiveStudentId('');
    setRegEditingStudentId('');
    setRegStudentName('');
    setRegSchoolName('');
    setRegCityState('');

    // Persist clean state to localStorage immediately
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.PROFILE,
      JSON.stringify(cleanProfile)
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.FAMILY_PROFILE,
      JSON.stringify(cleanFamily)
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.FAMILY_STUDENTS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID, '');
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.JOURNAL, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.HONORS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.ESSAY_DRAFTS, JSON.stringify([]));
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.COLLEGE_DEADLINES,
      JSON.stringify([])
    );

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: '',
          dreamColleges: '',
          xp: 0,
          streakDays: 0,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // ignore if user doc not created yet
      }

      try {
        const familyRef = doc(db, 'users', user.uid, 'familyProfile', 'main');
        const {
          createdAt: _c,
          updatedAt: _u,
          ...sanitizedCleanFamily
        } = cleanFamily;
        try {
          await updateDoc(familyRef, {
            ...sanitizedCleanFamily,
            ownerId: user.uid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          await setDoc(familyRef, {
            ...sanitizedCleanFamily,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // ignore
      }

      // Soft-delete existing Firestore items for 30 days instead of permanent deletion
      await Promise.allSettled([
        ...oldActivities.map((a) =>
          updateDoc(doc(db, 'activities', a.id), {
            isDeleted: true,
            deletedAt: nowIso,
            commonAppSlot: 0,
            updatedAt: serverTimestamp(),
          })
        ),
        ...oldJournals.map((j) =>
          updateDoc(doc(db, 'journals', j.id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          })
        ),
        ...oldHonors.map((h) =>
          updateDoc(doc(db, 'honors', h.id), {
            isDeleted: true,
            deletedAt: nowIso,
            commonAppRank: 0,
            updatedAt: serverTimestamp(),
          })
        ),
        ...oldDrafts.map((d) =>
          updateDoc(doc(db, 'essayDrafts', d.id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          })
        ),
        ...oldDeadlines.map((c) =>
          updateDoc(doc(db, 'collegeDeadlines', c.id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          })
        ),
        ...oldStudents.map((s) =>
          updateDoc(doc(db, 'users', user.uid, 'students', s.id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          })
        ),
      ]);
    }

    // Also update shared family sync bundle so stale dummy data isn't re-pulled
    try {
      await fetch('/api/family-sync/publish', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify({
          familyShareCode: cleanFamily.familyShareCode,
          studentEmail: cleanFamily.studentEmail || '',
          parentEmail: cleanFamily.parentEmail || user?.email || '',
          parent2Email: '',
          profile: cleanProfile,
          familyProfile: cleanFamily,
          activities: [],
          journalEntries: [],
          honors: [],
          essayDrafts: [],
          collegeDeadlines: [],
        }),
      });
    } catch {
      // ignore
    }

    if (hadSavedData) {
      showToast(
        'Portfolio archived to 30-Day Trash & Automatic Snapshot saved (restorable anytime in Profile)'
      );
    } else if (!user) {
      showToast(
        'Your blank portfolio is ready. Entries are saved in this browser only until you sign in with Google.'
      );
    }
  };

  const handleViewCompletedProfileScreens = () => {
    setIsSampleMode(false);
    setActiveTab('landing');
    setTimeout(() => {
      const el = document.getElementById('completed-profile-screens');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 1-Click Demo Family Account Login (demo@pathtoadmit.com) with Multi-Child Portfolio & AI Access
  const handleDemoAccountLogin = async (
    isReloadHydration: boolean | React.MouseEvent<HTMLButtonElement> = false
  ) => {
    const isHydration = isReloadHydration === true;
    localStorage.setItem(DEMO_SESSION_STORAGE_KEY, 'true');
    setIsDemoSessionActive(true);
    setIsSampleMode(false);

    const demoStudents: StudentChildProfile[] = [
      {
        id: 'stu_demo_jordan',
        name: 'Jordan Rivera',
        grade: 10,
        gradYear: 2029,
        schoolName: INITIAL_DEMO_FAMILY_PROFILE.highSchoolName,
        cityState: INITIAL_DEMO_FAMILY_PROFILE.highSchoolCityState,
        unweightedGpa: INITIAL_DEMO_FAMILY_PROFILE.unweightedGpa,
        weightedGpa: INITIAL_DEMO_FAMILY_PROFILE.weightedGpa,
        satActScore: INITIAL_DEMO_FAMILY_PROFILE.satActScore,
      },
      {
        id: 'stu_demo_maya',
        name: 'Maya Rivera',
        grade: 8,
        gradYear: 2031,
        schoolName: 'Oakridge Middle School',
        cityState: INITIAL_DEMO_FAMILY_PROFILE.highSchoolCityState,
        unweightedGpa: '4.00 / 4.00',
        weightedGpa: '4.00 / 4.00',
        satActScore: 'PSAT 8/9: 1340',
      },
    ];

    const mayaDemoActivities: ActivityItem[] = [
      {
        id: 'act_maya_sci_1',
        ownerId: DEMO_ACCOUNT_UID,
        studentId: 'stu_demo_maya',
        studentName: 'Maya Rivera',
        activityType: 'Science/Math',
        position: 'Division B Bridge & Crime Busters Lead',
        organization: 'Oakridge Middle School Science Olympiad',
        description: 'Built balsa-wood truss bridges holding 15kg with 9.2g mass; placed 2nd at Regional Invitational; mentored 6th-grade alternates.',
        extendedNotes: 'Joined Science Olympiad in 6th grade after testing index-card bridges at home with Jordan.',
        grades: [6, 7, 8],
        timing: 'School Year',
        hoursPerWeek: 4,
        weeksPerYear: 30,
        continueInCollege: true,
        commonAppSlot: 0,
        impactScore: 5,
      },
      {
        id: 'act_maya_art_2',
        ownerId: DEMO_ACCOUNT_UID,
        studentId: 'stu_demo_maya',
        studentName: 'Maya Rivera',
        activityType: 'Art',
        position: 'Middle School Mural & Yearbook Illustrator',
        organization: 'Oakridge Middle Art Guild',
        description: 'Designed 18-foot library STEM mural with 6 student artists; illustrated 24 digital section covers for the 450-copy school yearbook.',
        extendedNotes: 'Learned Procreate digital illustration in 7th grade and organized lunchtime sketching sessions.',
        grades: [7, 8],
        timing: 'School Year',
        hoursPerWeek: 3,
        weeksPerYear: 28,
        continueInCollege: true,
        commonAppSlot: 0,
        impactScore: 4,
      },
    ];

    const demoProfile: UserProfile = {
      ...INITIAL_DEMO_PROFILE,
      uid: DEMO_ACCOUNT_UID,
      displayName: 'Jordan',
      currentGrade: 10,
      gradYear: 2029,
    };
    const demoFamily: FamilyProfileItem = {
      ...INITIAL_DEMO_FAMILY_PROFILE,
      ownerId: DEMO_ACCOUNT_UID,
      preferredName: 'Jordan',
      siblingsSummary: 'Maya Rivera (Age 13, 8th Grade at Oakridge Middle School)',
      parentEmail: DEMO_ACCOUNT_EMAIL,
    };

    setProfile(demoProfile);
    setFamilyProfile(demoFamily);
    setFamilyStudents(demoStudents);
    setActiveStudentId('stu_demo_jordan');
    setActivities([
      ...INITIAL_DEMO_ACTIVITIES.map((a) => ({
        ...a,
        ownerId: DEMO_ACCOUNT_UID,
        studentId: 'stu_demo_jordan',
        studentName: 'Jordan Rivera',
      })),
      ...mayaDemoActivities,
    ]);
    setJournalEntries(
      INITIAL_DEMO_JOURNALS.map((j) => ({
        ...j,
        ownerId: DEMO_ACCOUNT_UID,
        studentId: 'stu_demo_jordan',
        studentName: 'Jordan Rivera',
      }))
    );
    setHonors(
      INITIAL_DEMO_HONORS.map((h) => ({
        ...h,
        ownerId: DEMO_ACCOUNT_UID,
        studentId: 'stu_demo_jordan',
        studentName: 'Jordan Rivera',
      }))
    );
    setEssayDrafts(INITIAL_DEMO_ESSAY_DRAFTS);
    setCollegeDeadlines(INITIAL_DEMO_COLLEGE_DEADLINES);

    setIsRegistrationModalOpen(false);
    if (!isHydration || activeTab === 'landing') {
      setActiveTab('overview');
    }
    await refreshBetaStatus(null);
    if (!isHydration) {
      showToast(
        'Signed in to Demo Family Account (demo@pathtoadmit.com) — AI Coach & 2-Student Portfolio active!'
      );
    }
  };

  // If the user reloads while Demo Family Session is active, ensure fresh demo data is hydrated while preserving their active screen
  useEffect(() => {
    if (isDemoSessionActive && !user) {
      void handleDemoAccountLogin(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign out of either Google or Demo Account and completely clear local state & storage
  const handleFullSignOutAndClear = async () => {
    const wasDemo = isDemoSessionActive && !user;
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
      try {
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    });

    setIsDemoSessionActive(false);
    setIsSampleMode(false);
    setIsAvatarMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsRegistrationModalOpen(false);

    setProfile(CLEAN_DEFAULT_PROFILE);
    setFamilyProfile(CLEAN_DEFAULT_FAMILY_PROFILE);
    setFamilyStudents([]);
    setActiveStudentId('');
    setActivities([]);
    setJournalEntries([]);
    setHonors([]);
    setEssayDrafts([]);
    setCollegeDeadlines([]);

    setRegEditingStudentId('');
    setRegStudentName('');
    setRegGrade(9);
    setRegSchoolName('');
    setRegCityState('');
    setRegStudentEmail('');
    setRegParentEmail('');
    setRegParent2Email('');

    if (user) {
      await signOutUser();
    }

    setActiveTab('landing');
    showToast(
      wasDemo
        ? 'Signed out of Demo Family Account'
        : 'Signed out — your family portfolio remains saved in your account'
    );
  };

  const handleExitDemoAccount = () => {
    void handleFullSignOutAndClear();
  };

  // Soft-Delete Item (30-Day Retention + Pre-Delete Automatic Snapshot)
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const { type, id } = deleteConfirmId;
    setDeleteConfirmId(null);
    setDeleteConfirmInput('');

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const purgeAfterIso = new Date(nowMs + SOFT_DELETE_RETENTION_MS).toISOString();
    const fallbackStuName =
      familyStudents.find((s) => s.id === activeStudentId)?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      'Student';

    if (type === 'activity') {
      const target = activities.find((a) => a.id === id);
      if (!target) return;
      const stuName = target.studentName || fallbackStuName;
      capturePortfolioSnapshot(
        `Pre-Delete: Activity (${target.organization} — ${target.position})`,
        stuName,
        'activity',
        `${target.organization} — ${target.position}`,
        target
      );
      const trashItem: SoftDeletedTrashItem = {
        id: `trash_activity_${id}`,
        recordType: 'activity',
        recordId: id,
        title: `${target.organization} — ${target.position}`,
        subtitle: `${target.activityType} · ${target.hoursPerWeek} hrs/wk`,
        studentId: target.studentId,
        studentName: stuName,
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...target, isDeleted: false, deletedAt: '' },
      };
      setDeletedTrash((prev) => [
        trashItem,
        ...prev.filter((t) => !(t.recordType === 'activity' && t.recordId === id)),
      ]);
      setLastSoftDeletedItem(trashItem);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      if (user) {
        try {
          await updateDoc(doc(db, 'activities', id), {
            isDeleted: true,
            deletedAt: nowIso,
            commonAppSlot: 0,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `activities/${id}`);
        }
      }
      showToast(
        `Moved "${target.organization}" to 30-Day Trash (auto-snapshot saved)`
      );
    } else if (type === 'journal') {
      const target = journalEntries.find((j) => j.id === id);
      if (!target) return;
      const stuName = target.studentName || fallbackStuName;
      capturePortfolioSnapshot(
        `Pre-Delete: Reflection (${target.title})`,
        stuName,
        'journal',
        target.title,
        target
      );
      const trashItem: SoftDeletedTrashItem = {
        id: `trash_journal_${id}`,
        recordType: 'journal',
        recordId: id,
        title: target.title,
        subtitle: `${target.entryDate} · ${target.gradeLevel}th Grade`,
        studentId: target.studentId,
        studentName: stuName,
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...target, isDeleted: false, deletedAt: '' },
      };
      setDeletedTrash((prev) => [
        trashItem,
        ...prev.filter((t) => !(t.recordType === 'journal' && t.recordId === id)),
      ]);
      setLastSoftDeletedItem(trashItem);
      setJournalEntries((prev) => prev.filter((j) => j.id !== id));
      if (user) {
        try {
          await updateDoc(doc(db, 'journals', id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `journals/${id}`);
        }
      }
      showToast(`Moved reflection to 30-Day Trash (auto-snapshot saved)`);
    } else if (type === 'honor') {
      const target = honors.find((h) => h.id === id);
      if (!target) return;
      const stuName = target.studentName || fallbackStuName;
      capturePortfolioSnapshot(
        `Pre-Delete: Honor (${target.title})`,
        stuName,
        'honor',
        target.title,
        target
      );
      const trashItem: SoftDeletedTrashItem = {
        id: `trash_honor_${id}`,
        recordType: 'honor',
        recordId: id,
        title: target.title,
        subtitle: `${target.recognitionLevel} · ${target.gradeLevel}th Grade`,
        studentId: target.studentId,
        studentName: stuName,
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...target, isDeleted: false, deletedAt: '' },
      };
      setDeletedTrash((prev) => [
        trashItem,
        ...prev.filter((t) => !(t.recordType === 'honor' && t.recordId === id)),
      ]);
      setLastSoftDeletedItem(trashItem);
      setHonors((prev) => prev.filter((h) => h.id !== id));
      if (user) {
        try {
          await updateDoc(doc(db, 'honors', id), {
            isDeleted: true,
            deletedAt: nowIso,
            commonAppRank: 0,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `honors/${id}`);
        }
      }
      showToast(`Moved "${target.title}" to 30-Day Trash (auto-snapshot saved)`);
    } else if (type === 'essayDraft') {
      const target = essayDrafts.find((d) => d.id === id);
      if (!target) return;
      const stuName = target.studentName || fallbackStuName;
      capturePortfolioSnapshot(
        `Pre-Delete: Essay Draft (${target.versionTitle})`,
        stuName,
        'essayDraft',
        target.versionTitle,
        target
      );
      const trashItem: SoftDeletedTrashItem = {
        id: `trash_essayDraft_${id}`,
        recordType: 'essayDraft',
        recordId: id,
        title: target.versionTitle,
        subtitle: `${target.wordCount} words · Score ${target.overallScore}/100`,
        studentId: target.studentId,
        studentName: stuName,
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...target, isDeleted: false, deletedAt: '' },
      };
      setDeletedTrash((prev) => [
        trashItem,
        ...prev.filter(
          (t) => !(t.recordType === 'essayDraft' && t.recordId === id)
        ),
      ]);
      setLastSoftDeletedItem(trashItem);
      setEssayDrafts((prev) => prev.filter((d) => d.id !== id));
      if (user) {
        try {
          await updateDoc(doc(db, 'essayDrafts', id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `essayDrafts/${id}`);
        }
      }
      showToast(
        `Moved essay draft to 30-Day Trash (auto-snapshot saved)`
      );
    } else if (type === 'collegeDeadline') {
      const target = collegeDeadlines.find((c) => c.id === id);
      if (!target) return;
      const stuName = target.studentName || fallbackStuName;
      capturePortfolioSnapshot(
        `Pre-Delete: College Deadline (${target.collegeName})`,
        stuName,
        'collegeDeadline',
        target.collegeName,
        target
      );
      const trashItem: SoftDeletedTrashItem = {
        id: `trash_collegeDeadline_${id}`,
        recordType: 'collegeDeadline',
        recordId: id,
        title: target.collegeName,
        subtitle: `${target.category} · ${target.appRound} (${target.deadlineDate})`,
        studentId: target.studentId,
        studentName: stuName,
        deletedAt: nowIso,
        purgeAfter: purgeAfterIso,
        recordPayload: { ...target, isDeleted: false, deletedAt: '' },
      };
      setDeletedTrash((prev) => [
        trashItem,
        ...prev.filter(
          (t) => !(t.recordType === 'collegeDeadline' && t.recordId === id)
        ),
      ]);
      setLastSoftDeletedItem(trashItem);
      setCollegeDeadlines((prev) => prev.filter((c) => c.id !== id));
      if (user) {
        try {
          await updateDoc(doc(db, 'collegeDeadlines', id), {
            isDeleted: true,
            deletedAt: nowIso,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `collegeDeadlines/${id}`
          );
        }
      }
      showToast(
        `Moved ${target.collegeName} to 30-Day Trash (auto-snapshot saved)`
      );
    }
  };

  // Restore any soft-deleted item from the 30-Day Trash Vault
  const handleRestoreDeletedItem = async (trashItem: SoftDeletedTrashItem) => {
    const { recordType, recordId, recordPayload } = trashItem;
    setDeletedTrash((prev) => prev.filter((t) => t.id !== trashItem.id));
    setLastSoftDeletedItem((prev) => (prev?.id === trashItem.id ? null : prev));

    if (recordType === 'activity') {
      const restored: ActivityItem = {
        ...(recordPayload as ActivityItem),
        isDeleted: false,
        deletedAt: '',
      };
      setActivities((prev) => {
        const exists = prev.some((a) => a.id === recordId);
        return exists
          ? prev.map((a) => (a.id === recordId ? restored : a))
          : [restored, ...prev];
      });
      if (user) {
        try {
          await updateDoc(doc(db, 'activities', recordId), {
            isDeleted: false,
            deletedAt: '',
            commonAppSlot: restored.commonAppSlot ?? 0,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      }
    } else if (recordType === 'journal') {
      const restored: JournalEntryItem = {
        ...(recordPayload as JournalEntryItem),
        isDeleted: false,
        deletedAt: '',
      };
      setJournalEntries((prev) => {
        const exists = prev.some((j) => j.id === recordId);
        return exists
          ? prev.map((j) => (j.id === recordId ? restored : j))
          : [restored, ...prev];
      });
      if (user) {
        try {
          await updateDoc(doc(db, 'journals', recordId), {
            isDeleted: false,
            deletedAt: '',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      }
    } else if (recordType === 'honor') {
      const restored: HonorAwardItem = {
        ...(recordPayload as HonorAwardItem),
        isDeleted: false,
        deletedAt: '',
      };
      setHonors((prev) => {
        const exists = prev.some((h) => h.id === recordId);
        return exists
          ? prev.map((h) => (h.id === recordId ? restored : h))
          : [restored, ...prev];
      });
      if (user) {
        try {
          await updateDoc(doc(db, 'honors', recordId), {
            isDeleted: false,
            deletedAt: '',
            commonAppRank: restored.commonAppRank ?? 0,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      }
    } else if (recordType === 'essayDraft') {
      const restored: EssayDraftItem = {
        ...(recordPayload as EssayDraftItem),
        isDeleted: false,
        deletedAt: '',
      };
      setEssayDrafts((prev) => {
        const exists = prev.some((d) => d.id === recordId);
        return exists
          ? prev.map((d) => (d.id === recordId ? restored : d))
          : [restored, ...prev];
      });
      if (user) {
        try {
          await updateDoc(doc(db, 'essayDrafts', recordId), {
            isDeleted: false,
            deletedAt: '',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      }
    } else if (recordType === 'collegeDeadline') {
      const restored: CollegeDeadlineItem = {
        ...(recordPayload as CollegeDeadlineItem),
        isDeleted: false,
        deletedAt: '',
      };
      setCollegeDeadlines((prev) => {
        const exists = prev.some((c) => c.id === recordId);
        return exists
          ? prev.map((c) => (c.id === recordId ? restored : c))
          : [restored, ...prev];
      });
      if (user) {
        try {
          await updateDoc(doc(db, 'collegeDeadlines', recordId), {
            isDeleted: false,
            deletedAt: '',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      }
    }

    showToast(`Restored "${trashItem.title}" to your portfolio!`);
  };

  // Restore a full point-in-time Portfolio Snapshot
  const handleRestoreSnapshot = async (snap: PortfolioSnapshotItem) => {
    const st = snap.portfolioState;
    if (!st) return;

    setProfile(st.profile);
    setFamilyProfile(st.familyProfile);
    if (Array.isArray(st.familyStudents)) {
      setFamilyStudents(st.familyStudents);
    }
    if (st.activeStudentId) {
      setActiveStudentId(st.activeStudentId);
    }
    setActivities(
      (st.activities || []).map((a) => ({ ...a, isDeleted: false, deletedAt: '' }))
    );
    setJournalEntries(
      (st.journalEntries || []).map((j) => ({
        ...j,
        isDeleted: false,
        deletedAt: '',
      }))
    );
    setHonors(
      (st.honors || []).map((h) => ({ ...h, isDeleted: false, deletedAt: '' }))
    );
    setEssayDrafts(
      (st.essayDrafts || []).map((d) => ({
        ...d,
        isDeleted: false,
        deletedAt: '',
      }))
    );
    setCollegeDeadlines(
      (st.collegeDeadlines || []).map((c) => ({
        ...c,
        isDeleted: false,
        deletedAt: '',
      }))
    );

    if (user) {
      await Promise.allSettled([
        ...(st.familyStudents || []).map((stu) =>
          persistStudentChildToFirestore(user.uid, {
            ...stu,
            isDeleted: false,
            deletedAt: '',
          })
        ),
        ...(st.activities || []).map((a) =>
          updateDoc(doc(db, 'activities', a.id), {
            isDeleted: false,
            deletedAt: '',
            commonAppSlot: a.commonAppSlot ?? 0,
            updatedAt: serverTimestamp(),
          }).catch(() => {})
        ),
        ...(st.journalEntries || []).map((j) =>
          updateDoc(doc(db, 'journals', j.id), {
            isDeleted: false,
            deletedAt: '',
            updatedAt: serverTimestamp(),
          }).catch(() => {})
        ),
        ...(st.honors || []).map((h) =>
          updateDoc(doc(db, 'honors', h.id), {
            isDeleted: false,
            deletedAt: '',
            commonAppRank: h.commonAppRank ?? 0,
            updatedAt: serverTimestamp(),
          }).catch(() => {})
        ),
        ...(st.essayDrafts || []).map((d) =>
          updateDoc(doc(db, 'essayDrafts', d.id), {
            isDeleted: false,
            deletedAt: '',
            updatedAt: serverTimestamp(),
          }).catch(() => {})
        ),
        ...(st.collegeDeadlines || []).map((c) =>
          updateDoc(doc(db, 'collegeDeadlines', c.id), {
            isDeleted: false,
            deletedAt: '',
            updatedAt: serverTimestamp(),
          }).catch(() => {})
        ),
      ]);
    }

    showToast(`Restored snapshot: ${snap.reason}`);
  };

  // Keep profile and familyProfile synchronized with the active child whenever activeStudentId or familyStudents updates
  const activeStudentObj = useMemo(
    () =>
      familyStudents.find((s) => s.id === activeStudentId) ||
      familyStudents[0] ||
      null,
    [familyStudents, activeStudentId]
  );

  // Ensure activeStudentId is always a valid ID from familyStudents whenever children are loaded
  useEffect(() => {
    if (familyStudents.length === 0) return;
    if (!familyStudents.some((s) => s.id === activeStudentId)) {
      const byFamilyActive =
        familyProfile.activeStudentId &&
        familyStudents.find((s) => s.id === familyProfile.activeStudentId);
      const byName =
        familyProfile.studentFullName &&
        familyStudents.find(
          (s) =>
            s.name.trim().toLowerCase() ===
            familyProfile.studentFullName.trim().toLowerCase()
        );
      const resolved = byFamilyActive || byName || familyStudents[0];
      if (resolved) {
        setActiveStudentId(resolved.id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_STUDENT_ID, resolved.id);
      }
    }
  }, [
    familyStudents,
    activeStudentId,
    familyProfile.activeStudentId,
    familyProfile.studentFullName,
  ]);

  useEffect(() => {
    if (!activeStudentObj) return;
    const firstName =
      (activeStudentObj.name || '').split(' ')[0] || activeStudentObj.name;
    const wantGrade = activeStudentObj.grade || 9;
    const wantGradYear =
      activeStudentObj.gradYear || getDefaultGradYearForGrade(wantGrade);
    const wantColleges = activeStudentObj.dreamColleges ?? '';

    if (
      profile.displayName !== firstName ||
      profile.currentGrade !== wantGrade ||
      profile.gradYear !== wantGradYear ||
      profile.dreamColleges !== wantColleges
    ) {
      setProfile((prev) => ({
        ...prev,
        displayName: firstName,
        currentGrade: wantGrade,
        gradYear: wantGradYear,
        dreamColleges: wantColleges,
      }));
    }

    const wantName = activeStudentObj.name || familyProfile.studentFullName;
    const wantSchool = activeStudentObj.schoolName ?? '';
    const wantCity =
      activeStudentObj.cityState ?? familyProfile.highSchoolCityState;
    const wantCurriculum = activeStudentObj.curriculumType || 'AP / Honors';
    const wantUnweighted = activeStudentObj.unweightedGpa ?? '';
    const wantWeighted = activeStudentObj.weightedGpa ?? '';
    const wantRank = activeStudentObj.classRank ?? '';
    const wantSat = activeStudentObj.satActScore ?? '';
    const wantMajors = activeStudentObj.intendedMajors ?? '';
    const wantCareers = activeStudentObj.careerInterests ?? '';

    if (
      familyProfile.activeStudentId !== activeStudentObj.id ||
      familyProfile.studentFullName !== wantName ||
      familyProfile.highSchoolName !== wantSchool ||
      familyProfile.unweightedGpa !== wantUnweighted ||
      familyProfile.weightedGpa !== wantWeighted ||
      familyProfile.satActScore !== wantSat ||
      familyProfile.intendedMajors !== wantMajors
    ) {
      setFamilyProfile((prev) => ({
        ...prev,
        activeStudentId: activeStudentObj.id,
        studentFullName: wantName,
        preferredName: firstName,
        highSchoolName: wantSchool,
        highSchoolCityState: wantCity,
        curriculumType: wantCurriculum,
        unweightedGpa: wantUnweighted,
        weightedGpa: wantWeighted,
        classRank: wantRank,
        satActScore: wantSat,
        intendedMajors: wantMajors,
        careerInterests: wantCareers,
      }));
    }
  }, [
    activeStudentObj,
    profile.displayName,
    profile.currentGrade,
    profile.gradYear,
    profile.dreamColleges,
    familyProfile.activeStudentId,
    familyProfile.studentFullName,
    familyProfile.highSchoolName,
    familyProfile.highSchoolCityState,
    familyProfile.unweightedGpa,
    familyProfile.weightedGpa,
    familyProfile.satActScore,
    familyProfile.intendedMajors,
  ]);

  // Self-heal any duplicate Common App Top 10 slots within the same child's activities
  useEffect(() => {
    if (activities.length < 2) return;
    const byStudentKey = new Map<string, ActivityItem[]>();
    for (const act of activities) {
      if (
        !(act.commonAppSlot >= 1 && act.commonAppSlot <= 10) ||
        !act.grades?.some((g) => g >= 9)
      ) {
        continue;
      }
      const key =
        act.studentId ||
        (act.studentName ? act.studentName.trim().toLowerCase() : 'default');
      const list = byStudentKey.get(key) || [];
      list.push(act);
      byStudentKey.set(key, list);
    }

    const updates: Array<{ id: string; newSlot: number }> = [];
    byStudentKey.forEach((studentActs) => {
      const seenSlots = new Set<number>();
      for (const act of studentActs) {
        if (!seenSlots.has(act.commonAppSlot)) {
          seenSlots.add(act.commonAppSlot);
        } else {
          // Find lowest free slot 1..10 for this student
          let replacement = 0;
          for (let s = 1; s <= 10; s++) {
            if (
              !seenSlots.has(s) &&
              !studentActs.some((other) => other.commonAppSlot === s)
            ) {
              replacement = s;
              break;
            }
          }
          seenSlots.add(replacement);
          updates.push({ id: act.id, newSlot: replacement });
        }
      }
    });

    if (updates.length > 0) {
      setActivities((prev) =>
        prev.map((a) => {
          const found = updates.find((u) => u.id === a.id);
          return found ? { ...a, commonAppSlot: found.newSlot } : a;
        })
      );
      if (user) {
        updates.forEach((u) => {
          void updateDoc(doc(db, 'activities', u.id), {
            commonAppSlot: u.newSlot,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        });
      }
    }
  }, [activities, user]);

  // Activities scoped strictly to the currently selected child (even if familyStudents is still loading)
  const studentScopedActivities = useMemo(() => {
    const activeStu = activeStudentObj;
    const activeNameLower = (
      activeStu?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      ''
    )
      .trim()
      .toLowerCase();
    const isPrimary =
      !activeStu ||
      familyStudents.length === 0 ||
      activeStu.id === familyStudents[0]?.id;

    return activities.filter((act) => {
      if (act.studentId && activeStu) {
        if (act.studentId === activeStu.id) return true;
        // Also check name match if IDs were regenerated across sessions
        if (
          act.studentName &&
          act.studentName.trim().toLowerCase() === activeNameLower
        ) {
          return true;
        }
        return false;
      }
      if (act.studentName && activeNameLower) {
        return act.studentName.trim().toLowerCase() === activeNameLower;
      }
      // Untagged legacy activity: match by grade level if a single child has that grade
      if (familyStudents.length > 1 && act.grades && act.grades.length > 0) {
        const gradeMatches = familyStudents.filter((s) =>
          act.grades.includes(s.grade)
        );
        if (gradeMatches.length === 1 && activeStu) {
          return gradeMatches[0].id === activeStu.id;
        }
      }
      return isPrimary;
    });
  }, [
    activities,
    familyStudents,
    activeStudentObj,
    familyProfile.studentFullName,
    profile.displayName,
  ]);

  // Backfill untagged honors, journals, and college deadlines in memory and Firestore when matched to a child
  useEffect(() => {
    if (familyStudents.length === 0) return;

    // 1. Backfill untagged honors by gradeLevel match
    honors.forEach((h) => {
      if (h.studentId || h.studentName) return;
      const byGrade =
        familyStudents.find((s) => s.grade === h.gradeLevel) ||
        familyStudents.find((s) => s.grade >= 9) ||
        familyStudents[0];
      if (!byGrade) return;
      const updated: HonorAwardItem = {
        ...h,
        studentId: byGrade.id,
        studentName: byGrade.name,
      };
      setHonors((prev) => prev.map((item) => (item.id === h.id ? updated : item)));
      if (user) {
        void updateDoc(doc(db, 'honors', h.id), {
          studentId: byGrade.id,
          studentName: byGrade.name,
        }).catch(() => {});
      }
    });

    // 2. Backfill untagged journal entries by linkedActivity or gradeLevel match
    journalEntries.forEach((j) => {
      if (j.studentId || j.studentName) return;
      const linkedAct = j.linkedActivityId
        ? activities.find((a) => a.id === j.linkedActivityId)
        : undefined;
      const byLinked = linkedAct
        ? familyStudents.find(
            (s) =>
              s.id === linkedAct.studentId ||
              (linkedAct.studentName &&
                s.name.toLowerCase() === linkedAct.studentName.toLowerCase())
          )
        : undefined;
      const byGrade =
        byLinked ||
        familyStudents.find((s) => s.grade === j.gradeLevel) ||
        familyStudents[0];
      if (!byGrade) return;
      const updated: JournalEntryItem = {
        ...j,
        studentId: byGrade.id,
        studentName: byGrade.name,
      };
      setJournalEntries((prev) =>
        prev.map((item) => (item.id === j.id ? updated : item))
      );
      if (user) {
        void updateDoc(doc(db, 'journals', j.id), {
          studentId: byGrade.id,
          studentName: byGrade.name,
        }).catch(() => {});
      }
    });

    // 3. Backfill untagged college deadlines to the child with matching dreamColleges or oldest high school student
    collegeDeadlines.forEach((d) => {
      if (d.studentId || d.studentName) return;
      const colLower = d.collegeName.trim().toLowerCase();
      const byDream = familyStudents.find(
        (s) =>
          s.dreamColleges && s.dreamColleges.toLowerCase().includes(colLower)
      );
      const oldestHighSchool = [...familyStudents]
        .filter((s) => s.grade >= 9)
        .sort((a, b) => b.grade - a.grade)[0];
      const targetStu = byDream || oldestHighSchool || familyStudents[0];
      if (!targetStu) return;
      const updated: CollegeDeadlineItem = {
        ...d,
        studentId: targetStu.id,
        studentName: targetStu.name,
      };
      setCollegeDeadlines((prev) =>
        prev.map((item) => (item.id === d.id ? updated : item))
      );
      if (user) {
        void updateDoc(doc(db, 'collegeDeadlines', d.id), {
          studentId: targetStu.id,
          studentName: targetStu.name,
        }).catch(() => {});
      }
    });
  }, [familyStudents, honors, journalEntries, collegeDeadlines, activities, user]);

  // Honors scoped to the currently selected child
  const studentScopedHonors = useMemo(() => {
    const activeStu = activeStudentObj;
    const activeNameLower = (
      activeStu?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      ''
    )
      .trim()
      .toLowerCase();
    const isPrimary =
      !activeStu ||
      familyStudents.length === 0 ||
      activeStu.id === familyStudents[0]?.id;

    return honors.filter((h) => {
      if (h.studentId && activeStu) {
        if (h.studentId === activeStu.id) return true;
        if (
          h.studentName &&
          h.studentName.trim().toLowerCase() === activeNameLower
        ) {
          return true;
        }
        return false;
      }
      if (h.studentName && activeNameLower) {
        return h.studentName.trim().toLowerCase() === activeNameLower;
      }
      // Untagged honor: match child with same gradeLevel first
      if (familyStudents.length > 1 && activeStu) {
        const gradeMatch = familyStudents.find((s) => s.grade === h.gradeLevel);
        if (gradeMatch) return gradeMatch.id === activeStu.id;
      }
      return isPrimary;
    });
  }, [
    honors,
    familyStudents,
    activeStudentObj,
    familyProfile.studentFullName,
    profile.displayName,
  ]);

  // Journal entries scoped to the active student + any reflections written inside an activity's extendedNotes
  const studentScopedJournals = useMemo(() => {
    const activeStu = activeStudentObj;
    const activeNameLower = (
      activeStu?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      ''
    )
      .trim()
      .toLowerCase();
    const isPrimary =
      !activeStu ||
      familyStudents.length === 0 ||
      activeStu.id === familyStudents[0]?.id;

    const baseJournals = journalEntries.filter((j) => {
      if (j.studentId && activeStu) {
        if (j.studentId === activeStu.id) return true;
        if (
          j.studentName &&
          j.studentName.trim().toLowerCase() === activeNameLower
        ) {
          return true;
        }
        return false;
      }
      if (j.studentName && activeNameLower) {
        return j.studentName.trim().toLowerCase() === activeNameLower;
      }
      if (familyStudents.length > 1 && activeStu) {
        const gradeMatch = familyStudents.find((s) => s.grade === j.gradeLevel);
        if (gradeMatch) return gradeMatch.id === activeStu.id;
      }
      return isPrimary;
    });

    // Ensure every activity that has a reflection in `extendedNotes` also appears in the Journal
    const todayStr = new Date().toISOString().split('T')[0];
    for (const act of studentScopedActivities) {
      const notes = (act.extendedNotes || '').trim();
      if (!notes) continue;
      const alreadyInJournal = baseJournals.some(
        (j) =>
          j.linkedActivityId === act.id &&
          (j.content.trim().toLowerCase() === notes.toLowerCase() ||
            j.id === `jrn_act_${act.id}`)
      );
      if (!alreadyInJournal) {
        const gradeLevel: GradeLevel =
          act.grades && act.grades.length > 0
            ? act.grades[act.grades.length - 1]
            : profile.currentGrade;
        baseJournals.push({
          id: `jrn_act_${act.id}`,
          ownerId: act.ownerId,
          studentId: act.studentId,
          studentName: act.studentName,
          title: `${act.organization} — ${act.position}`.slice(0, 100),
          content: notes,
          promptUsed: 'Activity Reflection',
          gradeLevel,
          linkedActivityId: act.id,
          linkedActivityTitle: act.organization,
          mood: 'Proud',
          hoursLogged: 1,
          isEssaySeed: false,
          entryDate: todayStr,
        });
      }
    }

    return baseJournals;
  }, [
    journalEntries,
    familyStudents,
    activeStudentObj,
    studentScopedActivities,
    profile.currentGrade,
    familyProfile.studentFullName,
    profile.displayName,
  ]);

  // Essay drafts scoped to the currently selected child
  const studentScopedEssayDrafts = useMemo(() => {
    const activeStu = activeStudentObj;
    const activeNameLower = (
      activeStu?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      ''
    )
      .trim()
      .toLowerCase();
    return essayDrafts.filter((d) => {
      if (d.studentId && activeStu) {
        if (d.studentId === activeStu.id) return true;
        if (
          d.studentName &&
          d.studentName.trim().toLowerCase() === activeNameLower
        ) {
          return true;
        }
        return false;
      }
      if (d.studentName && activeNameLower) {
        return d.studentName.trim().toLowerCase() === activeNameLower;
      }
      // Untagged drafts belong to oldest high school student
      if (familyStudents.length > 1 && activeStu) {
        const oldestHs = [...familyStudents]
          .filter((s) => s.grade >= 9)
          .sort((a, b) => b.grade - a.grade)[0];
        if (oldestHs) return oldestHs.id === activeStu.id;
      }
      return true;
    });
  }, [
    essayDrafts,
    familyStudents,
    activeStudentObj,
    familyProfile.studentFullName,
    profile.displayName,
  ]);

  // College deadlines scoped to the currently selected child
  const studentScopedCollegeDeadlines = useMemo(() => {
    const activeStu = activeStudentObj;
    const activeNameLower = (
      activeStu?.name ||
      familyProfile.studentFullName ||
      profile.displayName ||
      ''
    )
      .trim()
      .toLowerCase();
    return collegeDeadlines.filter((d) => {
      if (d.studentId && activeStu) {
        if (d.studentId === activeStu.id) return true;
        if (
          d.studentName &&
          d.studentName.trim().toLowerCase() === activeNameLower
        ) {
          return true;
        }
        return false;
      }
      if (d.studentName && activeNameLower) {
        return d.studentName.trim().toLowerCase() === activeNameLower;
      }
      // Untagged deadlines belong to the child with matching dreamColleges or oldest high school student (never middle school)
      if (familyStudents.length > 1 && activeStu) {
        if (activeStu.grade <= 8) return false;
        const oldestHs = [...familyStudents]
          .filter((s) => s.grade >= 9)
          .sort((a, b) => b.grade - a.grade)[0];
        if (oldestHs) return oldestHs.id === activeStu.id;
      }
      return (activeStu?.grade ?? profile.currentGrade) >= 9;
    });
  }, [
    collegeDeadlines,
    familyStudents,
    activeStudentObj,
    familyProfile.studentFullName,
    profile.displayName,
    profile.currentGrade,
  ]);

  // Computed Metrics & Badges (scoped to active student)
  const badges = useMemo(
    () =>
      evaluateBadges(
        profile,
        studentScopedActivities,
        studentScopedJournals,
        studentScopedHonors
      ),
    [profile, studentScopedActivities, studentScopedJournals, studentScopedHonors]
  );
  const unlockedBadges = useMemo(
    () => badges.filter((b) => b.unlocked),
    [badges]
  );
  const levelInfo = useMemo(
    () => calculateStudentLevel(profile.xp, profile.currentGrade),
    [profile.xp, profile.currentGrade]
  );

  const totalHoursLogged = useMemo(
    () =>
      studentScopedActivities.reduce(
        (acc, a) => acc + calculateActivityTotalHours(a),
        0
      ),
    [studentScopedActivities]
  );

  const avgImpactScore = useMemo(() => {
    if (studentScopedActivities.length === 0) return '0.0';
    const sum = studentScopedActivities.reduce(
      (acc, a) => acc + (Number(a.impactScore) || 4),
      0
    );
    return (sum / studentScopedActivities.length).toFixed(1);
  }, [studentScopedActivities]);

  const starredActivitiesCount = useMemo(
    () =>
      studentScopedActivities.filter(
        (a) =>
          a.commonAppSlot >= 1 &&
          a.commonAppSlot <= 10 &&
          a.grades.some((g) => g >= 9)
      ).length,
    [studentScopedActivities]
  );

  const essaySeedsCount = useMemo(
    () => studentScopedJournals.filter((j) => j.isEssaySeed).length,
    [studentScopedJournals]
  );

  const effectiveStreakDays = useMemo(
    () =>
      Math.max(
        profile.streakDays || 0,
        studentScopedJournals.length > 0 ? 1 : 0
      ),
    [profile.streakDays, studentScopedJournals.length]
  );

  const usedSlots = useMemo(
    () =>
      studentScopedActivities
        .filter(
          (a) =>
            a.commonAppSlot >= 1 &&
            a.commonAppSlot <= 10 &&
            a.grades.some((g) => g >= 9)
        )
        .map((a) => a.commonAppSlot),
    [studentScopedActivities]
  );

  // Map linked reflections per activity ID
  const reflectionsByActivity = useMemo(() => {
    const map: Record<string, JournalEntryItem[]> = {};
    for (const entry of studentScopedJournals) {
      if (entry.linkedActivityId) {
        if (!map[entry.linkedActivityId]) {
          map[entry.linkedActivityId] = [];
        }
        map[entry.linkedActivityId].push(entry);
      }
    }
    return map;
  }, [studentScopedJournals]);

  // Helper to match activity category group
  const matchesCategoryGroup = (
    act: ActivityItem,
    group: ActivityCategoryGroup
  ) => {
    if (group === 'all') return true;
    const t = `${act.activityType} ${act.position} ${act.organization}`.toLowerCase();
    if (group === 'athletics') {
      return (
        act.activityType.includes('Athletics') ||
        t.includes('basketball') ||
        t.includes('track') ||
        t.includes('soccer') ||
        t.includes('sport')
      );
    }
    if (group === 'stem') {
      return (
        act.activityType.includes('Robotics') ||
        act.activityType.includes('Computer') ||
        act.activityType.includes('Science') ||
        act.activityType.includes('Research') ||
        t.includes('robot') ||
        t.includes('code') ||
        t.includes('math')
      );
    }
    if (group === 'arts') {
      return (
        act.activityType.includes('Music') ||
        act.activityType.includes('Art') ||
        act.activityType.includes('Theater') ||
        act.activityType.includes('Dance') ||
        t.includes('cello') ||
        t.includes('orchestra')
      );
    }
    if (group === 'service') {
      return (
        act.activityType.includes('Community Service') ||
        act.activityType.includes('Environmental') ||
        t.includes('volunteer') ||
        t.includes('kit')
      );
    }
    if (group === 'leadership') {
      return (
        act.activityType.includes('Journalism') ||
        act.activityType.includes('Debate') ||
        act.activityType.includes('Student Govt') ||
        act.activityType.includes('Academic')
      );
    }
    return true;
  };

  // Filtered & Sorted Items
  const filteredActivities = useMemo(() => {
    const list = studentScopedActivities.filter((act) => {
      const matchesGrade =
        selectedGradeFilter === 'all' ||
        act.grades.includes(selectedGradeFilter);
      const matchesCat = matchesCategoryGroup(act, activityCategoryGroup);
      const matchesSearch =
        !searchQuery.trim() ||
        act.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.activityType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesCat && matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'impact') {
        const diff = (b.impactScore ?? 4) - (a.impactScore ?? 4);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'hours') {
        const diff =
          calculateActivityTotalHours(b) - calculateActivityTotalHours(a);
        if (diff !== 0) return diff;
      }
      return a.position.localeCompare(b.position);
    });
  }, [
    studentScopedActivities,
    selectedGradeFilter,
    activityCategoryGroup,
    searchQuery,
    sortBy,
  ]);

  const filteredJournal = useMemo(() => {
    return studentScopedJournals.filter((j) => {
      const matchesGrade =
        selectedGradeFilter === 'all' || j.gradeLevel === selectedGradeFilter;
      const matchesSeed =
        journalFilterMode === 'all' || j.isEssaySeed === true;
      const matchesSearch =
        !searchQuery.trim() ||
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSeed && matchesSearch;
    });
  }, [
    studentScopedJournals,
    selectedGradeFilter,
    journalFilterMode,
    searchQuery,
  ]);

  const filteredHonors = useMemo(() => {
    return studentScopedHonors.filter((h) => {
      const matchesGrade =
        selectedGradeFilter === 'all' || h.gradeLevel === selectedGradeFilter;
      const matchesTier =
        honorTierFilter === 'all' || h.recognitionLevel === honorTierFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        h.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesTier && matchesSearch;
    });
  }, [studentScopedHonors, selectedGradeFilter, honorTierFilter, searchQuery]);

  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      if (badgeFilterMode === 'unlocked') return b.unlocked;
      if (badgeFilterMode === 'locked') return !b.unlocked;
      return true;
    });
  }, [badges, badgeFilterMode]);

  const activeDailyPrompt =
    JOURNAL_PROMPTS[promptIndex % JOURNAL_PROMPTS.length].prompt;

  // 5 Core Navigation Items (Cut from 12 down to 5: Overview, Activities, Journal, Colleges, Application)
  const primaryNavItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      desc: 'Grades 6–12 dashboard & progress',
    },
    {
      id: 'activities' as NavTab,
      label: 'Activities',
      shortLabel: 'Activities',
      icon: Award,
      count: studentScopedActivities.length,
      desc: 'Clubs, sports, arts, STEM & service',
    },
    {
      id: 'journal' as NavTab,
      label: 'Journal',
      shortLabel: 'Journal',
      icon: BookOpen,
      count: studentScopedJournals.length,
      desc: 'Personal reflections & essay seeds',
    },
    {
      id: 'ai-coach' as NavTab,
      label: 'Colleges',
      shortLabel: 'Colleges',
      icon: Sparkles,
      desc: 'Published college benchmarks & essay lab',
    },
    {
      id: 'commonapp' as NavTab,
      label: 'Application',
      shortLabel: 'Application',
      icon: GraduationCap,
      count: `${starredActivitiesCount}/10`,
      desc: 'Common App Top 10 & official export',
    },
  ];

  // Secondary items housed cleanly inside the Avatar Menu & Mobile Drawer
  const avatarMenuItems = [
    {
      id: 'profile' as NavTab,
      label: 'Student & Family Profile',
      shortLabel: 'Profile & GPA',
      icon: Users,
      desc: 'GPA, testing, school & family details',
    },
    {
      id: 'honors' as NavTab,
      label: 'Academic Honors',
      shortLabel: 'Honors & Awards',
      icon: Award,
      count: `${studentScopedHonors.length}/5`,
      desc: 'School, state & national distinctions',
    },
    {
      id: 'badges' as NavTab,
      label: 'Growth Milestones',
      shortLabel: 'Milestones',
      icon: Bookmark,
      count: `${unlockedBadges.length}/${badges.length}`,
      desc: 'Multi-year continuity & student milestones',
    },
    {
      id: 'landing' as NavTab,
      label: 'About PathToAdmit',
      shortLabel: 'About & Privacy',
      icon: Compass,
      desc: 'Homepage, privacy pledge & parent guide',
    },
  ];

  const isViewingSamplePortfolio =
    isSampleMode ||
    isDemoFamilyData(familyProfile) ||
    isDemoProfileData(profile);

  const isStudentView = familyProfile.accountRole === 'Student';

  const handleToggleParentStudentView = () => {
    const nextRole = isStudentView ? 'Parent / Guardian' : 'Student';
    setFamilyProfile((prev) => ({ ...prev, accountRole: nextRole }));
    setRegRole(nextRole);
    showToast(`Switched to ${nextRole} View`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#14233C]">
      {/* Unified Ink Navy (#14233C) Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-[#14233C] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Top-Left Mobile Hamburger Icon + Brand Wordmark */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation drawer"
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-2 -ml-1 rounded-xl text-white hover:bg-white/10 active:bg-white/15 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(user ? 'overview' : 'landing')}
              className="flex items-center gap-2 text-left cursor-pointer group min-w-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 group-hover:bg-white/15 border border-white/15 flex items-center justify-center text-[#B8913A] transition-colors shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-semibold text-base sm:text-lg tracking-tight text-white truncate">
                PathToAdmit
              </span>
            </button>
          </div>

          {/* Center: 5 Concise Navigation Items (Fits cleanly at laptop width) */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {primaryNavItems.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'text-white bg-white/15 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        active ? 'text-[#E5C168]' : 'text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: EITHER Sign in (when signed out on Landing/Privacy) OR Student/Account Avatar Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {(activeTab === 'landing' || activeTab === 'privacy') &&
            !user &&
            !isDemoSessionActive ? (
              <>
                <button
                  type="button"
                  onClick={handleViewCompletedProfileScreens}
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Completed examples
                </button>
                {betaStatus.demoLoginEnabled && (
                  <button
                    type="button"
                    onClick={handleDemoAccountLogin}
                    className="px-3 py-1.5 sm:py-2 rounded-xl bg-[#B8913A]/20 hover:bg-[#B8913A]/30 text-[#E5C168] border border-[#E5C168]/40 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E5C168] shrink-0" />
                    <span>Demo Login</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsRegistrationModalOpen(true)}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#14233C] shrink-0" />
                  <span>Sign in</span>
                </button>
              </>
            ) : (
              <>
                {/* Show header Add activity only on non-Overview tabs on tablet/desktop so it never duplicates Overview hero or crowds phone header */}
                {activeTab !== 'overview' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivity(null);
                      setIsActivityModalOpen(true);
                    }}
                    className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] font-semibold text-xs items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#14233C]" />
                    <span>Add activity</span>
                  </button>
                )}

                {!user && !isDemoSessionActive && (
                  <button
                    type="button"
                    onClick={() => setIsRegistrationModalOpen(true)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#E5C168] shrink-0" />
                    <span className="hidden sm:inline">Sign in</span>
                  </button>
                )}

                {/* Student / Account Avatar Menu (Always visible & high-contrast on mobile and desktop in workspace) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                    aria-label="Open student switcher, profile, and account menu"
                    aria-expanded={isAvatarMenuOpen}
                    className="flex items-center gap-1.5 sm:gap-2 p-1 pr-2 sm:pr-2.5 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/30 transition-colors cursor-pointer shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#E5C168] text-[#14233C] font-bold text-xs flex items-center justify-center border border-white/60 uppercase shrink-0">
                      {(
                        activeStudentObj?.name ||
                        familyProfile.studentFullName ||
                        profile.displayName ||
                        user?.displayName ||
                        'S'
                      )
                        .trim()
                        .charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-white max-w-[76px] sm:max-w-[120px] truncate">
                      {(activeStudentObj?.name || familyProfile.studentFullName || '').trim()
                        ? (activeStudentObj?.name || familyProfile.studentFullName)
                            .trim()
                            .split(' ')[0]
                        : isDemoSessionActive && !user
                          ? 'Demo'
                          : 'Student'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#E5C168] shrink-0 transition-transform ${
                        isAvatarMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isAvatarMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-slate-950/20 sm:bg-transparent"
                        onClick={() => setIsAvatarMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="fixed right-3 top-16 sm:absolute sm:right-0 sm:top-full sm:mt-2 w-[calc(100vw-1.5rem)] max-w-80 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl bg-white text-[#14233C] border border-[#E6E1D8] shadow-2xl z-50">
                        {/* Account & Active Student Identity Header */}
                        <div className="p-4 bg-[#FAF8F4] border-b border-[#E6E1D8]">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('profile');
                                setIsAvatarMenuOpen(false);
                              }}
                              className="text-left group min-w-0 cursor-pointer"
                            >
                              <div className="text-xs font-semibold text-[#14233C] group-hover:text-[#2B4C8C] truncate">
                                {activeStudentObj?.name ||
                                  familyProfile.studentFullName ||
                                  profile.displayName ||
                                  'New Student Portfolio'}
                              </div>
                              <div className="text-[11px] text-[#5A6478] mt-0.5">
                                Grade {activeStudentObj?.grade ?? profile.currentGrade} · Class of{' '}
                                {activeStudentObj?.gradYear ?? profile.gradYear}
                              </div>
                            </button>
                            {isDemoSessionActive && !user && (
                              <span className="px-2 py-0.5 rounded bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/30 text-[10px] font-semibold shrink-0">
                                Demo Account
                              </span>
                            )}
                          </div>

                          {/* Multi-Child Quick Switcher inside Student Icon Menu (Visible in Parent View) */}
                          {!isStudentView && familyStudents.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-[#E6E1D8] space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6478]">
                                  Switch Active Child ({familyStudents.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAvatarMenuOpen(false);
                                    setRegEditingStudentId('new');
                                    setRegStudentName('');
                                    setRegSchoolName('');
                                    setRegGrade(9);
                                    setIsRegistrationModalOpen(true);
                                  }}
                                  className="text-[11px] font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
                                >
                                  + Add child
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {familyStudents.map((stu) => {
                                  const isCurrent = activeStudentObj
                                    ? stu.id === activeStudentObj.id
                                    : stu.id === activeStudentId;
                                  return (
                                    <button
                                      key={stu.id}
                                      type="button"
                                      onClick={() => {
                                        handleSwitchActiveStudent(stu.id);
                                        setIsAvatarMenuOpen(false);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                                        isCurrent
                                          ? 'bg-[#14233C] text-white border-[#14233C]'
                                          : 'bg-white text-[#14233C] border-[#E6E1D8] hover:bg-[#FAF8F4]'
                                      }`}
                                    >
                                      <span className="truncate max-w-[110px]">{stu.name}</span>
                                      <span
                                        className={`text-[10px] px-1 py-0.2 rounded ${
                                          isCurrent
                                            ? 'bg-white/15 text-[#E5C168]'
                                            : 'bg-[#FAF8F4] text-[#5A6478]'
                                        }`}
                                      >
                                        {stu.grade}th
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-2.5 flex items-center justify-between pt-2.5 border-t border-[#E6E1D8]">
                            <span className="text-[11px] font-medium text-[#5A6478]">
                              Mode: <strong className="text-[#14233C]">{isStudentView ? 'Student' : 'Parent'}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleParentStudentView();
                                setIsAvatarMenuOpen(false);
                              }}
                              className="text-[11px] font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
                            >
                              Switch to {isStudentView ? 'Parent' : 'Student'} →
                            </button>
                          </div>
                          {/* Daily AI Credits Pill inside Account Header */}
                          <div className="mt-2 pt-2 border-t border-[#E6E1D8] flex items-center justify-between text-[11px]">
                            <span className="text-[#5A6478] flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#B8913A]" />
                              Daily AI Coach Credits:
                            </span>
                            <span className="font-semibold text-[#14233C] tabular-nums">
                              {betaStatus.isApproved ||
                              isDemoSessionActive ||
                              user?.email === ADMIN_EMAIL
                                ? `${betaStatus.aiRemainingToday} / ${betaStatus.dailyUserLimit} left`
                                : 'Invite Code Needed'}
                            </span>
                          </div>
                        </div>

                        {/* Secondary Navigation Items (Profile, Honors, Milestones, About) */}
                        <div className="p-2 space-y-0.5">
                          {avatarMenuItems.map((item) => {
                            const Icon = item.icon;
                            const active = activeTab === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab(item.id);
                                  setIsAvatarMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-[#14233C] text-white font-semibold'
                                    : 'text-[#14233C] hover:bg-[#FAF8F4]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon
                                    className={`w-4 h-4 shrink-0 ${
                                      active ? 'text-[#B8913A]' : 'text-[#5A6478]'
                                    }`}
                                  />
                                  <div className="truncate">
                                    <div>{item.label}</div>
                                    <div
                                      className={`text-[10px] truncate ${
                                        active ? 'text-slate-300' : 'text-[#5A6478]'
                                      }`}
                                    >
                                      {item.desc}
                                    </div>
                                  </div>
                                </div>
                                {item.count && (
                                  <span
                                    className={`text-[11px] tabular-nums font-medium px-1.5 py-0.5 rounded shrink-0 ${
                                      active
                                        ? 'bg-white/15 text-white'
                                        : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                                    }`}
                                  >
                                    {item.count}
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          {/* Family Link Action inside Avatar Menu */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAvatarMenuOpen(false);
                              setIsRegistrationModalOpen(true);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs text-[#14233C] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <Users className="w-4 h-4 text-[#2B4C8C] shrink-0" />
                              <div>
                                <div className="font-medium">Family link &amp; share code</div>
                                <div className="text-[10px] text-[#5A6478]">
                                  Link parent &amp; student Google accounts
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Admin Beta & AI Spend Controls (Visible to dsreddy123@gmail.com) */}
                          {(user?.email === ADMIN_EMAIL || betaStatus.isAdmin) && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAvatarMenuOpen(false);
                                void refreshBetaStatus(user);
                                setIsBetaAdminModalOpen(true);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs bg-[#FAF8F4] hover:bg-[#F3EFE6] border border-[#E5C168]/50 text-[#14233C] transition-colors cursor-pointer mt-1"
                            >
                              <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-[#B8913A] shrink-0" />
                                <div>
                                  <div className="font-semibold text-[#14233C]">
                                    Beta Invites &amp; AI Spend Cap
                                  </div>
                                  <div className="text-[10px] text-[#5A6478]">
                                    Demo: {betaStatus.demoLoginEnabled ? 'ON' : 'OFF'} · {betaStatus.todayGlobalUsed ?? 0}/{betaStatus.globalDailyLimit} AI today
                                  </div>
                                </div>
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Footer inside Avatar Menu */}
                        <div className="p-2.5 bg-[#FAF8F4] border-t border-[#E6E1D8] space-y-1.5">
                          {user ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleFullSignOutAndClear();
                              }}
                              className="w-full py-2 px-3 rounded-lg text-[#A13D34] hover:bg-[#B5473D]/10 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign out ({user.email})</span>
                            </button>
                          ) : isDemoSessionActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleFullSignOutAndClear();
                              }}
                              className="w-full py-2 px-3 rounded-lg text-[#A13D34] hover:bg-[#B5473D]/10 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign out ({DEMO_ACCOUNT_EMAIL})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAvatarMenuOpen(false);
                                setIsRegistrationModalOpen(true);
                              }}
                              className="w-full py-2 px-3 rounded-lg bg-[#14233C] text-white hover:bg-[#1e3252] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <LogIn className="w-3.5 h-3.5 text-[#E5C168]" />
                              <span>Sign in with Google</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Beta Invite Gate Banner for Unapproved Signed-In Users (Only shown on Colleges / AI Coach page) */}
      {activeTab === 'ai-coach' &&
        user &&
        !betaStatus.isApproved &&
        user.email !== ADMIN_EMAIL && (
        <div className="bg-[#FAF8F4] border-b border-[#E5C168] px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#14233C] text-[#E5C168] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14233C]">
                  Family Beta Invite Code Required for AI Coach &amp; Essay Lab
                </p>
                <p className="text-[11px] text-[#5A6478]">
                  PathToAdmit is currently in private family beta. Enter the invite code shared with your family to unlock daily AI coaching credits.
                </p>
              </div>
            </div>
            <form
              onSubmit={handleRedeemBetaCode}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <input
                type="text"
                value={betaCodeInput}
                onChange={(e) => {
                  setBetaCodeInput(e.target.value.toUpperCase());
                  setBetaCodeError('');
                }}
                placeholder="Enter Beta Code (e.g. ADMIT2026)"
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E6E1D8] text-xs font-semibold text-[#14233C] uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#14233C]/20 w-full sm:w-52"
              />
              <button
                type="submit"
                disabled={redeemingBetaCode}
                className="px-4 py-1.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                {redeemingBetaCode ? 'Checking...' : 'Unlock Beta'}
              </button>
            </form>
          </div>
          {betaCodeError && (
            <div className="max-w-7xl mx-auto mt-1.5 text-[11px] font-medium text-[#A13D34]">
              {betaCodeError}
            </div>
          )}
        </div>
      )}

      {/* Standard Left-Side Sliding Navigation Panel (Drawer) on Mobile */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
      >
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />

        <aside
          aria-label="Mobile Navigation"
          className={`fixed top-0 left-0 bottom-0 z-10 w-[78vw] max-w-[300px] bg-white shadow-2xl border-r border-[#E6E1D8] flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            <div className="p-4 bg-[#14233C] text-white flex items-center justify-between border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 text-left cursor-pointer min-w-0"
              >
                <div className="w-8 h-8 rounded-full bg-[#E5C168] text-[#14233C] font-bold text-xs flex items-center justify-center border border-white/50 uppercase shrink-0">
                  {(
                    activeStudentObj?.name ||
                    familyProfile.studentFullName ||
                    profile.displayName ||
                    'S'
                  )
                    .trim()
                    .charAt(0)}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm tracking-tight text-white block truncate">
                    {activeStudentObj?.name ||
                      familyProfile.studentFullName ||
                      profile.displayName ||
                      'Student Portfolio'}
                  </span>
                  <span className="text-[11px] text-[#E5C168] block">
                    Grade {activeStudentObj?.grade ?? profile.currentGrade} · Tap for Profile
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Drawer Child Switcher (Visible in Parent View) */}
            {!isStudentView && familyStudents.length > 0 && (
              <div className="p-3 bg-[#FAF8F4] border-b border-[#E6E1D8] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6478]">
                    Active Student
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setRegEditingStudentId('new');
                      setRegStudentName('');
                      setRegSchoolName('');
                      setRegGrade(9);
                      setIsRegistrationModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
                  >
                    + Add child
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {familyStudents.map((stu) => {
                    const isCurrent = activeStudentObj
                      ? stu.id === activeStudentObj.id
                      : stu.id === activeStudentId;
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => {
                          handleSwitchActiveStudent(stu.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-[#14233C] text-white border-[#14233C]'
                            : 'bg-white text-[#14233C] border-[#E6E1D8]'
                        }`}
                      >
                        <span className="truncate max-w-[110px]">{stu.name}</span>
                        <span
                          className={`text-[10px] px-1 rounded ${
                            isCurrent
                              ? 'bg-white/15 text-[#E5C168]'
                              : 'bg-[#FAF8F4] text-[#5A6478]'
                          }`}
                        >
                          {stu.grade}th
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Parent / Student View Mode Switcher (No XP clutter) */}
            <div className="p-3 bg-[#FAF8F4] border-b border-[#E6E1D8] flex items-center justify-between text-xs">
              <span className="text-[#5A6478]">
                Viewing as: <strong className="text-[#14233C]">{isStudentView ? 'Student' : 'Parent'}</strong>
              </span>
              <button
                type="button"
                onClick={handleToggleParentStudentView}
                className="text-[#2B4C8C] font-semibold text-xs hover:underline cursor-pointer"
              >
                Switch View →
              </button>
            </div>

            {/* 5 Core Navigation Items */}
            <nav className="p-3 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6478] px-3 pt-1 pb-1">
                Portfolio Workspace
              </div>

              {primaryNavItems.map((item) => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#14233C] text-white font-semibold'
                        : 'text-[#14233C] hover:bg-[#FAF8F4]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#B8913A]' : 'text-[#5A6478]'
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs sm:text-sm">{item.shortLabel}</div>
                        <div
                          className={`text-[10px] truncate ${
                            active ? 'text-slate-300' : 'text-[#5A6478]'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    {item.count !== undefined && (
                      <span
                        className={`text-[11px] tabular-nums font-medium px-2 py-0.5 rounded shrink-0 ${
                          active
                            ? 'bg-white/15 text-white'
                            : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6478] px-3 pt-4 pb-1">
                Account &amp; More
              </div>

              {avatarMenuItems.map((item) => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 px-3 rounded-xl text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#14233C] text-white font-semibold'
                        : 'text-[#14233C] hover:bg-[#FAF8F4]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#B8913A]' : 'text-[#5A6478]'
                        }`}
                      />
                      <span className="text-xs truncate">{item.shortLabel}</span>
                    </div>
                    {item.count && (
                      <span className="text-[11px] tabular-nums text-[#5A6478]">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 bg-[#FAF8F4] border-t border-[#E6E1D8] space-y-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsRegistrationModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E1D8] text-[#14233C] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#2B4C8C]" />
              <span>Family Link &amp; Share Code</span>
            </button>

            {user || isDemoSessionActive ? (
              <button
                type="button"
                onClick={() => {
                  void handleFullSignOutAndClear();
                }}
                className="w-full py-2 px-3 rounded-xl text-[#A13D34] hover:bg-[#B5473D]/10 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({user ? user.email : DEMO_ACCOUNT_EMAIL})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsRegistrationModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#14233C] text-white hover:bg-[#1e3252] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#B8913A]" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* LANDING PAGE, PRIVACY PAGE (/privacy), OR PORTFOLIO WORKSPACE */}
      {activeTab === 'landing' ? (
        <main className="flex-1 flex flex-col">
        <LandingPage
          onEnterApp={() => setActiveTab('overview')}
          onStartBlankPortfolio={() => {
            // Only reset if demo data is loaded or no student has been saved yet
            if (
              isDemoFamilyData(familyProfile) ||
              (!familyProfile.studentFullName.trim() && familyStudents.length === 0)
            ) {
              handleResetToCleanSlate();
            }
            setActiveTab('overview');
          }}
          onOpenSignIn={() => setIsRegistrationModalOpen(true)}
          onExploreDemo={handleViewCompletedProfileScreens}
          onOpenPrivacyPage={() => setActiveTab('privacy')}
          isSignedIn={Boolean(user)}
          userEmail={user?.email}
        />
        </main>
      ) : activeTab === 'privacy' ? (
        <main className="flex-1 flex flex-col">
        <PrivacyPage
          onBack={() => setActiveTab(user ? 'overview' : 'landing')}
          onStartPortfolio={() => {
            if (user || familyProfile.studentFullName.trim() || familyStudents.length > 0) {
              setActiveTab('overview');
            } else {
              handleResetToCleanSlate();
              setActiveTab('overview');
            }
          }}
          isSignedIn={Boolean(user)}
        />
        </main>
      ) : (
        <>
          {/* GLOBAL CHILD SWITCHER BAR ON NON-OVERVIEW PAGES (Visible in Parent View across Activities, Journal, Colleges, Application, Profile, Honors, Milestones) */}
          {activeTab !== 'overview' && !isStudentView && familyStudents.length > 0 && (
            <div className="w-full bg-[#FAF8F4] border-b border-[#E6E1D8]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6478] mr-1">
                    {familyStudents.length > 1 ? 'Active Student:' : 'Student:'}
                  </span>
                  {familyStudents.map((stu) => {
                    const isCurrent = activeStudentObj
                      ? stu.id === activeStudentObj.id
                      : stu.id === activeStudentId;
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => handleSwitchActiveStudent(stu.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                            : 'bg-white text-[#14233C] border-[#E6E1D8] hover:bg-[#FAF8F4]'
                        }`}
                      >
                        <span>{stu.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isCurrent
                              ? 'bg-white/15 text-[#E5C168]'
                              : 'bg-[#FAF8F4] text-[#5A6478]'
                          }`}
                        >
                          {stu.grade}th
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setRegEditingStudentId('new');
                      setRegStudentName('');
                      setRegSchoolName('');
                      setRegGrade(9);
                      setIsRegistrationModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold text-[#2B4C8C] bg-white hover:bg-[#FAF8F4] border border-dashed border-[#2B4C8C]/40 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add sibling / child</span>
                  </button>
                </div>
                <div className="text-[11px] text-[#5A6478] hidden md:block">
                  {activeStudentObj?.name || familyProfile.studentFullName} ·{' '}
                  {activeStudentObj?.grade ?? profile.currentGrade}th Grade (Class of{' '}
                  {activeStudentObj?.gradYear ?? profile.gradYear})
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW HERO: Paper (#FAF8F4) with Ink Navy (#14233C) Heading & Text so it is always high-contrast */}
          {activeTab === 'overview' && (
            <section className="relative w-full bg-[#FAF8F4] text-[#14233C] border-b border-[#E6E1D8]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left 7 Cols: Calm Academic Headline in Ink Navy (#14233C), Student Identity & Primary Action */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Student Switcher Bar (Visible in Parent View; hidden in Student View so students only see their own portfolio) */}
                    <div className="space-y-2">
                      {!isStudentView && familyStudents.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6478] mr-1">
                            {familyStudents.length > 1 ? 'Active Student:' : 'Student:'}
                          </span>
                          {familyStudents.map((stu) => {
                            const isCurrent = activeStudentObj
                              ? stu.id === activeStudentObj.id
                              : stu.id === activeStudentId;
                            return (
                              <button
                                key={stu.id}
                                type="button"
                                onClick={() => handleSwitchActiveStudent(stu.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isCurrent
                                    ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                                    : 'bg-white text-[#14233C] border-[#E6E1D8] hover:bg-[#FAF8F4]'
                                }`}
                              >
                                <span>{stu.name}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isCurrent
                                      ? 'bg-white/15 text-[#E5C168]'
                                      : 'bg-[#FAF8F4] text-[#5A6478]'
                                  }`}
                                >
                                  {stu.grade}th
                                </span>
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setRegEditingStudentId('new');
                              setRegStudentName('');
                              setRegSchoolName('');
                              setRegGrade(9);
                              setIsRegistrationModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#2B4C8C] bg-white hover:bg-[#FAF8F4] border border-dashed border-[#2B4C8C]/40 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add sibling / child</span>
                          </button>
                        </div>
                      )}

                      {/* Unboxed Student Identity Line in Ink Navy & Slate */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A6478]">
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="font-semibold text-[#14233C] hover:text-[#2B4C8C] hover:underline cursor-pointer"
                        >
                          {activeStudentObj?.name ||
                            familyProfile.studentFullName ||
                            profile.displayName ||
                            'New student portfolio'}
                        </button>
                        <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
                        <span>
                          {activeStudentObj?.grade ?? profile.currentGrade}th Grade (Class of{' '}
                          {activeStudentObj?.gradYear ?? profile.gradYear})
                        </span>
                        {(activeStudentObj ? activeStudentObj.schoolName : familyProfile.highSchoolName) && (
                          <>
                            <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
                            <span>
                              {activeStudentObj
                                ? activeStudentObj.schoolName
                                : familyProfile.highSchoolName}
                            </span>
                          </>
                        )}
                        {!isStudentView && (
                          <>
                            <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRegEditingStudentId(
                                  activeStudentId || familyStudents[0]?.id || 'stu_primary'
                                );
                                setIsRegistrationModalOpen(true);
                              }}
                              className="text-[#2B4C8C] hover:underline cursor-pointer font-medium"
                            >
                              Edit student / family setup →
                            </button>
                          </>
                        )}
                        <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="text-[#2B4C8C] hover:underline cursor-pointer font-medium"
                        >
                          {profile.currentGrade <= 8
                            ? 'School & interests →'
                            : 'GPA & colleges →'}
                        </button>
                        {isStudentView && (
                          <>
                            <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('badges')}
                              className="text-[#7A5B1C] hover:underline cursor-pointer font-medium tabular-nums"
                            >
                              ★ {unlockedBadges.length}/{badges.length} milestones
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-[#14233C] leading-[1.12] text-balance">
                        Grades 6–12 passions, organized for{' '}
                        <span className="italic text-[#7A5B1C]">
                          college admissions.
                        </span>
                      </h1>
                      <p className="text-xs sm:text-sm text-[#5A6478] max-w-xl leading-relaxed">
                        {GRADE_LABELS[profile.currentGrade].title} —{' '}
                        {GRADE_LABELS[profile.currentGrade].focus}
                      </p>
                    </div>

                    {/* Grade Level Selector */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-medium text-[#5A6478] block">
                        Current grade level:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ALL_GRADES.map((g) => {
                          const isCurrent = profile.currentGrade === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => handleGradeChange(g)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border tabular-nums ${
                                isCurrent
                                  ? 'bg-[#14233C] text-white border-[#14233C] font-semibold'
                                  : 'bg-white text-[#14233C] border-[#E6E1D8] hover:bg-[#E6E1D8]/40'
                              }`}
                            >
                              {g}th
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ONE Primary Action + Secondary Button + Quiet Text Link */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivity(null);
                          setIsActivityModalOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Add activity</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingJournal(null);
                          setIsJournalModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-[#2B4C8C]" />
                        <span>Write reflection</span>
                      </button>

                      {profile.currentGrade <= 8 ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab('badges')}
                          className="text-xs sm:text-sm font-medium text-[#2B4C8C] hover:text-[#14233C] underline underline-offset-4 cursor-pointer ml-1"
                        >
                          View growth milestones ({unlockedBadges.length}/{badges.length}) →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab('commonapp')}
                          className="text-xs sm:text-sm font-medium text-[#2B4C8C] hover:text-[#14233C] underline underline-offset-4 cursor-pointer ml-1"
                        >
                          Preview application ({starredActivitiesCount}/10) →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right 5 Cols: Clean Portfolio Snapshot */}
                  <div className="lg:col-span-5">
                    <HeroEditorialArtwork
                      totalHours={totalHoursLogged}
                      avgImpact={avgImpactScore}
                      top10Count={starredActivitiesCount}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

      {activeTab === 'activities' && (
        <SubpageHeroBanner
          sectionLabel="Activities Directory"
          title="Extracurricular Activities & Leadership"
          subtitle="Manage your 6th–12th grade clubs, sports, arts, and service projects. Rate how meaningful each activity was to your growth (1–5) and star up to 10 high-school activities for your Common App."
          stats={[
            { label: 'Total Activities', value: String(studentScopedActivities.length) },
            {
              label: 'Cumulative Hours',
              value: `${totalHoursLogged.toLocaleString()}h`,
            },
            { label: 'Avg Growth Impact', value: `${avgImpactScore}/5` },
          ]}
          primaryAction={{
            label: '+ Add new activity',
            onClick: () => {
              setEditingActivity(null);
              setIsActivityModalOpen(true);
            },
          }}
          secondaryAction={{
            label: 'View Common App Top 10 →',
            onClick: () => setActiveTab('commonapp'),
          }}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'journal' && (
        <SubpageHeroBanner
          sectionLabel="Reflections & Essay Seeds"
          title="Personal Growth Reflections & Journal"
          subtitle="Capture lessons learned, challenges overcome, and memorable moments from your activities. Bookmark your strongest entries as future college essay seeds."
          stats={[
            {
              label: studentScopedJournals.length === 1 ? 'Reflection' : 'Reflections',
              value: String(studentScopedJournals.length),
            },
            {
              label: essaySeedsCount === 1 ? 'Essay Seed' : 'Essay Seeds',
              value: String(essaySeedsCount),
            },
            {
              label: 'Active Streak',
              value: `${effectiveStreakDays} ${effectiveStreakDays === 1 ? 'Day' : 'Days'}`,
            },
          ]}
          primaryAction={{
            label: '+ Write new reflection',
            onClick: () => {
              setEditingJournal(null);
              setIsJournalModalOpen(true);
            },
          }}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'honors' && (
        <SubpageHeroBanner
          sectionLabel="Academic Honors & Awards"
          title="Honors, Distinctions & Competitions"
          subtitle="Document school, state/regional, national, and international awards across 6th–12th grade, pre-formatted for the Common App Honors section."
          stats={[
            {
              label: studentScopedHonors.length === 1 ? 'Total Honor' : 'Total Honors',
              value: String(studentScopedHonors.length),
            },
            {
              label: 'State / National',
              value: String(
                studentScopedHonors.filter((h) => h.recognitionLevel !== 'School').length
              ),
            },
            {
              label: 'Common App Slots',
              value: `${Math.min(5, studentScopedHonors.length)}/5`,
            },
          ]}
          primaryAction={{
            label: '+ Add academic honor',
            onClick: () => {
              setEditingHonor(null);
              setIsHonorModalOpen(true);
            },
          }}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'badges' && (
        <SubpageHeroBanner
          sectionLabel="Portfolio Milestones"
          title="6th–12th Grade Growth Milestones"
          subtitle="Track your multi-year continuity, reflection consistency, and portfolio readiness as you progress from middle school exploration to college applications."
          stats={[
            {
              label: 'Current Level',
              value: `Lvl ${levelInfo.level}`,
            },
            { label: 'Total XP', value: `${profile.xp} XP` },
            {
              label: 'Completed',
              value: `${unlockedBadges.length}/${badges.length}`,
            },
          ]}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'ai-coach' && (
        <SubpageHeroBanner
          sectionLabel="Dream College Data, AI Coach & Essay Lab"
          title="Published College Admissions Data, GPA Gap & AI Coach"
          subtitle="Compare your GPA, course rigor, test scores, and activities against annual published college admissions data (Common Data Set), get personalized improvement steps, and run AI Essay Critique."
          stats={[
            { label: 'Your GPA', value: familyProfile.unweightedGpa || 'Add GPA' },
            {
              label: studentScopedActivities.length === 1 ? 'Activity' : 'Activities',
              value: String(studentScopedActivities.length),
            },
            {
              label: studentScopedHonors.length === 1 ? 'Honor' : 'Honors',
              value: String(studentScopedHonors.length),
            },
          ]}
          secondaryAction={{
            label: 'Update GPA & dream colleges →',
            onClick: () => setActiveTab('profile'),
          }}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'profile' && (
        <SubpageHeroBanner
          sectionLabel="Student & Family Profile"
          title="Common App Student, Academic & Family Information"
          subtitle="Save your high school GPA, testing, intended majors, parent education/alma mater, occupations, and household context for Common App export and AI Admissions Coaching."
          stats={[
            { label: 'Grade Level', value: `${profile.currentGrade}th Grade` },
            { label: 'Class Year', value: String(profile.gradYear) },
            {
              label: 'Curriculum',
              value: familyProfile.curriculumType,
            },
          ]}
          secondaryAction={{
            label: 'Open AI admissions coach →',
            onClick: () => setActiveTab('ai-coach'),
          }}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'commonapp' && (
        <SubpageHeroBanner
          sectionLabel="Common App Export"
          title="Official Common App Readiness & Export"
          subtitle="Review your starred Top 10 High School Activities (Grades 9–12), 5 Academic Honors, and bookmarked Essay Seeds with one-click copy buttons and CSV/JSON export."
          stats={[
            {
              label: 'Top 10 Slots',
              value: `${starredActivitiesCount}/10`,
            },
            {
              label: 'Academic Honors',
              value: `${Math.min(5, studentScopedHonors.length)}/5`,
            },
            { label: 'Essay Seeds', value: String(essaySeedsCount) },
          ]}
          primaryAction={{
            label: '+ Add activity to Top 10',
            onClick: () => {
              setEditingActivity(null);
              setIsActivityModalOpen(true);
            },
          }}
          secondaryAction={{
            label: 'Edit family & academic info →',
            onClick: () => setActiveTab('profile'),
          }}
          onBackHome={() => setActiveTab('overview')}
        />
      )}

      {/* Main Website Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (() => {
          const hasSavedStudent = Boolean(
            (familyProfile.studentFullName &&
              familyProfile.studentFullName.trim() &&
              familyProfile.studentFullName !== 'Student Scholar') ||
              (profile.displayName &&
                profile.displayName.trim() &&
                profile.displayName !== 'Student Scholar') ||
              familyStudents.length > 0
          );

          const isMiddleSchool = profile.currentGrade <= 8;

          const rawSteps = [
            {
              stepNumber: 1,
              step: 'Step 1',
              title: isStudentView ? 'Student profile setup' : 'Student & family setup',
              desc: hasSavedStudent
                ? isStudentView
                  ? `Saved: ${familyProfile.studentFullName || profile.displayName} (${profile.currentGrade}th Grade).`
                  : `Saved: ${
                      familyStudents.length > 1
                        ? familyStudents.map((s) => `${s.name} (${s.grade}th)`).join(', ')
                        : `${familyProfile.studentFullName || profile.displayName} (${profile.currentGrade}th Grade)`
                    }. Click to edit or add another child.`
                : 'Set your student’s name, current grade (6th–12th), and school details.',
              done: hasSavedStudent,
              cta: hasSavedStudent
                ? isStudentView
                  ? 'view profile'
                  : 'edit family or add sibling'
                : 'complete family setup',
              onClick: () => {
                if (isStudentView) {
                  setActiveTab('profile');
                  return;
                }
                setRegEditingStudentId(
                  activeStudentId || familyStudents[0]?.id || 'stu_primary'
                );
                setIsRegistrationModalOpen(true);
              },
            },
            isMiddleSchool
              ? {
                  stepNumber: 2,
                  step: 'Step 2',
                  title: 'School & favorite subjects',
                  desc: 'Add your middle school name and explore curiosity areas without GPA or testing pressure.',
                  done: Boolean(familyProfile.highSchoolName && familyProfile.highSchoolName.trim()),
                  cta: 'update school & interests',
                  onClick: () => setActiveTab('profile'),
                }
              : {
                  stepNumber: 2,
                  step: 'Step 2',
                  title: 'School, GPA & colleges',
                  desc: 'Add high school details, unweighted/weighted GPA, testing, and target colleges.',
                  done: Boolean(familyProfile.unweightedGpa && profile.dreamColleges),
                  cta: 'update GPA & colleges',
                  onClick: () => setActiveTab('profile'),
                },
            {
              stepNumber: 3,
              step: 'Step 3',
              title: isMiddleSchool
                ? 'Explore clubs, sports & arts'
                : 'Log activities (grades 6–12)',
              desc: isMiddleSchool
                ? 'Try clubs, instruments, sports, and projects in grades 6–8 to discover what you genuinely enjoy.'
                : 'Record clubs, athletics, arts, STEM, and volunteering with 150-character descriptions.',
              done: studentScopedActivities.length > 0,
              cta: 'log an activity',
              onClick: () => {
                setEditingActivity(null);
                setIsActivityModalOpen(true);
              },
            },
            {
              stepNumber: 4,
              step: 'Step 4',
              title: isMiddleSchool ? 'Reflections & memories' : 'Reflections & honors',
              desc: isMiddleSchool
                ? 'Write short reflections on what you learned or enjoyed most in your activities.'
                : 'Write personal reflections to bookmark essay seeds and log up to 5 academic honors.',
              done: isMiddleSchool
                ? studentScopedJournals.length > 0
                : studentScopedJournals.length > 0 && studentScopedHonors.length > 0,
              cta:
                studentScopedJournals.length === 0
                  ? 'write first reflection'
                  : 'add academic honor',
              onClick: () =>
                studentScopedJournals.length === 0
                  ? setActiveTab('journal')
                  : setActiveTab('honors'),
            },
            isMiddleSchool
              ? {
                  stepNumber: 5,
                  step: 'Step 5',
                  title: 'Growth milestones & habits',
                  desc: 'Build multi-year momentum toward 9th grade; Common App Top 10 selection begins in high school.',
                  done:
                    studentScopedActivities.length >= 1 &&
                    studentScopedJournals.length >= 1,
                  cta: 'view growth milestones',
                  onClick: () => setActiveTab('badges'),
                }
              : {
                  stepNumber: 5,
                  step: 'Step 5',
                  title: 'Common App Top 10',
                  desc: 'Star your strongest 10 high-school activities and export for your Common Application.',
                  done: starredActivitiesCount >= 5,
                  cta: 'review application',
                  onClick: () => setActiveTab('commonapp'),
                },
          ];

          const firstIncompleteIdx = rawSteps.findIndex((s) => !s.done);
          const currentStepIdx = firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx;
          const completedStepsCount = rawSteps.filter((s) => s.done).length;
          const progressPct = Math.round((completedStepsCount / rawSteps.length) * 100);

          const journeySteps = rawSteps.map((s, idx) => {
            let status: 'done' | 'in_progress' | 'not_started' = 'not_started';
            if (s.done) {
              status = 'done';
            } else if (idx === firstIncompleteIdx) {
              status = 'in_progress';
            }
            return { ...s, status };
          });

          const activeStepObj = journeySteps[currentStepIdx];

          return (
            <div className="space-y-10">
              {/* 5-Step Journey with True Statuses (Done / In progress / Not started), Step X of 5, Progress Bar & ONE Continue Button */}
              <section className="bg-white rounded-2xl border border-[#E6E1D8] p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2B4C8C] tabular-nums">
                      <span>
                        Step {activeStepObj.stepNumber} of 5 ·{' '}
                        {completedStepsCount === 5 ? 'All Steps Completed' : activeStepObj.title}
                      </span>
                      <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
                      <span className="text-[#5A6478] font-normal">
                        {completedStepsCount} of 5 done ({progressPct}%)
                      </span>
                    </div>
                    <h2 className="text-lg font-serif font-normal text-[#14233C]">
                      Portfolio Readiness Roadmap
                    </h2>
                  </div>

                  {/* ONE Primary Continue Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={activeStepObj.onClick}
                      className="px-4 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      Continue: {activeStepObj.cta} →
                    </button>
                  </div>
                </div>

                {/* Clean Progress Bar (Especially key on Mobile to replace long card stacks) */}
                <div className="space-y-2">
                  <div className="w-full h-2 rounded-full bg-[#FAF8F4] border border-[#E6E1D8] overflow-hidden">
                    <div
                      className="h-full bg-[#2F7A5A] transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(8, progressPct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between md:hidden text-xs text-[#5A6478]">
                    <span>Next: {activeStepObj.desc}</span>
                    <button
                      type="button"
                      onClick={() => setShowAllStepsMobile((prev) => !prev)}
                      className="text-[#2B4C8C] font-semibold hover:underline ml-2 shrink-0 cursor-pointer"
                    >
                      {showAllStepsMobile ? 'Hide steps' : 'View all 5 steps'}
                    </button>
                  </div>
                </div>

                {/* 5 Step Cards: Hidden on mobile by default (replaced by progress bar), visible on desktop */}
                <div
                  className={`${
                    showAllStepsMobile ? 'grid' : 'hidden md:grid'
                  } grid-cols-1 md:grid-cols-5 gap-3 pt-1`}
                >
                  {journeySteps.map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={item.onClick}
                      className={`rounded-xl border p-3.5 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                        item.status === 'in_progress'
                          ? 'bg-[#FAF8F4] border-[#14233C]'
                          : item.status === 'done'
                            ? 'bg-white border-[#E6E1D8]'
                            : 'bg-[#FAF8F4]/50 border-[#E6E1D8] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-semibold text-[#5A6478] tabular-nums">
                            {item.step}
                          </span>
                          {item.status === 'done' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#276B4E] bg-[#2F7A5A]/12 border border-[#2F7A5A]/25 px-2 py-0.5 rounded">
                              Done
                            </span>
                          )}
                          {item.status === 'in_progress' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7A5B1C] bg-[#B8913A]/15 border border-[#B8913A]/35 px-2 py-0.5 rounded">
                              In progress
                            </span>
                          )}
                          {item.status === 'not_started' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#5A6478] bg-[#FAF8F4] border border-[#E6E1D8] px-2 py-0.5 rounded">
                              Not started
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-semibold text-[#14233C]">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-[#5A6478] mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* REAL EMPTY STATE FOR NEW USERS (No empty charts when studentScopedActivities.length === 0) */}
              {studentScopedActivities.length === 0 ? (
                <section className="bg-white rounded-2xl border border-[#E6E1D8] p-6 sm:p-10 space-y-6">
                  <div className="max-w-2xl space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#2B4C8C]">
                      Welcome · Grade {profile.currentGrade} Starter Studio
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[#14233C]">
                      Log your first activity
                    </h2>
                    <p className="text-sm text-[#5A6478] leading-relaxed">
                      Start with one club, sport, instrument, or project you enjoy right now. Pick a starter template below to pre-fill a Common App–ready entry, or create your own from scratch.
                    </p>
                  </div>

                  {/* Starter Activity Templates Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      {
                        label: 'Robotics, Coding & STEM Club',
                        activityType: 'Robotics / Engineering',
                        position: 'Team Member & Builder',
                        organization: `${familyProfile.highSchoolName || 'School'} Robotics & STEM Club`,
                        description:
                          'Built and programmed competition robot subsystems; collaborated with teammates on sensor testing and match strategy.',
                        extendedNotes:
                          'Great for tracking middle or high school VEX, FIRST LEGO League, FTC, coding clubs, or science fair projects.',
                        hoursPerWeek: 4,
                        weeksPerYear: 30,
                      },
                      {
                        label: 'Competitive Sport or Martial Arts',
                        activityType: 'Athletics: JV/Varsity',
                        position: 'Team Player / Athlete',
                        organization: `${familyProfile.highSchoolName || 'School'} Athletics / Club Team`,
                        description:
                          'Trained year-round in team drills and conditioning; demonstrated sportsmanship and resilience in regional league games.',
                        extendedNotes:
                          'Track seasonal or year-round basketball, soccer, track & field, swimming, tennis, or martial arts belt progression.',
                        hoursPerWeek: 8,
                        weeksPerYear: 32,
                      },
                      {
                        label: 'Music, Orchestra & Performing Arts',
                        activityType: 'Music: Instrumental',
                        position: 'Ensemble Musician',
                        organization: `${familyProfile.highSchoolName || 'School'} Orchestra / Band`,
                        description:
                          'Performed in seasonal concerts and regional solo/ensemble festivals; practiced daily repertoire and sight-reading.',
                        extendedNotes:
                          'Ideal for piano, violin, cello, band, choir, theater productions, or visual art portfolios.',
                        hoursPerWeek: 5,
                        weeksPerYear: 36,
                      },
                      {
                        label: 'Community Service & Peer Tutoring',
                        activityType: 'Community Service (Volunteer)',
                        position: 'Volunteer & Peer Tutor',
                        organization: 'Local Community Center & School Library',
                        description:
                          'Tutored younger students in math and reading; organized weekend community food and book drives.',
                        extendedNotes:
                          'Log service hours consistently across grades 6–12 so you never lose track of supervisor names and dates.',
                        hoursPerWeek: 3,
                        weeksPerYear: 28,
                      },
                      {
                        label: 'Math & Science Competitions',
                        activityType: 'Academic',
                        position: 'Competition Team Member',
                        organization: 'MathCounts / AMC / Science Olympiad',
                        description:
                          'Prepared weekly for regional problem-solving rounds and lab events; placed in top tier at invitational tournaments.',
                        extendedNotes:
                          'Track AMC 8/10/12, MathCounts, Science Olympiad, History Day, or Spelling/Geography Bee preparation.',
                        hoursPerWeek: 3,
                        weeksPerYear: 26,
                      },
                      {
                        label: 'Student Council, Debate & Journalism',
                        activityType: 'Student Govt. / Politics',
                        position: 'Class Representative / Speaker',
                        organization: `${familyProfile.highSchoolName || 'School'} Student Council & Debate`,
                        description:
                          'Represented grade-level peers in school initiatives; organized spirit events and researched policy debate topics.',
                        extendedNotes:
                          'Captures early leadership, public speaking, Model UN, school newspaper, or yearbook contributions.',
                        hoursPerWeek: 3,
                        weeksPerYear: 32,
                      },
                    ].map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => {
                          setEditingActivity(null);
                          setActivityPrefill(tpl);
                          setIsActivityModalOpen(true);
                        }}
                        className="p-4 rounded-xl bg-[#FAF8F4] hover:bg-white border border-[#E6E1D8] hover:border-[#2B4C8C] text-left transition-all cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#14233C] group-hover:text-[#2B4C8C] flex items-center justify-between gap-2">
                            <span>{tpl.label}</span>
                            <Plus className="w-3.5 h-3.5 text-[#2B4C8C] shrink-0" />
                          </div>
                          <p className="text-[11px] text-[#5A6478] mt-1.5 leading-relaxed">
                            {tpl.description}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#E6E1D8] flex items-center justify-between text-[11px] text-[#2B4C8C] font-medium tabular-nums">
                          <span>{tpl.activityType}</span>
                          <span>Use template →</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingActivity(null);
                        setActivityPrefill(null);
                        setIsActivityModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log custom activity</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleViewCompletedProfileScreens}
                      className="text-xs font-medium text-[#5A6478] hover:text-[#14233C] underline cursor-pointer"
                    >
                      Or browse completed student profile screens on the homepage →
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  {/* Grades 6–12 Timeline Filter Strip */}
                  <section className="bg-white rounded-2xl border border-[#E6E1D8] p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h2 className="text-lg font-serif font-normal text-[#14233C]">
                          Grades 6–12 Timeline
                        </h2>
                        <p className="text-xs text-[#5A6478]">
                          Select any grade level to filter activities and reflections from that school year.
                        </p>
                      </div>
                      {selectedGradeFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedGradeFilter('all')}
                          className="text-xs font-medium text-[#2B4C8C] hover:underline cursor-pointer self-start sm:self-auto"
                        >
                          Reset Filter (Show All Grades)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {ALL_GRADES.map((g) => {
                        const actsInGrade = studentScopedActivities.filter((a) =>
                          a.grades.includes(g)
                        );
                        const isSelected = selectedGradeFilter === g;
                        const isCurrent = profile.currentGrade === g;

                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() =>
                              setSelectedGradeFilter(isSelected ? 'all' : g)
                            }
                            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between tabular-nums ${
                              isSelected
                                ? 'bg-[#14233C] text-white border-[#14233C]'
                                : isCurrent
                                  ? 'bg-[#FAF8F4] text-[#14233C] border-[#2B4C8C]'
                                  : 'bg-white hover:bg-[#FAF8F4] text-[#14233C] border-[#E6E1D8]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-sm">
                                  {g}th Grade
                                </span>
                                {isCurrent && (
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[#2B4C8C]/12 text-[#2B4C8C]'
                                    }`}
                                  >
                                    Current
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-[11px] mt-0.5 ${
                                  isSelected ? 'text-slate-300' : 'text-[#5A6478]'
                                }`}
                              >
                                {g <= 8 ? 'Middle School' : 'High School'}
                              </p>
                            </div>

                            <div
                              className={`mt-3 pt-2 border-t text-xs font-medium ${
                                isSelected
                                  ? 'border-white/15 text-white'
                                  : 'border-[#E6E1D8] text-[#2B4C8C]'
                              }`}
                            >
                              {actsInGrade.length}{' '}
                              {actsInGrade.length === 1 ? 'activity' : 'activities'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Cumulative Activity Hours Trend Chart */}
                  <CumulativeHoursChart
                    activities={studentScopedActivities}
                    currentGrade={profile.currentGrade}
                  />

                  {/* Daily Reflection Prompt & Readiness / Milestones Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Left 7 Cols: Clean Reflection Composer */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E1D8] p-6 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#2B4C8C]">
                            Reflection Journal
                          </span>
                          <button
                            type="button"
                            onClick={() => setPromptIndex((i) => i + 1)}
                            className="text-xs font-medium text-[#2B4C8C] hover:underline cursor-pointer"
                          >
                            Next Prompt →
                          </button>
                        </div>

                        <h3 className="text-base sm:text-lg font-serif font-normal text-[#14233C]">
                          &ldquo;{activeDailyPrompt}&rdquo;
                        </h3>

                        <form
                          onSubmit={handleQuickDailyCheckIn}
                          className="space-y-3 pt-1"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-[#5A6478] mr-1">Tag:</span>
                            {MOOD_LIST.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setQuickMemoryMood(m)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                  quickMemoryMood === m
                                    ? 'bg-[#14233C] text-white border-[#14233C]'
                                    : 'bg-white text-[#5A6478] border-[#E6E1D8] hover:bg-[#FAF8F4]'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>

                          <textarea
                            rows={2}
                            value={quickMemoryText}
                            onChange={(e) => setQuickMemoryText(e.target.value)}
                            placeholder="Write a brief reflection or takeaway from today..."
                            className="w-full rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-3.5 py-2.5 text-sm text-[#14233C] placeholder:text-[#5A6478] focus:outline-none focus:bg-white focus:border-[#2B4C8C]"
                          />

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#5A6478]">
                              Saved to {profile.currentGrade}th Grade Journal
                            </span>
                            <button
                              type="submit"
                              disabled={!quickMemoryText.trim() || savingQuickMemory}
                              className="px-4 py-2 rounded-lg bg-[#14233C] hover:bg-[#1e3252] disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                {savingQuickMemory ? 'Saving...' : 'Save Reflection'}
                              </span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Right 5 Cols: Calm Readiness & Milestones Summary */}
                    <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E1D8] p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#7A5B1C] tabular-nums">
                            ★ Milestones ({unlockedBadges.length}/{badges.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('badges')}
                            className="text-xs font-medium text-[#2B4C8C] hover:underline cursor-pointer"
                          >
                            View All →
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {badges.slice(0, 4).map((b) => (
                            <div
                              key={b.id}
                              className={`p-3 rounded-xl border ${
                                b.unlocked
                                  ? 'bg-[#B8913A]/8 border-[#B8913A]/30'
                                  : 'bg-[#FAF8F4]/60 border-[#E6E1D8] opacity-70'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs text-[#14233C] truncate">
                                  {b.name}
                                </span>
                                {b.unlocked && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B8913A] shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-[#5A6478] mt-1 tabular-nums">
                                {b.unlocked
                                  ? 'Completed'
                                  : `${b.progressCurrent}/${b.progressTarget} ${b.unitLabel}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E6E1D8] flex items-center justify-between text-xs">
                        <span className="text-[#5A6478]">
                          Academic Honors ({studentScopedHonors.length}/5):
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('honors')}
                          className="font-semibold text-[#2B4C8C] hover:underline cursor-pointer tabular-nums"
                        >
                          Manage Honors →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Activities Grid Section */}
                  <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-serif font-normal text-[#14233C]">
                          {selectedGradeFilter === 'all'
                            ? 'Extracurricular Activities'
                            : `${selectedGradeFilter}th Grade Activities`}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#5A6478]">
                          Rate growth impact (1–5) and star up to 10 high-school activities for your Common Application.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('activities')}
                          className="px-3.5 py-2 rounded-lg bg-white border border-[#E6E1D8] hover:bg-[#FAF8F4] text-xs font-medium text-[#14233C] cursor-pointer tabular-nums"
                        >
                          View All ({studentScopedActivities.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActivity(null);
                            setIsActivityModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Activity</span>
                        </button>
                      </div>
                    </div>

                    {filteredActivities.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-[#E6E1D8] p-10 text-center space-y-3">
                        <h3 className="text-base font-semibold text-[#14233C]">
                          No activities logged for {selectedGradeFilter}th Grade yet
                        </h3>
                        <p className="text-sm text-[#5A6478] max-w-md mx-auto">
                          Add clubs, athletics, music, or community service from {selectedGradeFilter}th grade, or switch back to all grades.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingActivity(null);
                              setIsActivityModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-lg bg-[#14233C] text-white font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Add Activity
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedGradeFilter('all')}
                            className="text-xs font-medium text-[#2B4C8C] hover:underline cursor-pointer"
                          >
                            Show All Grades
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredActivities.slice(0, 4).map((act) => (
                          <ActivityCard
                            key={act.id}
                            activity={act}
                            linkedReflections={reflectionsByActivity[act.id] || []}
                            onEdit={(item) => {
                              setEditingActivity(item);
                              setIsActivityModalOpen(true);
                            }}
                            onDelete={(id) =>
                              setDeleteConfirmId({ type: 'activity', id })
                            }
                            onToggleStar={handleToggleStarActivity}
                            onUpdateImpactScore={handleUpdateImpactScore}
                            onAddQuickReflection={handleAddQuickReflection}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          );
        })()}

        {/* TAB 2: ACTIVITIES PAGE */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            {/* Toggle Bar for Dynamic Activity Template Suggestions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F4] border border-[#E6E1D8] rounded-2xl px-5 py-3.5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#14233C]">
                  Dynamic Activity Template Suggestions
                </span>
                <p className="text-xs text-[#5A6478] mt-0.5">
                  Select an activity type (Math Olympiad, Science Olympiad, Basketball, Volunteering, Robotics, Debate, Music &amp; more) to see tailored role and 150-character Common App templates.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setShowRecentCompetitionsPanel(!showRecentCompetitionsPanel)
                }
                className="px-3.5 py-2 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                {showRecentCompetitionsPanel
                  ? 'Hide Activity Templates'
                  : 'Browse Dynamic Activity Templates'}
              </button>
            </div>

            {showRecentCompetitionsPanel && (
              <RecentSchoolCompetitionsPicker
                schoolName={familyProfile.highSchoolName || 'High School'}
                districtOrCity={
                  familyProfile.highSchoolCityState || 'School District'
                }
                currentGrade={profile.currentGrade}
                usedSlots={usedSlots}
                onQuickSaveActivity={(data) => handleSaveActivity(data)}
                onPrefillModal={(prefill) => {
                  setEditingActivity(null);
                  setActivityPrefill(prefill);
                  setIsActivityModalOpen(true);
                }}
              />
            )}

            {/* Single Clean Horizontal Filter & Search Toolbar */}
            <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#5A6478] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities by role, club, sport, or keyword..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] text-xs text-[#14233C] placeholder:text-[#5A6478] focus:outline-none focus:bg-white focus:border-[#14233C]"
                />
              </div>

              {/* Clean Dropdown Filters (Category, Grade, Sort) */}
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={activityCategoryGroup}
                  onChange={(e) =>
                    setActivityCategoryGroup(
                      e.target.value as ActivityCategoryGroup
                    )
                  }
                  aria-label="Filter by category"
                  className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-3 py-2 text-xs font-medium text-[#14233C] focus:outline-none focus:border-[#14233C]"
                >
                  <option value="all">All Categories</option>
                  <option value="athletics">Athletics &amp; Sports</option>
                  <option value="stem">STEM &amp; Robotics</option>
                  <option value="arts">Music &amp; Arts</option>
                  <option value="service">Community Service</option>
                  <option value="leadership">Publications &amp; Speech</option>
                </select>

                <select
                  value={selectedGradeFilter}
                  onChange={(e) =>
                    setSelectedGradeFilter(
                      e.target.value === 'all'
                        ? 'all'
                        : (Number(e.target.value) as GradeLevel)
                    )
                  }
                  aria-label="Filter by grade level"
                  className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-3 py-2 text-xs font-medium text-[#14233C] focus:outline-none focus:border-[#14233C]"
                >
                  <option value="all">All Grades (6th–12th)</option>
                  {ALL_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}th Grade
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'recent' | 'impact' | 'hours')
                  }
                  aria-label="Sort activities"
                  className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-3 py-2 text-xs font-medium text-[#14233C] focus:outline-none focus:border-[#14233C]"
                >
                  <option value="impact">Sort: Highest Growth Impact</option>
                  <option value="hours">Sort: Most Hours Logged</option>
                  <option value="recent">Sort: Alphabetical</option>
                </select>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E1D8] p-12 text-center space-y-3">
                <h3 className="text-base font-semibold text-[#14233C]">
                  No activities yet
                </h3>
                <p className="text-sm text-[#5A6478] max-w-md mx-auto">
                  Log clubs, sports, music, jobs, volunteering or family
                  responsibilities from any grade, 6th through 12th.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(null);
                    setIsActivityModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#14233C] text-white font-medium text-xs cursor-pointer hover:bg-[#1E3354]"
                >
                  + Add your first activity
                </button>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E1D8] p-12 text-center space-y-3">
                <h3 className="text-base font-semibold text-[#14233C]">
                  No matching activities found
                </h3>
                <p className="text-sm text-[#5A6478] max-w-md mx-auto">
                  Try clearing your category or grade filters, or add a new
                  activity to your portfolio.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActivityCategoryGroup('all');
                    setSelectedGradeFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] text-[#14233C] font-medium text-xs cursor-pointer hover:bg-[#E6E1D8]/40"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredActivities.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    linkedReflections={reflectionsByActivity[act.id] || []}
                    onEdit={(item) => {
                      setEditingActivity(item);
                      setIsActivityModalOpen(true);
                    }}
                    onDelete={(id) =>
                      setDeleteConfirmId({ type: 'activity', id })
                    }
                    onToggleStar={handleToggleStarActivity}
                    onUpdateImpactScore={handleUpdateImpactScore}
                    onAddQuickReflection={handleAddQuickReflection}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REFLECTIONS (JOURNAL) PAGE */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            {/* Prompt Starters Strip */}
            <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#14233C] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B8913A]" />
                  Reflection Prompts — Click any prompt to begin writing
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {JOURNAL_PROMPTS.slice(0, 3).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEditingJournal(null);
                      setIsJournalModalOpen(true);
                    }}
                    className="text-left p-3.5 rounded-xl bg-[#FAF8F4] hover:bg-white border border-[#E6E1D8] hover:border-[#14233C] transition-colors cursor-pointer space-y-1"
                  >
                    <div className="text-[11px] font-semibold text-[#14233C]">
                      {p.category} · {p.label}
                    </div>
                    <p className="text-xs text-[#5A6478] leading-relaxed">
                      “{p.prompt}”
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setJournalFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                    journalFilterMode === 'all'
                      ? 'bg-[#14233C] text-white'
                      : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8] hover:bg-[#E6E1D8]/40'
                  }`}
                >
                  All Reflections ({studentScopedJournals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJournalFilterMode('seeds')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    journalFilterMode === 'seeds'
                      ? 'bg-[#14233C] text-white'
                      : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8] hover:bg-[#E6E1D8]/40'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Essay Seeds ({essaySeedsCount})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#5A6478] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reflections..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] text-xs text-[#14233C] focus:outline-none focus:border-[#14233C]"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedGradeFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      selectedGradeFilter === 'all'
                        ? 'bg-[#14233C] text-white'
                        : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                    }`}
                  >
                    All
                  </button>
                  {ALL_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGradeFilter(g)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                        selectedGradeFilter === g
                          ? 'bg-[#14233C] text-white'
                          : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                      }`}
                    >
                      {g}th
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredJournal.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E1D8] p-12 text-center space-y-3">
                <h3 className="text-base font-semibold text-[#14233C]">
                  No reflections found
                </h3>
                <p className="text-sm text-[#5A6478] max-w-md mx-auto">
                  Document key milestones and personal growth moments across
                  your activities.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredJournal.map((entry) => {
                  const linkedAct = studentScopedActivities.find(
                    (a) => a.id === entry.linkedActivityId
                  );
                  return (
                    <article
                      key={entry.id}
                      className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Warm Paper Header Bar */}
                        <div className="px-5 py-3 bg-[#FAF8F4] border-b border-[#E6E1D8] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#14233C]">
                              {entry.gradeLevel}th Grade
                            </span>
                            <span className="text-[#E6E1D8]">·</span>
                            <span className="text-xs font-medium text-[#5A6478]">
                              {entry.mood}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleEssaySeed(entry)}
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                entry.isEssaySeed
                                  ? 'bg-[#B8913A]/15 text-[#7A5B1C] border-[#B8913A]/40 font-semibold'
                                  : 'bg-white text-[#5A6478] border-[#E6E1D8] hover:border-[#14233C]'
                              }`}
                            >
                              <Bookmark className="w-3 h-3" />
                              {entry.isEssaySeed
                                ? 'Essay Seed'
                                : 'Save as Essay Seed'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingJournal(entry);
                                setIsJournalModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[#5A6478] hover:text-[#14233C] hover:bg-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmId({
                                  type: 'journal',
                                  id: entry.id,
                                })
                              }
                              className="p-1.5 rounded-lg text-[#5A6478] hover:text-[#A13D34] hover:bg-[#B5473D]/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-3">
                          <h3 className="text-base font-semibold text-[#14233C]">
                            {entry.title}
                          </h3>
                          <p className="text-sm text-[#5A6478] leading-relaxed whitespace-pre-line">
                            {entry.content}
                          </p>
                        </div>
                      </div>

                      <div className="px-5 py-3 bg-[#FAF8F4] border-t border-[#E6E1D8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6478]">
                        {linkedAct ? (
                          <span className="font-medium text-[#14233C]">
                            {linkedAct.organization} ({linkedAct.position})
                          </span>
                        ) : entry.linkedActivityTitle ? (
                          <span className="font-medium text-[#14233C]">
                            {entry.linkedActivityTitle}
                          </span>
                        ) : (
                          <span>Personal Growth Reflection</span>
                        )}
                        <span className="tabular-nums">
                          {entry.entryDate} · {entry.hoursLogged}h
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HONORS PAGE */}
        {activeTab === 'honors' && (
          <div className="space-y-6">
            {/* Recognition Tier Filter Bar */}
            <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    'all',
                    'International',
                    'National',
                    'State/Regional',
                    'School',
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setHonorTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      honorTierFilter === tier
                        ? 'bg-[#14233C] text-white'
                        : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8] hover:bg-[#E6E1D8]/40'
                    }`}
                  >
                    {tier === 'all' ? 'All Recognition Tiers' : `${tier} Tier`}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedGradeFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    selectedGradeFilter === 'all'
                      ? 'bg-[#14233C] text-white'
                      : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                  }`}
                >
                  All Grades
                </button>
                {ALL_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGradeFilter(g)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      selectedGradeFilter === g
                        ? 'bg-[#14233C] text-white'
                        : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                    }`}
                  >
                    {g}th
                  </button>
                ))}
              </div>
            </div>

            {filteredHonors.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E1D8] p-12 text-center space-y-3">
                <h3 className="text-base font-semibold text-[#14233C]">
                  {honors.length === 0 ? 'No honors or awards yet' : 'No honors match this filter'}
                </h3>
                <p className="text-sm text-[#5A6478] max-w-md mx-auto">
                  {honors.length === 0
                    ? 'Add academic awards, competition results and recognitions as they happen, so nothing is forgotten by senior year.'
                    : 'Try another grade or recognition level.'}
                </p>
                {honors.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingHonor(null);
                      setIsHonorModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#14233C] text-white font-medium text-xs cursor-pointer hover:bg-[#1E3354]"
                  >
                    + Add your first honor
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHonors.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="px-5 py-3 bg-[#FAF8F4] border-b border-[#E6E1D8] flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#14233C] text-white text-[11px] font-semibold">
                        {h.recognitionLevel}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHonor(h);
                            setIsHonorModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#5A6478] hover:text-[#14233C] hover:bg-white cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmId({ type: 'honor', id: h.id })
                          }
                          className="p-1.5 rounded-lg text-[#5A6478] hover:text-[#A13D34] hover:bg-[#B5473D]/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-base font-semibold text-[#14233C] leading-snug">
                        {h.title}
                      </h3>
                      {h.notes && (
                        <p className="text-xs text-[#5A6478] leading-relaxed">
                          {h.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-[#FAF8F4] border-t border-[#E6E1D8] flex items-center justify-between text-xs text-[#5A6478]">
                    <span className="font-medium text-[#14233C]">
                      {h.gradeLevel}th Grade
                    </span>
                    <span className="tabular-nums">{h.awardDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MILESTONES (BADGES) PAGE */}
        {activeTab === 'badges' && (
          <div className="space-y-6">
            {/* Level Progress & Filter Bar */}
            <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 max-w-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#14233C]">
                    Level {levelInfo.level} — {levelInfo.title}
                  </span>
                  <span className="tabular-nums text-[#5A6478]">
                    {unlockedBadges.length} of {badges.length} milestones completed
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#FAF8F4] border border-[#E6E1D8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2F7A5A]"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: `All (${badges.length})` },
                  {
                    id: 'unlocked',
                    label: `Completed (${unlockedBadges.length})`,
                  },
                  {
                    id: 'locked',
                    label: `In Progress (${badges.length - unlockedBadges.length})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setBadgeFilterMode(
                        f.id as 'all' | 'unlocked' | 'locked'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                      badgeFilterMode === f.id
                        ? 'bg-[#14233C] text-white'
                        : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8] hover:bg-[#E6E1D8]/40'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBadges.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
                    b.unlocked
                      ? 'bg-white border-[#B8913A]/40 shadow-xs'
                      : 'bg-white/70 border-[#E6E1D8] opacity-75'
                  }`}
                >
                  <div>
                    <div className="px-5 py-3 bg-[#FAF8F4] border-b border-[#E6E1D8] flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#14233C]">
                        {b.subtitle}
                      </span>
                      {b.unlocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#276B4E] bg-[#2F7A5A]/12 border border-[#2F7A5A]/25 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      ) : (
                        <span className="text-xs tabular-nums text-[#5A6478]">
                          In progress
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-1.5">
                      <h3 className="font-semibold text-base text-[#14233C]">
                        {b.name}
                      </h3>
                      <p className="text-xs text-[#5A6478] leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-[#FAF8F4] border-t border-[#E6E1D8] space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-[#E6E1D8] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2F7A5A]"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (b.progressCurrent / b.progressTarget) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] tabular-nums text-[#5A6478]">
                      <span>
                        {b.progressCurrent}/{b.progressTarget} {b.unitLabel}
                      </span>
                      <span>
                        {Math.min(
                          100,
                          Math.round(
                            (b.progressCurrent / b.progressTarget) * 100
                          )
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5B: DREAM COLLEGES, AI ADMISSIONS COACH & ESSAY CRITIQUE PAGE */}
        {activeTab === 'ai-coach' && (
          <AICoachAndEssayView
            profile={profile}
            familyProfile={familyProfile}
            activities={studentScopedActivities}
            honors={studentScopedHonors}
            journals={studentScopedJournals}
            essayDrafts={studentScopedEssayDrafts}
            collegeDeadlines={studentScopedCollegeDeadlines}
            onNavigateToProfile={() => setActiveTab('profile')}
            onSaveEssayDraft={handleSaveEssayDraft}
            onDeleteEssayDraft={handleDeleteEssayDraft}
            onApplyActivityDescriptionUpgrade={
              handleApplyActivityDescriptionUpgrade
            }
          />
        )}

        {/* TAB 5C: STUDENT & FAMILY PROFILE PAGE */}
        {activeTab === 'profile' && (
          <StudentFamilyProfileView
            profile={profile}
            familyProfile={familyProfile}
            isLiveMode={Boolean(user)}
            isStudentView={isStudentView}
            currentUserEmail={user?.email || ''}
            deletedTrash={deletedTrash}
            portfolioSnapshots={portfolioSnapshots}
            onRestoreDeletedItem={handleRestoreDeletedItem}
            onRestoreSnapshot={handleRestoreSnapshot}
            onSaveProfileAndFamily={handleSaveProfileAndFamily}
            onPullSharedFamilyPortfolio={handlePullSharedFamilyPortfolio}
            onResetToCleanSlate={isStudentView ? undefined : handleResetToCleanSlate}
          />
        )}

        {/* TAB 6: COMMON APP EXPORT PAGE */}
        {activeTab === 'commonapp' && (
          <CommonAppExportView
            profile={profile}
            familyProfile={familyProfile}
            activities={studentScopedActivities}
            honors={studentScopedHonors}
            journals={studentScopedJournals}
            collegeDeadlines={studentScopedCollegeDeadlines}
            onSaveCollegeDeadline={handleSaveCollegeDeadline}
            onUpdateCollegeStatus={handleUpdateCollegeStatus}
            onDeleteCollegeDeadline={handleDeleteCollegeDeadline}
            onSwapSlots={handleSwapSlots}
            onOpenActivityModal={(act) => {
              setEditingActivity(act || null);
              setActivityPrefill(null);
              setIsActivityModalOpen(true);
            }}
            onOpenHonorModal={(hon) => {
              setEditingHonor(hon || null);
              setIsHonorModalOpen(true);
            }}
          />
        )}
      </main>
      </>
      )}

      {/* Modals */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingActivity(null);
          setActivityPrefill(null);
        }}
        onSave={handleSaveActivity}
        initialActivity={editingActivity}
        initialPrefill={activityPrefill}
        schoolName={familyProfile.highSchoolName}
        districtOrCity={familyProfile.highSchoolCityState}
        defaultGrade={profile.currentGrade}
        usedSlots={usedSlots}
        existingActivities={activities}
        students={
          isStudentView
            ? activeStudentObj
              ? [activeStudentObj]
              : []
            : familyStudents
        }
        activeStudentId={activeStudentObj?.id || activeStudentId || familyStudents[0]?.id}
        onSelectStudent={handleSwitchActiveStudent}
        onQuickAddStudent={isStudentView ? undefined : handleQuickAddStudent}
      />

      <JournalModal
        isOpen={isJournalModalOpen}
        onClose={() => {
          setIsJournalModalOpen(false);
          setEditingJournal(null);
        }}
        onSave={handleSaveJournal}
        initialEntry={editingJournal}
        activities={studentScopedActivities}
        defaultGrade={profile.currentGrade}
        students={
          isStudentView
            ? activeStudentObj
              ? [activeStudentObj]
              : []
            : familyStudents
        }
        activeStudentId={activeStudentId || familyStudents[0]?.id}
        onSelectStudent={handleSwitchActiveStudent}
      />

      <HonorModal
        isOpen={isHonorModalOpen}
        onClose={() => {
          setIsHonorModalOpen(false);
          setEditingHonor(null);
        }}
        onSave={handleSaveHonor}
        initialHonor={editingHonor}
        defaultGrade={profile.currentGrade}
        students={
          isStudentView
            ? activeStudentObj
              ? [activeStudentObj]
              : []
            : familyStudents
        }
        activeStudentId={activeStudentId || familyStudents[0]?.id}
        onSelectStudent={handleSwitchActiveStudent}
      />

      {/* Delete Confirmation Modal (Type Student's Name or DELETE + 30-Day Soft Delete & Auto-Snapshot) */}
      {deleteConfirmId && (() => {
        const { type, id } = deleteConfirmId;
        let itemLabel = 'record';
        let itemTitle = '';
        let itemStudentName = '';

        if (type === 'activity') {
          const found = activities.find((a) => a.id === id);
          itemLabel = 'activity';
          itemTitle = found ? `${found.organization} — ${found.position}` : '';
          itemStudentName = found?.studentName || '';
        } else if (type === 'journal') {
          const found = journalEntries.find((j) => j.id === id);
          itemLabel = 'reflection';
          itemTitle = found?.title || '';
          itemStudentName = found?.studentName || '';
        } else if (type === 'honor') {
          const found = honors.find((h) => h.id === id);
          itemLabel = 'honor';
          itemTitle = found?.title || '';
          itemStudentName = found?.studentName || '';
        } else if (type === 'essayDraft') {
          const found = essayDrafts.find((d) => d.id === id);
          itemLabel = 'essay draft';
          itemTitle = found?.versionTitle || '';
          itemStudentName = found?.studentName || '';
        } else if (type === 'collegeDeadline') {
          const found = collegeDeadlines.find((c) => c.id === id);
          itemLabel = 'college deadline';
          itemTitle = found?.collegeName || '';
          itemStudentName = found?.studentName || '';
        }

        const expectedFull = (
          itemStudentName ||
          activeStudentObj?.name ||
          familyProfile.studentFullName ||
          profile.displayName ||
          ''
        ).trim();
        const expectedFirst = expectedFull.split(' ')[0] || '';
        const typed = deleteConfirmInput.trim();
        const typedLower = typed.toLowerCase();
        const isConfirmed =
          typed.toUpperCase() === 'DELETE' ||
          (expectedFull.length >= 2 &&
            typedLower === expectedFull.toLowerCase()) ||
          (expectedFirst.length >= 2 &&
            typedLower === expectedFirst.toLowerCase());

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14233C]/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E6E1D8] shadow-xl space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A13D34]">
                  Protected Soft Delete · 30-Day Recovery
                </span>
                <h3 className="text-lg font-semibold text-[#14233C]">
                  Remove this {itemLabel}?
                </h3>
                {itemTitle && (
                  <p className="text-xs font-semibold text-[#14233C] bg-[#FAF8F4] px-3 py-1.5 rounded-lg border border-[#E6E1D8]">
                    {itemTitle}
                  </p>
                )}
              </div>

              <p className="text-xs text-[#5A6478] leading-relaxed">
                An <strong className="text-[#14233C]">automatic snapshot</strong> will be saved first, and this {itemLabel} will be kept in your <strong className="text-[#14233C]">30-Day Soft-Delete Trash</strong> so you can restore it anytime within 30 days.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#14233C]">
                  To confirm, type{' '}
                  {expectedFull ? (
                    <>
                      <strong className="font-mono">{expectedFull}</strong> (or{' '}
                      <strong className="font-mono">{expectedFirst}</strong>) or{' '}
                    </>
                  ) : null}
                  <strong className="font-mono">DELETE</strong>:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={
                    expectedFull
                      ? `Type "${expectedFirst}" or "DELETE"`
                      : 'Type DELETE to confirm'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D8] text-xs font-mono text-[#14233C] focus:outline-none focus:border-[#B5473D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteConfirmInput('');
                  }}
                  className="px-4 py-2 rounded-lg border border-[#E6E1D8] text-xs font-medium text-[#14233C] hover:bg-[#FAF8F4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isConfirmed}
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg bg-[#B5473D] hover:bg-[#9c3b32] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                >
                  Move to 30-Day Trash
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Registration & Parent/Student Shared Account Setup Modal (With COPPA Under-13 Parent-First Safeguard) */}
      {isRegistrationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E6E1D8] shadow-2xl overflow-hidden my-8">
            <div className="bg-[#14233C] text-white px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5C168] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Step 1 · Parent-led family sign-in
                </span>
                <h3 className="text-lg font-serif font-normal mt-0.5">
                  Sign in or link your family portfolio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegistrationModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* COPPA / Under-13 Parent-First Guidance Banner */}
              <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-3.5 text-xs text-[#5A6478] leading-relaxed">
                <strong className="text-[#14233C]">Students under 13 (grades 6–8):</strong> To protect children&rsquo;s privacy (COPPA), a <strong className="text-[#14233C]">parent or guardian must create the account first</strong> using a parent Google account, then invite or link the student.
              </div>

              {/* STEP 1: Parent vs Student Role Chooser Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#14233C]">
                  1. Select who is signing in:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      role: 'Parent / Guardian' as const,
                      title: 'Parent or guardian (recommended)',
                      subtitle:
                        "Create or manage my child's grades 6–12 portfolio and invite my student or co-parent.",
                    },
                    {
                      role: 'Student' as const,
                      title: 'Student (age 13+ or invited by parent)',
                      subtitle:
                        "Sign in to an invited family portfolio or, if 13 or older, log high school activities.",
                    },
                  ].map((option) => {
                    const selected = regRole === option.role;
                    return (
                      <button
                        key={option.role}
                        type="button"
                        onClick={() => {
                          setRegRole(option.role);
                          if (user?.email) {
                            if (option.role === 'Student') {
                              setRegStudentEmail(
                                (prev) => prev || user.email || ''
                              );
                            } else {
                              setRegParentEmail(
                                (prev) => prev || user.email || ''
                              );
                            }
                          }
                        }}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-[#FAF8F4] border-[#14233C] ring-1 ring-[#14233C]'
                            : 'bg-white border-[#E6E1D8] hover:bg-[#FAF8F4]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#14233C]">
                            {option.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              selected
                                ? 'bg-[#14233C] text-white'
                                : 'bg-[#FAF8F4] text-[#5A6478] border border-[#E6E1D8]'
                            }`}
                          >
                            {selected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                        <p className="text-xs text-[#5A6478] mt-1.5 leading-relaxed">
                          {option.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If Student role is selected alongside Grades 6–7 (typically under 13), prompt parent creation */}
              {regRole === 'Student' && regGrade <= 7 && (
                <div className="rounded-xl bg-[#B8913A]/12 border border-[#B8913A]/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#14233C] leading-relaxed">
                    <strong>In {regGrade}th grade (under age 13)?</strong> Please ask a parent or guardian to sign in first and invite your student email, or enter your parent&rsquo;s Family Share Code below.
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegRole('Parent / Guardian')}
                    className="px-3 py-1.5 rounded-lg bg-[#14233C] text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Switch to parent sign-in
                  </button>
                </div>
              )}

              {/* STEP 2: Google Sign-In OR 1-Click Demo Family Login Action Banner */}
              {!user && !isDemoSessionActive ? (
                <div className="rounded-2xl bg-[#14233C] text-white p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5C168]">
                        2. Authenticate with Google as {regRole}
                      </span>
                      <p className="text-xs text-slate-300">
                        {regRole === 'Student' && regGrade <= 7
                          ? 'For grades 6–7, a parent must create the account first or share a Family Share Code.'
                          : `Sign in with your ${
                              regRole === 'Student'
                                ? 'student Google account (age 13+)'
                                : 'parent Google account'
                            } to sync this portfolio.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={regRole === 'Student' && regGrade <= 7 && !regShareCodeInput.trim() && !regParentEmail.trim()}
                      onClick={async () => {
                        try {
                          const cred = await signInWithGoogle();
                          const signedInEmail = cred.user?.email || '';
                          if (signedInEmail) {
                            if (regRole === 'Student') {
                              setRegStudentEmail(signedInEmail);
                            } else {
                              setRegParentEmail(signedInEmail);
                            }
                            await handlePullSharedFamilyPortfolio(signedInEmail);
                          }
                        } catch {
                          // popup closed by user
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F4] disabled:opacity-50 text-[#14233C] font-semibold text-xs flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-[#14233C]" />
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  {/* 1-Click Demo Family Login Option (Toggleable by Admin) */}
                  {betaStatus.demoLoginEnabled && (
                    <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-300">
                        <strong className="text-[#E5C168]">Recording a walkthrough or testing first?</strong>{' '}
                        Sign in to the pre-loaded 2-student Demo Family Account (<code className="text-white">demo@pathtoadmit.com</code>) with live AI Coach enabled.
                      </div>
                      <button
                        type="button"
                        onClick={handleDemoAccountLogin}
                        className="px-4 py-2 rounded-xl bg-[#B8913A] hover:bg-[#a37e2c] text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>Demo Family Login →</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-[#2F7A5A]/10 border border-[#2F7A5A]/30 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#14233C]">
                    <span className="font-semibold">
                      {user
                        ? `Signed in with Google as ${regRole}:`
                        : 'Signed in with Demo Family Account:'}
                    </span>{' '}
                    <span className="font-semibold">
                      {user ? user.email : DEMO_ACCOUNT_EMAIL}
                    </span>
                    <span className="block text-[11px] text-[#5A6478] mt-0.5">
                      {user
                        ? 'Your login email is used for private authentication—the portfolio displays the student’s name below.'
                        : 'Demo Family Account active (Jordan · 10th Grade & Maya · 8th Grade) with live AI Coach access.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleFullSignOutAndClear();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] text-xs font-semibold cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}

              {/* Saved Students in Family Portfolio + Multi-Child Switcher */}
              <div className="rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#14233C] flex items-center gap-1.5">
                      <span>3. Student Profile(s) in Your Family Portfolio</span>
                      {(familyStudents.length > 0 || familyProfile.studentFullName.trim()) &&
                        regEditingStudentId !== 'new' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2F7A5A]/15 text-[#276B4E] border border-[#2F7A5A]/30 text-[10px] font-semibold">
                            ✓ Saved
                          </span>
                        )}
                    </span>
                    <p className="text-[11px] text-[#5A6478] mt-0.5">
                      Have more than one child in grades 6–12? Switch between children below or click{' '}
                      <strong className="text-[#14233C]">+ Add Another Child</strong>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Auto-save any unsaved child currently typed into the form before switching to a blank child form
                      const pendingName = regStudentName.trim().slice(0, 80);
                      if (pendingName && pendingName !== 'Student Scholar') {
                        const existingMatch = familyStudents.find(
                          (s) =>
                            (regEditingStudentId &&
                              regEditingStudentId !== 'new' &&
                              s.id === regEditingStudentId) ||
                            s.name.toLowerCase() === pendingName.toLowerCase()
                        );
                        const savedId = existingMatch?.id || `stu_${Date.now()}`;
                        const savedStu: StudentChildProfile = {
                          ...(existingMatch || {}),
                          id: savedId,
                          name: pendingName,
                          grade: regGrade,
                          gradYear: getDefaultGradYearForGrade(regGrade),
                          schoolName: regSchoolName.trim(),
                          cityState: regCityState.trim(),
                          studentEmail: regStudentEmail.trim(),
                        };
                        setFamilyStudents((prev) =>
                          deduplicateFamilyStudents(
                            prev.some((s) => s.id === savedId)
                              ? prev.map((s) => (s.id === savedId ? savedStu : s))
                              : [...prev, savedStu],
                            isDemoSessionActive
                          )
                        );
                        if (user) {
                          void persistStudentChildToFirestore(user.uid, savedStu);
                        }
                        showToast(`Saved ${pendingName} (${regGrade}th Grade)`);
                      }
                      setRegEditingStudentId('new');
                      setRegStudentName('');
                      setRegSchoolName('');
                      setRegGrade(9);
                      setRegStudentEmail('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                      regEditingStudentId === 'new'
                        ? 'bg-[#14233C] text-white border-[#14233C]'
                        : 'bg-white text-[#2B4C8C] border-[#2B4C8C]/30 hover:bg-[#2B4C8C]/5'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Child</span>
                  </button>
                </div>

                {familyStudents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {familyStudents.map((stu) => {
                      const isSelected =
                        regEditingStudentId !== 'new' &&
                        (regEditingStudentId === stu.id ||
                          (!regEditingStudentId && activeStudentId === stu.id));
                      return (
                        <button
                          key={stu.id}
                          type="button"
                          onClick={() => {
                            setRegEditingStudentId(stu.id);
                            setActiveStudentId(stu.id);
                            setRegStudentName(stu.name);
                            setRegGrade(stu.grade);
                            setRegSchoolName(stu.schoolName || familyProfile.highSchoolName || '');
                            setRegCityState(stu.cityState || familyProfile.highSchoolCityState || '');
                            setRegStudentEmail(stu.studentEmail || '');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                              : 'bg-white text-[#14233C] border-[#E6E1D8] hover:border-[#14233C]/40'
                          }`}
                        >
                          <span>{stu.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-white/15 text-[#E5C168]'
                                : 'bg-[#FAF8F4] text-[#5A6478]'
                            }`}
                          >
                            {stu.grade}th Grade
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {regEditingStudentId === 'new' && (
                  <div className="text-xs font-medium text-[#2B4C8C] bg-white border border-[#2B4C8C]/25 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span>Adding a new sibling/child to your family portfolio</span>
                    {familyStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const first = familyStudents[0];
                          setRegEditingStudentId(first.id);
                          setRegStudentName(first.name);
                          setRegGrade(first.grade);
                          setRegSchoolName(first.schoolName || '');
                          setRegCityState(first.cityState || '');
                          setRegStudentEmail(first.studentEmail || '');
                        }}
                        className="text-[11px] text-[#5A6478] hover:text-[#14233C] underline cursor-pointer"
                      >
                        Cancel new child
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      Student&apos;s Full Name (Shown on Portfolio) *
                    </label>
                    <input
                      type="text"
                      value={regStudentName}
                      onChange={(e) => setRegStudentName(e.target.value)}
                      placeholder="e.g., Aarav Reddy"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      Student&apos;s Current Grade Level *
                    </label>
                    <select
                      aria-label="Student grade"
                      value={regGrade}
                      onChange={(e) =>
                        setRegGrade(Number(e.target.value) as GradeLevel)
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    >
                      {ALL_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}th Grade ({g <= 8 ? 'Middle School' : 'High School'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      School Name
                    </label>
                    <input
                      type="text"
                      value={regSchoolName}
                      onChange={(e) => setRegSchoolName(e.target.value)}
                      placeholder="e.g., Westwood High School"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      School District / City &amp; State
                    </label>
                    <input
                      type="text"
                      value={regCityState}
                      onChange={(e) => setRegCityState(e.target.value)}
                      placeholder="e.g., Austin, TX"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      Student Email (Optional — For Student Login Sync)
                    </label>
                    <input
                      type="email"
                      value={regStudentEmail}
                      onChange={(e) => setRegStudentEmail(e.target.value)}
                      placeholder="student@email.com"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      Parent 1 Email (Optional — For Parent Login Sync)
                    </label>
                    <input
                      type="email"
                      value={regParentEmail}
                      onChange={(e) => setRegParentEmail(e.target.value)}
                      placeholder="parent1@email.com"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#14233C] mb-1.5">
                      Parent 2 / Co-Parent Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={regParent2Email}
                      onChange={(e) => setRegParent2Email(e.target.value)}
                      placeholder="parent2@email.com"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                    />
                  </div>
                </div>
              </div>

              {/* Already have a Family Share Code or Linked Email? Pull it */}
              <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#14233C]">
                    Joining an existing Student or Parent Portfolio?
                  </span>
                  <p className="text-[11px] text-[#5A6478] mt-0.5">
                    Enter your Family Share Code (e.g.,{' '}
                    <span className="font-semibold text-[#14233C]">
                      {familyProfile.familyShareCode || 'PF-XXXX-XXXX-XXXX'}
                    </span>
                    ) or the other family member&apos;s email to sync immediately:
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={regShareCodeInput}
                    onChange={(e) => setRegShareCodeInput(e.target.value)}
                    placeholder="Share Code or Email..."
                    className="px-3 py-1.5 text-xs bg-white border border-[#E6E1D8] rounded-lg text-[#14233C] w-44"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await handlePullSharedFamilyPortfolio(
                        regShareCodeInput
                      );
                      if (ok) {
                        setIsRegistrationModalOpen(false);
                        if (activeTab === 'landing') {
                          setActiveTab('overview');
                        }
                      } else {
                        showToast(
                          'No matching shared family portfolio found yet — save your profile first to publish your code.'
                        );
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] text-xs font-semibold cursor-pointer"
                  >
                    Sync Family
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E1D8]">
                <p className="text-[11px] text-[#5A6478]">
                  Saving opens your student&apos;s grades 6–12 portfolio immediately.
                </p>
                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsRegistrationModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E6E1D8] text-xs font-medium text-[#14233C] hover:bg-[#FAF8F4] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const cleanName =
                        regStudentName.trim().slice(0, 80) ||
                        familyProfile.studentFullName.trim() ||
                        'Student Scholar';
                      const computedGradYear = getDefaultGradYearForGrade(regGrade);
                      const shareCode = secureFamilyShareCode(
                        familyProfile.familyShareCode
                      );
                      const targetId =
                        regEditingStudentId === 'new'
                          ? `stu_${Date.now()}`
                          : regEditingStudentId ||
                            activeStudentId ||
                            familyStudents[0]?.id ||
                            'stu_primary';

                      // Close modal and navigate to portfolio immediately so the parent sees the saved student right away
                      setIsRegistrationModalOpen(false);
                      setRegEditingStudentId(targetId);
                      if (activeTab === 'landing' || activeTab === 'privacy') {
                        setActiveTab('overview');
                      }

                      await handleSaveProfileAndFamily(
                        {
                          displayName: cleanName,
                          currentGrade: regGrade,
                          gradYear: computedGradYear,
                        },
                        {
                          ...familyProfile,
                          studentFullName: cleanName,
                          preferredName: cleanName.split(' ')[0] || cleanName,
                          highSchoolName:
                            regSchoolName.trim() || familyProfile.highSchoolName,
                          highSchoolCityState:
                            regCityState.trim() ||
                            familyProfile.highSchoolCityState,
                          accountRole: regRole,
                          studentEmail: regStudentEmail.trim(),
                          parentEmail:
                            regParentEmail.trim() || user?.email || '',
                          parent2Email: regParent2Email.trim(),
                          familyShareCode: shareCode,
                        },
                        targetId
                      );
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    {regEditingStudentId === 'new'
                      ? 'Save New Child & Open Portfolio →'
                      : 'Save Student Setup & Open Portfolio →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Beta Access & AI Spend Guard Modal (dsreddy123@gmail.com) */}
      {isBetaAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-3xl border border-[#E6E1D8] max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-[#14233C] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#E5C168] block">
                  Admin Spend Guard &amp; Beta Control
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Family Beta Invites &amp; Daily AI Caps
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBetaAdminModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs text-[#14233C]">
              {/* Usage Summary Box */}
              <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#5A6478] font-medium">
                    Global Live Gemini Calls Today
                  </div>
                  <div className="text-lg font-bold text-[#14233C] mt-0.5 tabular-nums">
                    {betaStatus.todayGlobalUsed ?? 0} / {betaStatus.globalDailyLimit} calls
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#5A6478] font-medium">
                    Per-Family Cap
                  </div>
                  <div className="text-sm font-bold text-[#2B4C8C] mt-0.5">
                    {adminUserLimitInput} calls / day
                  </div>
                </div>
              </div>

              {/* 1-Click Toggle for Demo Family Login Account (demo@pathtoadmit.com) */}
              <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-[#14233C] flex items-center gap-2">
                    <span>Demo Family Login ({DEMO_ACCOUNT_EMAIL})</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        betaStatus.demoLoginEnabled
                          ? 'bg-[#2F7A5A]/15 text-[#276B4E] border border-[#2F7A5A]/30'
                          : 'bg-[#B5473D]/15 text-[#A13D34] border border-[#B5473D]/30'
                      }`}
                    >
                      {betaStatus.demoLoginEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A6478] mt-1">
                    Allows 1-click Demo Family Login for your walkthrough video and family previews. Turn OFF anytime to disable demo access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextState = !betaStatus.demoLoginEnabled;
                    const res = await fetch('/api/beta/admin-update', {
                      method: 'POST',
                      headers: await getAiAuthHeaders(),
                      body: JSON.stringify({
                        adminEmail: user?.email,
                        demoLoginEnabled: nextState,
                      }),
                    });
                    if (res.ok) {
                      await refreshBetaStatus(user);
                      showToast(
                        nextState
                          ? 'Demo Family Login (demo@pathtoadmit.com) ENABLED!'
                          : 'Demo Family Login DISABLED!'
                      );
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                    betaStatus.demoLoginEnabled
                      ? 'bg-[#B5473D] hover:bg-[#9c3b32] text-white'
                      : 'bg-[#2F7A5A] hover:bg-[#256348] text-white'
                  }`}
                >
                  {betaStatus.demoLoginEnabled ? 'Disable Demo Login' : 'Enable Demo Login'}
                </button>
              </div>

              {/* Active Family Beta Invite Code */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#14233C]">
                  1. Shared Family Beta Invite Code
                </label>
                <p className="text-[11px] text-[#5A6478]">
                  Share this code with families you invite. Anyone signing in without an approved email must enter this code before using AI features.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={adminInviteCodeInput}
                    onChange={(e) =>
                      setAdminInviteCodeInput(e.target.value.toUpperCase())
                    }
                    className="px-3.5 py-2 rounded-xl border border-[#E6E1D8] bg-[#FAF8F4] font-bold text-sm text-[#14233C] uppercase tracking-wider flex-1"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch('/api/beta/admin-update', {
                        method: 'POST',
                        headers: await getAiAuthHeaders(),
                        body: JSON.stringify({
                          adminEmail: user?.email,
                          newInviteCode: adminInviteCodeInput,
                          dailyUserLimit: adminUserLimitInput,
                          globalDailyLimit: adminGlobalLimitInput,
                        }),
                      });
                      if (res.ok) {
                        await refreshBetaStatus(user);
                        showToast('Updated Beta Invite Code & Daily AI Caps!');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold cursor-pointer"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Daily Caps */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14233C] mb-1">
                    Per-Family Daily AI Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={adminUserLimitInput}
                    onChange={(e) =>
                      setAdminUserLimitInput(Number(e.target.value) || 10)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E1D8] bg-[#FAF8F4] font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14233C] mb-1">
                    Global Daily Server AI Cap
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={adminGlobalLimitInput}
                    onChange={(e) =>
                      setAdminGlobalLimitInput(Number(e.target.value) || 100)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E1D8] bg-[#FAF8F4] font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Pre-Approved Family Emails */}
              <div className="space-y-2 pt-2 border-t border-[#E6E1D8]">
                <label className="block font-semibold text-[#14233C]">
                  2. Pre-Approved Family Emails ({betaStatus.approvedEmails?.length || 1})
                </label>
                <p className="text-[11px] text-[#5A6478]">
                  Families added here are automatically unlocked as soon as they sign in with Google (no code entry needed).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={adminAddEmailInput}
                    onChange={(e) => setAdminAddEmailInput(e.target.value)}
                    placeholder="parent.or.student@gmail.com"
                    className="px-3.5 py-2 rounded-xl border border-[#E6E1D8] bg-[#FAF8F4] text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!adminAddEmailInput.includes('@')) return;
                      const res = await fetch('/api/beta/admin-update', {
                        method: 'POST',
                        headers: await getAiAuthHeaders(),
                        body: JSON.stringify({
                          adminEmail: user?.email,
                          addEmail: adminAddEmailInput.trim(),
                        }),
                      });
                      if (res.ok) {
                        setAdminAddEmailInput('');
                        await refreshBetaStatus(user);
                        showToast('Family email added to approved list!');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2B4C8C] hover:bg-[#1e3a6d] text-white font-semibold cursor-pointer"
                  >
                    + Approve Email
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                  {(betaStatus.approvedEmails || [ADMIN_EMAIL]).map((emailItem) => (
                    <div
                      key={emailItem}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8]"
                    >
                      <span className="font-medium truncate">{emailItem}</span>
                      {emailItem === ADMIN_EMAIL ? (
                        <span className="text-[10px] font-semibold text-[#7A5B1C] uppercase">
                          Admin
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch('/api/beta/admin-update', {
                              method: 'POST',
                              headers: await getAiAuthHeaders(),
                              body: JSON.stringify({
                                adminEmail: user?.email,
                                removeEmail: emailItem,
                              }),
                            });
                            await refreshBetaStatus(user);
                          }}
                          className="text-[11px] text-[#A13D34] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ink Navy Toast Notification with Instant 1-Click Undo for Soft-Deleted Records */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#14233C] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/80 text-xs font-medium flex items-center gap-3">
          <span>{toastMessage}</span>
          {lastSoftDeletedItem &&
            toastMessage.toLowerCase().includes('30-day trash') && (
              <button
                type="button"
                onClick={() => void handleRestoreDeletedItem(lastSoftDeletedItem)}
                className="px-2.5 py-1 rounded-lg bg-[#E5C168] hover:bg-[#d4af55] text-[#14233C] font-bold text-[11px] cursor-pointer shrink-0"
              >
                Undo / Restore
              </button>
            )}
        </div>
      )}
    </div>
  );
}

export default App;
