import React, { useState, useEffect, useMemo } from 'react';
import { secureFamilyShareCode } from '../firebase';
import {
  User,
  GraduationCap,
  Users,
  HeartHandshake,
  Save,
  Copy,
  Check,
  Sparkles,
  Building2,
  BookOpen,
  ShieldCheck,
  MapPin,
  Mail,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import {
  UserProfile,
  FamilyProfileItem,
  CurriculumType,
  HouseholdStructureType,
  Parent1RelationshipType,
  Parent2RelationshipType,
  ALL_GRADES,
  GradeLevel,
  getDefaultGradYearForGrade,
  SoftDeletedTrashItem,
  PortfolioSnapshotItem,
} from '../types';

interface StudentFamilyProfileViewProps {
  profile: UserProfile;
  familyProfile: FamilyProfileItem;
  isLiveMode: boolean;
  isStudentView?: boolean;
  currentUserEmail?: string | null;
  deletedTrash?: SoftDeletedTrashItem[];
  portfolioSnapshots?: PortfolioSnapshotItem[];
  onRestoreDeletedItem?: (item: SoftDeletedTrashItem) => Promise<void> | void;
  onRestoreSnapshot?: (snap: PortfolioSnapshotItem) => Promise<void> | void;
  onSaveProfileAndFamily: (
    updatedUser: Partial<UserProfile>,
    updatedFamily: FamilyProfileItem
  ) => Promise<void>;
  onPullSharedFamilyPortfolio?: (codeOrEmail: string) => Promise<boolean>;
  onResetToCleanSlate?: () => void;
  onRestoreSampleData?: () => void;
}

const CURRICULUM_OPTIONS: CurriculumType[] = [
  'AP / Honors',
  'IB Diploma',
  'Dual Enrollment',
  'Standard College Prep',
  'Magnet / STEM',
];

const HOUSEHOLD_OPTIONS: HouseholdStructureType[] = [
  'Both Parents',
  'Single Parent',
  'Blended Family',
  'Legal Guardian',
  'Other',
];

const PARENT1_REL_OPTIONS: Parent1RelationshipType[] = [
  'Mother',
  'Father',
  'Stepmother',
  'Stepfather',
  'Legal Guardian',
  'Other',
];

const PARENT2_REL_OPTIONS: Parent2RelationshipType[] = [
  'Father',
  'Mother',
  'Stepfather',
  'Stepmother',
  'Legal Guardian',
  'None / N/A',
  'Other',
];

const EDUCATION_LEVEL_OPTIONS = [
  'High School Diploma',
  'Some College',
  'Associate Degree',
  'Bachelors Degree',
  'Masters Degree',
  'Doctorate / Professional (MD, JD, PhD)',
  'None / N/A',
  'Other',
];

export const StudentFamilyProfileView: React.FC<StudentFamilyProfileViewProps> = ({
  profile,
  familyProfile,
  isLiveMode,
  isStudentView = false,
  currentUserEmail,
  deletedTrash = [],
  portfolioSnapshots = [],
  onRestoreDeletedItem,
  onRestoreSnapshot,
  onSaveProfileAndFamily,
  onPullSharedFamilyPortfolio,
  onResetToCleanSlate,
}) => {
  const [displayName, setDisplayName] = useState(
    familyProfile.preferredName ||
      (profile.displayName === 'Maya Lin' ? '' : profile.displayName)
  );
  const [currentGrade, setCurrentGrade] = useState(profile.currentGrade);
  const [gradYear, setGradYear] = useState(profile.gradYear);
  const [dreamColleges, setDreamColleges] = useState(profile.dreamColleges);

  const [formData, setFormData] = useState<FamilyProfileItem>(familyProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedShareCode, setCopiedShareCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [syncingFamily, setSyncingFamily] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [confirmResetModalOpen, setConfirmResetModalOpen] = useState(false);
  const [confirmResetInput, setConfirmResetInput] = useState('');

  useEffect(() => {
    setDisplayName(
      familyProfile.preferredName ||
        (profile.displayName === 'Maya Lin' ? '' : profile.displayName)
    );
    setCurrentGrade(profile.currentGrade);
    setGradYear(profile.gradYear);
    setDreamColleges(profile.dreamColleges);
  }, [profile, familyProfile.preferredName]);

  useEffect(() => {
    setFormData(familyProfile);
  }, [familyProfile]);

  const updateField = <K extends keyof FamilyProfileItem>(
    key: K,
    value: FamilyProfileItem[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate profile completion percentage
  const completionPct = useMemo(() => {
    const checks = [
      formData.studentFullName.trim().length > 0,
      formData.highSchoolName.trim().length > 0,
      formData.highSchoolCityState.trim().length > 0,
      formData.unweightedGpa.trim().length > 0,
      formData.intendedMajors.trim().length > 0,
      dreamColleges.trim().length > 0,
      formData.languagesSpokenAtHome.trim().length > 0,
      formData.parent1Name.trim().length > 0,
      formData.parent1Occupation.trim().length > 0,
      formData.parent1AlmaMater.trim().length > 0,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [formData, dreamColleges]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfileAndFamily(
        {
          displayName: (
            formData.studentFullName.trim() ||
            formData.preferredName.trim() ||
            displayName.trim()
          ).slice(0, 80),
          currentGrade,
          gradYear,
          dreamColleges: dreamColleges.trim().slice(0, 200),
        },
        {
          ...formData,
          studentFullName: formData.studentFullName.trim().slice(0, 100),
          preferredName: formData.preferredName.trim().slice(0, 60),
          highSchoolName: formData.highSchoolName.trim().slice(0, 120),
          highSchoolCityState: formData.highSchoolCityState.trim().slice(0, 100),
          unweightedGpa: formData.unweightedGpa.trim().slice(0, 20),
          weightedGpa: formData.weightedGpa.trim().slice(0, 20),
          classRank: formData.classRank.trim().slice(0, 40),
          satActScore: formData.satActScore.trim().slice(0, 60),
          intendedMajors: formData.intendedMajors.trim().slice(0, 160),
          careerInterests: formData.careerInterests.trim().slice(0, 160),
          languagesSpokenAtHome: formData.languagesSpokenAtHome.trim().slice(0, 120),
          parent1Name: formData.parent1Name.trim().slice(0, 100),
          parent1Education: formData.parent1Education.trim().slice(0, 60),
          parent1AlmaMater: formData.parent1AlmaMater.trim().slice(0, 120),
          parent1Occupation: formData.parent1Occupation.trim().slice(0, 120),
          parent2Name: formData.parent2Name.trim().slice(0, 100),
          parent2Education: formData.parent2Education.trim().slice(0, 60),
          parent2AlmaMater: formData.parent2AlmaMater.trim().slice(0, 120),
          parent2Occupation: formData.parent2Occupation.trim().slice(0, 120),
          siblingsCount: Math.max(0, Math.min(15, Number(formData.siblingsCount) || 0)),
          siblingsSummary: formData.siblingsSummary.trim().slice(0, 300),
          familyResponsibilitiesNotes: formData.familyResponsibilitiesNotes
            .trim()
            .slice(0, 600),
          accountRole:
            formData.accountRole === 'Student' ? 'Student' : 'Parent / Guardian',
          studentEmail: (formData.studentEmail || '').trim().slice(0, 120),
          parentEmail: (formData.parentEmail || currentUserEmail || '')
            .trim()
            .slice(0, 120),
          parent2Email: (formData.parent2Email || '').trim().slice(0, 120),
          familyShareCode: (
            secureFamilyShareCode(formData.familyShareCode)
          )
            .trim()
            .slice(0, 40),
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCommonAppFamilySheet = () => {
    const lines = [
      '=== COMMON APP STUDENT, EDUCATION & FAMILY PROFILE ===',
      `Legal Name: ${formData.studentFullName} (Preferred: ${formData.preferredName || displayName})`,
      `Current Grade: ${currentGrade}th Grade | Class of ${gradYear}`,
      `High School: ${formData.highSchoolName} (${formData.highSchoolCityState})`,
      `Curriculum: ${formData.curriculumType}`,
      `GPA: ${formData.unweightedGpa} Unweighted | ${formData.weightedGpa} Weighted | Rank: ${formData.classRank}`,
      `Testing: ${formData.satActScore || 'N/A'}`,
      `Intended Majors: ${formData.intendedMajors || 'Undecided'}`,
      `Career Interests: ${formData.careerInterests || 'N/A'}`,
      `Target Colleges: ${dreamColleges || 'N/A'}`,
      '',
      '--- HOUSEHOLD & FAMILY SECTION ---',
      `Household Structure: ${formData.householdStructure}`,
      `First-Generation College Student: ${formData.firstGenerationCollege ? 'Yes' : 'No'}`,
      `Languages Spoken at Home: ${formData.languagesSpokenAtHome || 'English'}`,
      `Common App Fee Waiver Eligible: ${formData.feeWaiverEligible ? 'Yes' : 'No'}`,
      '',
      `Parent/Guardian 1 (${formData.parent1Relationship}): ${formData.parent1Name}${formData.parentEmail ? ` <${formData.parentEmail}>` : ''}`,
      `  Education: ${formData.parent1Education} — ${formData.parent1AlmaMater}`,
      `  Occupation: ${formData.parent1Occupation}`,
      '',
      `Parent/Guardian 2 (${formData.parent2Relationship}): ${formData.parent2Name}${formData.parent2Email ? ` <${formData.parent2Email}>` : ''}`,
      `  Education: ${formData.parent2Education} — ${formData.parent2AlmaMater}`,
      `  Occupation: ${formData.parent2Occupation}`,
      '',
      `Siblings (${formData.siblingsCount}): ${formData.siblingsSummary || 'None listed'}`,
      `Family / Household Responsibilities: ${formData.familyResponsibilitiesNotes || 'None listed'}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Status & Quick Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] flex items-center justify-center text-[#14233C] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Common App Student, Education &amp; Family Record
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8]">
                {completionPct}% Complete
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isLiveMode
                ? 'Encrypted & isolated in your personal Cloud Firestore account. Powers your Common App export and AI Admissions Coach.'
                : 'Sign in with Google in the top bar to sync and save your family & academic profile across devices.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyCommonAppFamilySheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Copied Sheet!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#14233C]" />
                Copy Common App Sheet
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#14233C] hover:bg-[#1e3252] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Profile...' : 'Save Profile & Family Info'}
          </button>
        </div>
      </div>

      {/* REGISTRATION & PARENT + STUDENT SHARED PORTFOLIO ACCESS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14233C] text-white flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Student &amp; Multi-Parent Shared Portfolio Login Setup
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-semibold uppercase tracking-wider">
                  2 Parents + Student Shared View
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                <strong>How Multi-User Sign-In Works:</strong> Both parents (Mother &amp; Father / Co-Parents) and the student can each log in with their own personal Google accounts. Enter your family emails below — or use your <strong>Family Share Code</strong> — and any family member signing in will access this exact same student portfolio in real time!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Who Registered / Is Using This Login */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Who Is On This Device?
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Parent / Guardian', 'Student'] as const).map((roleOption) => {
                const active =
                  (formData.accountRole || 'Parent / Guardian') === roleOption;
                return (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => updateField('accountRole', roleOption)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#14233C] text-white border-[#14233C]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {roleOption}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Your Google login never overwrites the Student&apos;s Legal Name below.
            </p>
          </div>

          {/* 2. Student's Login Email */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#14233C]" />
              Student&apos;s Google Email
            </label>
            <input
              type="email"
              maxLength={120}
              value={formData.studentEmail || ''}
              onChange={(e) => updateField('studentEmail', e.target.value)}
              placeholder="student@gmail.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#14233C]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              When student logs in, they sync to this portfolio.
            </p>
          </div>

          {/* 3. Parent / Guardian 1 Login Email */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#14233C]" />
              Parent 1 Google Email
            </label>
            <input
              type="email"
              maxLength={120}
              value={formData.parentEmail || currentUserEmail || ''}
              onChange={(e) => updateField('parentEmail', e.target.value)}
              placeholder="parent1@gmail.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#14233C]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              First parent / guardian Google login email.
            </p>
          </div>

          {/* 4. Parent / Guardian 2 (Co-Parent) Login Email */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#14233C]" />
              Parent 2 (Co-Parent) Email
            </label>
            <input
              type="email"
              maxLength={120}
              value={formData.parent2Email || ''}
              onChange={(e) => updateField('parent2Email', e.target.value)}
              placeholder="parent2@gmail.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#14233C]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Second parent/guardian Google login email.
            </p>
          </div>
        </div>

        {/* Family Share Code & Sync Bar */}
        <div className="bg-[#FAF8F4] rounded-xl border border-slate-200/80 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#14233C]" />
              <span className="text-xs font-bold text-slate-800">
                Your Family Share Code:
              </span>
            </div>
            <span className="px-3 py-1 rounded-lg bg-[#FAF8F4] border border-[#E6E1D8] font-mono text-xs font-bold text-[#14233C]">
              {formData.familyShareCode || 'Created when you save'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!formData.familyShareCode) return;
                navigator.clipboard.writeText(formData.familyShareCode);
                setCopiedShareCode(true);
                setTimeout(() => setCopiedShareCode(false), 2000);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedShareCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied Code
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          {onPullSharedFamilyPortfolio && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Enter Family Share Code or Email to Sync..."
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#14233C] w-64"
              />
              <button
                type="button"
                disabled={syncingFamily}
                onClick={async () => {
                  const target =
                    joinCodeInput.trim() ||
                    currentUserEmail ||
                    formData.familyShareCode ||
                    '';
                  if (!target) return;
                  setSyncingFamily(true);
                  setSyncStatusMsg('');
                  try {
                    const found = await onPullSharedFamilyPortfolio(target);
                    setSyncStatusMsg(
                      found
                        ? 'Synced shared student & parent portfolio!'
                        : 'No linked portfolio found for that code/email yet — click Save Profile first.'
                    );
                  } finally {
                    setSyncingFamily(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncingFamily ? 'animate-spin' : ''}`}
                />
                {syncingFamily ? 'Syncing...' : 'Sync Shared Family Portfolio'}
              </button>
            </div>
          )}
        </div>
        {syncStatusMsg && (
          <p className="text-xs font-semibold text-[#14233C]">{syncStatusMsg}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: STUDENT IDENTITY & HIGH SCHOOL ACADEMICS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] text-[#14233C] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Student Identity &amp; Academic Profile
              </h3>
              <p className="text-xs text-slate-500">
                Used for Common App Profile, Education section, and AI Admissions Coaching
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Legal Full Name (Common App)
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.studentFullName}
                onChange={(e) => updateField('studentFullName', e.target.value)}
                placeholder="e.g., Jordan Alexander Rivera"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Name / Display Name
              </label>
              <input
                type="text"
                maxLength={60}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  updateField('preferredName', e.target.value);
                }}
                placeholder="e.g., Jordan"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Grade Level
              </label>
              <select
                aria-label="Current Grade Level"
                value={currentGrade}
                onChange={(e) => {
                  const nextGrade = Number(e.target.value) as GradeLevel;
                  setCurrentGrade(nextGrade);
                  setGradYear(getDefaultGradYearForGrade(nextGrade));
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {ALL_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}th Grade
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                High School Graduation Year
              </label>
              <input
                type="number"
                min={2025}
                max={2038}
                value={gradYear}
                onChange={(e) =>
                  setGradYear(
                    Number(e.target.value) ||
                      getDefaultGradYearForGrade(currentGrade)
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current High School / Middle School Name
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.highSchoolName}
                onChange={(e) => updateField('highSchoolName', e.target.value)}
                placeholder="e.g., Oakridge Preparatory High School"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School City &amp; State
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.highSchoolCityState}
                onChange={(e) => updateField('highSchoolCityState', e.target.value)}
                placeholder="e.g., Austin, TX"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Curriculum Track
              </label>
              <select
                aria-label="Academic Curriculum Track"
                value={formData.curriculumType}
                onChange={(e) =>
                  updateField('curriculumType', e.target.value as CurriculumType)
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {CURRICULUM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unweighted GPA
              </label>
              <input
                type="text"
                maxLength={20}
                value={formData.unweightedGpa}
                onChange={(e) => updateField('unweightedGpa', e.target.value)}
                placeholder="e.g., 3.94 / 4.00"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weighted GPA
              </label>
              <input
                type="text"
                maxLength={20}
                value={formData.weightedGpa}
                onChange={(e) => updateField('weightedGpa', e.target.value)}
                placeholder="e.g., 4.42 / 5.00"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Rank / Percentile
              </label>
              <input
                type="text"
                maxLength={40}
                value={formData.classRank}
                onChange={(e) => updateField('classRank', e.target.value)}
                placeholder="e.g., Top 5% (18 of 412)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SAT / ACT / PSAT Scores
              </label>
              <input
                type="text"
                maxLength={60}
                value={formData.satActScore}
                onChange={(e) => updateField('satActScore', e.target.value)}
                placeholder="e.g., 1520 SAT (780M / 740RW)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intended College Majors
              </label>
              <input
                type="text"
                maxLength={160}
                value={formData.intendedMajors}
                onChange={(e) => updateField('intendedMajors', e.target.value)}
                placeholder="e.g., Computer Science, Mechanical Engineering, Cognitive Science"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dream / Target Colleges
              </label>
              <input
                type="text"
                maxLength={200}
                value={dreamColleges}
                onChange={(e) => setDreamColleges(e.target.value)}
                placeholder="e.g., Stanford, MIT, UT Austin, Georgia Tech, UC Berkeley"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: HOUSEHOLD & FAMILY BACKGROUND */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] text-[#14233C] flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Household &amp; Family Context (Common App Family)
              </h3>
              <p className="text-xs text-slate-500">
                Helps admissions officers evaluate your achievements in the context of your household
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Household Structure
              </label>
              <select
                aria-label="Household Structure"
                value={formData.householdStructure}
                onChange={(e) =>
                  updateField(
                    'householdStructure',
                    e.target.value as HouseholdStructureType
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {HOUSEHOLD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Languages Spoken at Home
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.languagesSpokenAtHome}
                onChange={(e) => updateField('languagesSpokenAtHome', e.target.value)}
                placeholder="e.g., English, Spanish, Telugu"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-[#FAF8F4] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.firstGenerationCollege}
                  onChange={(e) =>
                    updateField('firstGenerationCollege', e.target.checked)
                  }
                  className="mt-0.5 rounded border-slate-300 text-[#14233C] focus:ring-[#14233C]"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    First-Generation College Student
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Neither parent holds a 4-year bachelor&apos;s degree
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-[#FAF8F4] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.feeWaiverEligible}
                  onChange={(e) => updateField('feeWaiverEligible', e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#14233C] focus:ring-[#14233C]"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Common App Fee Waiver Eligible
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Qualifies for SAT/ACT or Common App fee waivers
                  </span>
                </div>
              </label>
            </div>

            {/* Siblings & Family Responsibilities */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Siblings
              </label>
              <input
                type="number"
                min={0}
                max={15}
                value={formData.siblingsCount}
                onChange={(e) =>
                  updateField(
                    'siblingsCount',
                    Math.max(0, Math.min(15, Number(e.target.value) || 0))
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Career Interests
              </label>
              <input
                type="text"
                maxLength={160}
                value={formData.careerInterests}
                onChange={(e) => updateField('careerInterests', e.target.value)}
                placeholder="e.g., AI Research, Medicine, Public Policy"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Siblings Names, Ages/Grades &amp; Colleges Attended
              </label>
              <input
                type="text"
                maxLength={300}
                value={formData.siblingsSummary}
                onChange={(e) => updateField('siblingsSummary', e.target.value)}
                placeholder="e.g., Maya Rivera (Age 11, 6th Grade); Lucas Rivera (Age 20, Sophomore at UT Austin)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Family &amp; Household Responsibilities (Caregiving, Family Business, Part-Time Support)
              </label>
              <textarea
                rows={3}
                maxLength={600}
                value={formData.familyResponsibilitiesNotes}
                onChange={(e) =>
                  updateField('familyResponsibilitiesNotes', e.target.value)
                }
                placeholder="Describe any regular household duties, sibling childcare, translating for family members, or working in a family business..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C] resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PARENT / GUARDIAN 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] text-[#14233C] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                3. Parent / Guardian 1 Details
              </h3>
              <p className="text-xs text-slate-500">
                Common App Family section — occupation, education level, and alma mater
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.parent1Name}
                onChange={(e) => updateField('parent1Name', e.target.value)}
                placeholder="e.g., Elena Maria Rivera"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <select
                aria-label="Parent 1 relationship"
                value={formData.parent1Relationship}
                onChange={(e) =>
                  updateField(
                    'parent1Relationship',
                    e.target.value as Parent1RelationshipType
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {PARENT1_REL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Highest Education Level
              </label>
              <select
                aria-label="Parent 1 highest education level"
                value={formData.parent1Education}
                onChange={(e) => updateField('parent1Education', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Occupation &amp; Employer
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.parent1Occupation}
                onChange={(e) => updateField('parent1Occupation', e.target.value)}
                placeholder="e.g., Reading Specialist at Austin ISD"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#14233C]" />
                Parent 1 Google Login Email
              </label>
              <input
                type="email"
                maxLength={120}
                value={formData.parentEmail || ''}
                onChange={(e) => updateField('parentEmail', e.target.value)}
                placeholder="e.g., parent1@gmail.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Colleges Attended &amp; Degree Year (Common App Education Lookup)
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.parent1AlmaMater}
                onChange={(e) => updateField('parent1AlmaMater', e.target.value)}
                placeholder="e.g., University of Texas at Austin (M.Ed. 2006)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PARENT / GUARDIAN 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] text-[#14233C] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                4. Parent / Guardian 2 Details
              </h3>
              <p className="text-xs text-slate-500">
                Common App Family section — second parent or guardian information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.parent2Name}
                onChange={(e) => updateField('parent2Name', e.target.value)}
                placeholder="e.g., David Carlos Rivera"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <select
                aria-label="Parent 2 relationship"
                value={formData.parent2Relationship}
                onChange={(e) =>
                  updateField(
                    'parent2Relationship',
                    e.target.value as Parent2RelationshipType
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {PARENT2_REL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Highest Education Level
              </label>
              <select
                aria-label="Parent 2 highest education level"
                value={formData.parent2Education}
                onChange={(e) => updateField('parent2Education', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Occupation &amp; Employer
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.parent2Occupation}
                onChange={(e) => updateField('parent2Occupation', e.target.value)}
                placeholder="e.g., Manufacturing Operations Engineer"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#14233C]" />
                Parent 2 (Co-Parent) Google Login Email
              </label>
              <input
                type="email"
                maxLength={120}
                value={formData.parent2Email || ''}
                onChange={(e) => updateField('parent2Email', e.target.value)}
                placeholder="e.g., parent2@gmail.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Colleges Attended &amp; Degree Year
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.parent2AlmaMater}
                onChange={(e) => updateField('parent2AlmaMater', e.target.value)}
                placeholder="e.g., Texas A&M University (B.S. Mechanical Engineering 2004)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tucked-away Parent-Only Data Protection, 30-Day Soft-Delete Trash & Automatic Snapshots (Auto-opens if items are in trash) */}
      {!isStudentView && (
        <details
          open={deletedTrash.length > 0}
          className="group bg-[#FAF8F4] rounded-2xl border border-[#E6E1D8] px-5 py-3.5 text-xs text-[#5A6478]"
        >
          <summary className="cursor-pointer font-semibold text-[#5A6478] hover:text-[#14233C] select-none flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#276B4E]" />
              <span>
                Data Protection: 30-Day Soft-Delete Trash, Automatic Snapshots &amp; Privacy Controls (Parent Only)
              </span>
              {deletedTrash.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/30 text-[10px] font-semibold">
                  {deletedTrash.length} in 30-Day Trash
                </span>
              )}
              {portfolioSnapshots.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/25 text-[10px] font-semibold">
                  {portfolioSnapshots.length} Auto-Snapshot{portfolioSnapshots.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <span className="text-[11px] font-normal text-[#5A6478] group-open:hidden">
              Click to expand
            </span>
          </summary>

          <div className="mt-4 pt-4 border-t border-[#E6E1D8] space-y-5">
            {/* 1. 30-Day Soft-Deleted Records Recovery */}
            <div className="bg-white rounded-xl border border-[#E6E1D8] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[#14233C]">
                    Recently Deleted Records (30-Day Soft-Delete Recovery)
                  </h4>
                  <p className="text-[11px] text-[#5A6478] mt-0.5">
                    Deleted activities, reflections, honors, essay drafts, and college deadlines are marked soft-deleted and kept for 30 days so you can restore them anytime.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#276B4E] bg-[#2F7A5A]/10 px-2.5 py-1 rounded-lg border border-[#2F7A5A]/20">
                  30-Day Retention Active
                </span>
              </div>

              {deletedTrash.length === 0 ? (
                <div className="text-[11px] text-[#5A6478] bg-[#FAF8F4] rounded-lg px-3.5 py-2.5 border border-[#E6E1D8]">
                  No soft-deleted records in the last 30 days. Any record you delete will appear here for 30 days before permanent removal.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {deletedTrash.map((item) => {
                    const daysLeft = Math.max(
                      1,
                      Math.ceil(
                        (Date.parse(item.purgeAfter) - Date.now()) / 86400000
                      )
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8]"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-[#14233C] text-white text-[10px] font-semibold uppercase">
                              {item.recordType}
                            </span>
                            <span className="font-semibold text-[#14233C] text-xs">
                              {item.title}
                            </span>
                            {item.studentName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E6E1D8] text-[#5A6478] font-medium">
                                Student: {item.studentName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#5A6478]">
                            {item.subtitle} · Deleted{' '}
                            {new Date(item.deletedAt).toLocaleString()} ·{' '}
                            <strong className="text-[#7A5B1C]">
                              {daysLeft} day{daysLeft === 1 ? '' : 's'} left to restore
                            </strong>
                          </p>
                        </div>
                        {onRestoreDeletedItem && (
                          <button
                            type="button"
                            onClick={() => void onRestoreDeletedItem(item)}
                            className="px-3 py-1.5 rounded-lg bg-[#2F7A5A] hover:bg-[#256348] text-white text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-center"
                          >
                            Restore Record
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Automatic Pre-Delete & Pre-Overwrite Snapshots */}
            <div className="bg-white rounded-xl border border-[#E6E1D8] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[#14233C]">
                    Automatic Pre-Delete &amp; Pre-Overwrite Snapshots
                  </h4>
                  <p className="text-[11px] text-[#5A6478] mt-0.5">
                    PathToAdmit automatically saves a point-in-time snapshot right before any record delete, profile overwrite, family sync, or reset.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#14233C] bg-[#FAF8F4] px-2.5 py-1 rounded-lg border border-[#E6E1D8]">
                  {portfolioSnapshots.length} Saved Snapshot{portfolioSnapshots.length === 1 ? '' : 's'}
                </span>
              </div>

              {portfolioSnapshots.length === 0 ? (
                <div className="text-[11px] text-[#5A6478] bg-[#FAF8F4] rounded-lg px-3.5 py-2.5 border border-[#E6E1D8]">
                  Automatic snapshots will appear here immediately before any delete or bulk overwrite occurs.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {portfolioSnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-[#14233C] text-xs">
                            {snap.reason}
                          </span>
                          {snap.studentName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E6E1D8] text-[#5A6478] font-medium">
                              {snap.studentName}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5A6478]">
                          Captured {new Date(snap.createdAt).toLocaleString()} ·{' '}
                          {snap.portfolioState.familyStudents?.length || 1} child(ren),{' '}
                          {snap.portfolioState.activities?.filter((a) => !a.isDeleted).length || 0} activities,{' '}
                          {snap.portfolioState.honors?.filter((h) => !h.isDeleted).length || 0} honors
                        </p>
                      </div>
                      {onRestoreSnapshot && (
                        <button
                          type="button"
                          onClick={() => void onRestoreSnapshot(snap)}
                          className="px-3 py-1.5 rounded-lg bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-center"
                        >
                          Restore Snapshot
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Full Portfolio Soft-Delete / Reset Control */}
            {onResetToCleanSlate && (
              <div className="pt-2 border-t border-[#E6E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-2xl">
                  <p className="font-semibold text-[#14233C]">
                    Archive / Reset Family Portfolio Data
                  </p>
                  <p className="text-[11px] text-[#5A6478] leading-relaxed">
                    Saves an automatic snapshot first and moves all current records to the 30-Day Soft-Delete Trash so you can still restore them within 30 days if needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResetInput('');
                    setConfirmResetModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-[#A13D34] border border-[#B5473D]/30 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                >
                  Delete All Portfolio Data...
                </button>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Two-Step Confirmation Modal for Deleting Portfolio Data (Accepts Student's Name or DELETE) */}
      {confirmResetModalOpen && onResetToCleanSlate && (() => {
        const expectedStudentFull = (
          formData.studentFullName ||
          displayName ||
          profile.displayName ||
          ''
        ).trim();
        const expectedStudentFirst = expectedStudentFull.split(' ')[0] || '';
        const typedTrimmed = confirmResetInput.trim();
        const typedLower = typedTrimmed.toLowerCase();
        const isConfirmedMatch =
          typedTrimmed.toUpperCase() === 'DELETE' ||
          (expectedStudentFull.length >= 2 &&
            typedLower === expectedStudentFull.toLowerCase()) ||
          (expectedStudentFirst.length >= 2 &&
            typedLower === expectedStudentFirst.toLowerCase());

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14233C]/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E6E1D8] shadow-2xl space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A13D34]">
                  Protected Data Deletion (30-Day Recovery)
                </span>
                <h3 className="text-lg font-semibold text-[#14233C]">
                  Archive &amp; clear family portfolio data?
                </h3>
              </div>
              <p className="text-xs text-[#5A6478] leading-relaxed">
                An <strong className="text-[#14233C]">automatic snapshot</strong> will be saved before clearing, and all records will be kept in your <strong className="text-[#14233C]">30-Day Soft-Delete Trash</strong> so they can be restored anytime within 30 days.
              </p>
              <p className="text-xs text-[#5A6478] leading-relaxed">
                To confirm, please type{' '}
                {expectedStudentFull ? (
                  <>
                    the student&apos;s name (
                    <strong className="text-[#14233C] font-mono">
                      {expectedStudentFull}
                    </strong>
                    ) or{' '}
                  </>
                ) : null}
                <strong className="text-[#14233C] font-mono">DELETE</strong> below:
              </p>
              <div>
                <input
                  type="text"
                  value={confirmResetInput}
                  onChange={(e) => setConfirmResetInput(e.target.value)}
                  placeholder={
                    expectedStudentFull
                      ? `Type "${expectedStudentFull}" or "DELETE"`
                      : 'Type DELETE to confirm'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D8] text-xs font-mono text-[#14233C] focus:outline-none focus:border-[#B5473D]"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResetModalOpen(false);
                    setConfirmResetInput('');
                  }}
                  className="px-4 py-2 rounded-xl border border-[#E6E1D8] text-xs font-semibold text-[#14233C] hover:bg-[#FAF8F4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isConfirmedMatch}
                  onClick={async () => {
                    setConfirmResetModalOpen(false);
                    setConfirmResetInput('');
                    setDisplayName('');
                    setDreamColleges('');
                    setFormData((prev) => ({
                      ...prev,
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
                      parent2Email: '',
                    }));
                    await onResetToCleanSlate();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#B5473D] hover:bg-[#9c3b32] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm &amp; Move to 30-Day Trash
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </form>
  );
};
