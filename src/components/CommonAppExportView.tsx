import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Printer,
  ArrowUp,
  ArrowDown,
  Bookmark,
  FileSpreadsheet,
  Plus,
  Star,
  Calendar,
  GraduationCap,
  FileText,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  ActivityItem,
  CollegeApplicationRound,
  CollegeApplicationStatus,
  CollegeDeadlineItem,
  CollegeSelectivityCategory,
  FamilyProfileItem,
  HonorAwardItem,
  JournalEntryItem,
  UserProfile,
} from '../types';
import { calculateActivityTotalHours } from '../badges';

interface CommonAppExportViewProps {
  profile: UserProfile;
  familyProfile: FamilyProfileItem;
  activities: ActivityItem[];
  honors: HonorAwardItem[];
  journals: JournalEntryItem[];
  collegeDeadlines: CollegeDeadlineItem[];
  onSaveCollegeDeadline: (
    item: Omit<CollegeDeadlineItem, 'id' | 'ownerId'>
  ) => Promise<void>;
  onUpdateCollegeStatus: (
    collegeId: string,
    status: CollegeApplicationStatus
  ) => Promise<void>;
  onDeleteCollegeDeadline: (collegeId: string) => Promise<void>;
  onSwapSlots: (activityA: ActivityItem, newSlotA: number) => Promise<void>;
  onOpenActivityModal: (activity?: ActivityItem) => void;
  onOpenHonorModal: (honor?: HonorAwardItem) => void;
}

export const CommonAppExportView: React.FC<CommonAppExportViewProps> = ({
  profile,
  familyProfile,
  activities,
  honors,
  journals,
  collegeDeadlines,
  onSaveCollegeDeadline,
  onUpdateCollegeStatus,
  onDeleteCollegeDeadline,
  onSwapSlots,
  onOpenActivityModal,
  onOpenHonorModal,
}) => {
  const [subView, setSubView] = useState<
    'commonapp' | 'deadlines' | 'bragsheet'
  >('commonapp');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // College Deadline Form State
  const [collegeName, setCollegeName] = useState('');
  const [category, setCategory] =
    useState<CollegeSelectivityCategory>('Target');
  const [appRound, setAppRound] =
    useState<CollegeApplicationRound>('Early Action (EA)');
  const [deadlineDate, setDeadlineDate] = useState('2026-11-01');
  const [status, setStatus] =
    useState<CollegeApplicationStatus>('Drafting Essays');
  const [intendedMajor, setIntendedMajor] = useState(
    familyProfile.intendedMajors || 'Computer Science'
  );
  const [supplementalStatus, setSupplementalStatus] = useState('');
  const [addingCollege, setAddingCollege] = useState(false);

  // Teacher Brag Sheet Customizer State
  const [teacherName, setTeacherName] = useState('Ms. Sarah Jenkins');
  const [teacherSubject, setTeacherSubject] = useState(
    'AP Calculus BC / Robotics Advisor'
  );
  const [threeHighlights, setThreeHighlights] = useState(
    '1. How I stayed after school to help debug the 7th-grade robotics teams’ autonomous sensors.\n2. My curiosity and persistence when tackling open-ended proof problems in class.\n3. Balancing varsity athletics and 300+ hours of STEM leadership across middle and high school.'
  );

  const rawSlottedHighSchool = [...activities]
    .filter(
      (a) =>
        a.commonAppSlot >= 1 &&
        a.commonAppSlot <= 10 &&
        a.grades.some((g) => g >= 9)
    )
    .sort((a, b) => a.commonAppSlot - b.commonAppSlot);

  // Guarantee unique slot numbers 1..10 so duplicate slot badges can never appear
  const usedSlotSet = new Set<number>();
  const slottedActivities = rawSlottedHighSchool.map((act) => {
    let slot = act.commonAppSlot;
    if (usedSlotSet.has(slot)) {
      for (let s = 1; s <= 10; s++) {
        if (!usedSlotSet.has(s)) {
          slot = s;
          break;
        }
      }
    }
    usedSlotSet.add(slot);
    return slot === act.commonAppSlot ? act : { ...act, commonAppSlot: slot };
  });

  const middleSchoolFoundationActivities = activities.filter(
    (a) => a.grades.length > 0 && a.grades.every((g) => g <= 8)
  );

  const unslottedActivities = activities.filter(
    (a) =>
      a.grades.some((g) => g >= 9) &&
      (!a.commonAppSlot || a.commonAppSlot < 1 || a.commonAppSlot > 10)
  );

  const essaySeeds = journals.filter((j) => j.isEssaySeed);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAllActivities = () => {
    const formatted = slottedActivities
      .map(
        (act) =>
          `#${act.commonAppSlot} — ${act.activityType}\nRole (50 chars): ${act.position}\nOrganization (100 chars): ${act.organization}\nDescription (150 chars): ${act.description}\nGrowth Impact: ${act.impactScore ?? 4}/5 | Grades: ${act.grades.join(', ')} | ${act.hoursPerWeek} hrs/wk, ${act.weeksPerYear} wks/yr (${act.timing})`
      )
      .join('\n\n');
    copyText('all_common_app', formatted);
  };

  const handleCopyBragSheet = () => {
    const topActs = slottedActivities
      .slice(0, 6)
      .map(
        (a, i) =>
          `${i + 1}. ${a.position} — ${a.organization} (Grades ${a.grades.join(', ')}, ${calculateActivityTotalHours(a)} total hrs)\n   Summary: ${a.description}${a.extendedNotes ? `\n   Key Reflection: ${a.extendedNotes.split('\n')[0]}` : ''}`
      )
      .join('\n\n');

    const topHonors = honors
      .map((h) => `• ${h.title} (${h.gradeLevel}th Grade · ${h.recognitionLevel})`)
      .join('\n');

    const sheet = `TEACHER RECOMMENDATION BRAG SHEET & ACTIVITY RESUME
Prepared for: ${teacherName} (${teacherSubject})
Student: ${familyProfile.studentFullName || profile.displayName} (${profile.currentGrade}th Grade · Class of ${profile.gradYear})
High School: ${familyProfile.highSchoolName} (${familyProfile.highSchoolCityState})
GPA: ${familyProfile.unweightedGpa} Unweighted | ${familyProfile.weightedGpa} Weighted | Test Scores: ${familyProfile.satActScore}
Intended Majors: ${familyProfile.intendedMajors}
Target Colleges: ${profile.dreamColleges}

--- 3 QUALITIES / MOMENTS I HOPE YOU CAN HIGHLIGHT ---
${threeHighlights}

--- TOP EXTRACURRICULAR & LEADERSHIP ACTIVITIES ---
${topActs}

--- ACADEMIC HONORS & AWARDS ---
${topHonors || '• Honor Roll & Scholastic Distinction'}`;

    copyText('brag_sheet_copy', sheet);
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim()) return;
    setAddingCollege(true);
    try {
      await onSaveCollegeDeadline({
        collegeName: collegeName.trim().slice(0, 100),
        category,
        appRound,
        deadlineDate: deadlineDate || '2026-11-01',
        status,
        intendedMajor: intendedMajor.trim().slice(0, 100),
        supplementalStatus: supplementalStatus.trim().slice(0, 250),
      });
      setCollegeName('');
      setSupplementalStatus('');
    } finally {
      setAddingCollege(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = [
      'Top 10 Rank',
      'Activity Type',
      'Position/Leadership (Max 50)',
      'Organization Name (Max 100)',
      'Description (Max 150)',
      'Growth Impact Score (1-5)',
      'Middle School Grades (6-8)',
      'High School Grades (9-12)',
      'Timing',
      'Hours/Week',
      'Weeks/Year',
      'Continue in College',
      'Total Hours',
      'Personal Reflections',
    ];

    const sorted = [...activities].sort(
      (a, b) => (a.commonAppSlot || 99) - (b.commonAppSlot || 99)
    );

    const rows = sorted.map((act) => [
      act.commonAppSlot > 0 ? `#${act.commonAppSlot}` : 'Timeline Only',
      act.activityType,
      act.position,
      act.organization,
      act.description,
      String(act.impactScore ?? 4),
      act.grades.filter((g) => g <= 8).join('; '),
      act.grades.filter((g) => g >= 9).join('; '),
      act.timing,
      String(act.hoursPerWeek),
      String(act.weeksPerYear),
      act.continueInCollege ? 'Yes' : 'No',
      String(calculateActivityTotalHours(act)),
      act.extendedNotes,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const safeBaseName = (
      familyProfile.studentFullName ||
      profile.displayName ||
      'Student'
    )
      .trim()
      .replace(/\s+/g, '_');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeBaseName}_CommonApp_Activities.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSONBackup = () => {
    const safeBaseName = (
      familyProfile.studentFullName ||
      profile.displayName ||
      'Student'
    )
      .trim()
      .replace(/\s+/g, '_');

    const payload = {
      exportedAt: new Date().toISOString(),
      studentProfile: profile,
      familyProfile,
      commonAppActivities: activities,
      commonAppHonors: honors,
      growthJournals: journals,
      collegeDeadlines,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeBaseName}_PathToAdmit_Backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    if (Number.isNaN(target)) return null;
    const diff = Math.ceil((target - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* 3-Tab Sub-Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubView('commonapp')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'commonapp'
                ? 'bg-[#14233C] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#FAF8F4] hover:text-[#14233C]'
            }`}
          >
            <Star className="w-4 h-4" />
            1. Common App 10-Slot Export
          </button>

          <button
            type="button"
            onClick={() => setSubView('deadlines')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'deadlines'
                ? 'bg-[#14233C] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#FAF8F4] hover:text-[#14233C]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            2. College List &amp; Deadlines ({collegeDeadlines.length})
          </button>

          <button
            type="button"
            onClick={() => setSubView('bragsheet')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'bragsheet'
                ? 'bg-[#14233C] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#FAF8F4] hover:text-[#14233C]'
            }`}
          >
            <FileText className="w-4 h-4" />
            3. Teacher Recommendation Brag Sheet
          </button>
        </div>
      </div>

      {/* =================================================================
          SUB-VIEW 1: COMMON APP 10-SLOT EXPORT
         ================================================================= */}
      {subView === 'commonapp' && (
        <div className="space-y-8">
          {/* Export Toolbar Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Export &amp; Copy Application Fields
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                Every starred activity is pre-formatted to Common App’s exact
                character limits (50-char Role, 100-char Organization, 150-char
                Summary).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 no-print shrink-0">
              <button
                type="button"
                onClick={handleCopyAllActivities}
                className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                {copiedKey === 'all_common_app' ? (
                  <>
                    <Check className="w-4 h-4 text-[#14233C]" />
                    Copied all Top 10
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    Copy all Top 10
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#14233C]" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadJSONBackup}
                className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#14233C]" />
                Save JSON
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold bg-[#14233C] text-white rounded-xl hover:bg-[#1e3252] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print summary
              </button>
            </div>
          </div>

          {/* Section 1: Top 10 Starred Common App Activities */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Top 10 Activities ({slottedActivities.length} of 10 Slots
                  Filled)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use the Up/Down arrows on the right to adjust your #1 to #10
                  priority order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenActivityModal()}
                className="px-4 py-2 text-xs font-semibold bg-[#14233C] text-white rounded-xl hover:bg-[#1e3252] transition-colors inline-flex items-center gap-1.5 no-print cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Activity
              </button>
            </div>

            {slottedActivities.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <p className="text-base font-semibold text-slate-800">
                  No activities starred for your Top 10 yet
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Star any of your activities on the Activities page to include
                  it in your Top 10 Common App export list.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenActivityModal()}
                  className="px-4 py-2 text-xs font-semibold bg-[#14233C] text-white rounded-xl cursor-pointer"
                >
                  Add First Activity
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {slottedActivities.map((act, idx) => {
                  const hsGrades = [9, 10, 11, 12].filter((g) =>
                    act.grades.includes(g as any)
                  );
                  const msGrades = [6, 7, 8].filter((g) =>
                    act.grades.includes(g as any)
                  );
                  const totalHrs = calculateActivityTotalHours(act);

                  return (
                    <div
                      key={act.id}
                      className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden"
                    >
                      <div className="px-5 py-3 bg-gradient-to-r from-[#FAF8F4] via-[#FAF8F4] to-white border-b border-[#E6E1D8] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2 text-slate-600">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#14233C] text-white font-mono font-semibold">
                            Slot #{act.commonAppSlot}
                          </span>
                          <span className="font-semibold text-[#14233C]">
                            {act.activityType}
                          </span>
                          <span>·</span>
                          <span>
                            High School Grades:{' '}
                            <strong className="text-slate-900">
                              {hsGrades.length > 0
                                ? hsGrades.join(', ')
                                : 'Future'}
                            </strong>
                          </span>
                          {msGrades.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-[#14233C]">
                                Middle School Foundation (
                                {msGrades.map((g) => `${g}th`).join(', ')})
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-medium text-amber-600">
                            ★ {act.impactScore ?? 4}.0 Impact
                          </span>
                          <span className="font-mono text-slate-500">
                            {act.hoursPerWeek}h/wk · {act.weeksPerYear}w/yr (
                            {totalHrs}h)
                          </span>
                        </div>
                      </div>

                      <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div className="space-y-3 flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-slate-200/80 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-slate-500">
                                  Position / Leadership ({act.position.length}
                                  /50 chars)
                                </div>
                                <div className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                                  {act.position}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  copyText(`pos_${act.id}`, act.position)
                                }
                                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-[#FAF8F4] hover:text-[#14233C] text-slate-700 shrink-0 no-print cursor-pointer"
                              >
                                {copiedKey === `pos_${act.id}`
                                  ? 'Copied!'
                                  : 'Copy'}
                              </button>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-slate-200/80 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-slate-500">
                                  Organization Name ({act.organization.length}
                                  /100 chars)
                                </div>
                                <div className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                                  {act.organization}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  copyText(`org_${act.id}`, act.organization)
                                }
                                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-[#FAF8F4] hover:text-[#14233C] text-slate-700 shrink-0 no-print cursor-pointer"
                              >
                                {copiedKey === `org_${act.id}`
                                  ? 'Copied!'
                                  : 'Copy'}
                              </button>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-slate-200/80 flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-slate-500">
                                150-Character Impact Summary (
                                {act.description.length}/150 chars)
                              </div>
                              <p className="text-sm text-slate-800 leading-relaxed">
                                {act.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyText(`desc_${act.id}`, act.description)
                              }
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-[#FAF8F4] hover:text-[#14233C] text-slate-700 shrink-0 no-print cursor-pointer"
                            >
                              {copiedKey === `desc_${act.id}`
                                ? 'Copied!'
                                : 'Copy 150-Char'}
                            </button>
                          </div>
                        </div>

                        <div className="flex lg:flex-col items-center gap-2 no-print shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              onSwapSlots(
                                act,
                                Math.max(1, act.commonAppSlot - 1)
                              )
                            }
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === slottedActivities.length - 1}
                            onClick={() =>
                              onSwapSlots(
                                act,
                                Math.min(10, act.commonAppSlot + 1)
                              )
                            }
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenActivityModal(act)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#14233C] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {unslottedActivities.length > 0 && (
              <p className="text-xs text-slate-500">
                You also have {unslottedActivities.length} additional high-school{' '}
                {unslottedActivities.length === 1 ? 'activity' : 'activities'}{' '}
                saved in your timeline. Star any Grade 9–12 activity to include
                it in your Top 10.
              </p>
            )}

            {middleSchoolFoundationActivities.length > 0 && (
              <div className="mt-4 p-5 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2B4C8C]/12 text-[#2B4C8C] border border-[#2B4C8C]/25 text-[11px] font-semibold">
                      Middle School Foundation (Grades 6–8)
                    </span>
                    <h4 className="text-sm font-semibold text-[#14233C] mt-1">
                      Early Exploration &amp; Skill-Building (Not Exported to Common App Slots #1–#10)
                    </h4>
                    <p className="text-xs text-[#5A6478]">
                      The Common App Activities section only collects Grades 9–12. Your 6th–8th grade entries are preserved here as foundation milestones and essay inspiration.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {middleSchoolFoundationActivities.map((msAct) => (
                    <div
                      key={msAct.id}
                      className="p-3.5 rounded-xl bg-white border border-[#E6E1D8] flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] text-[#5A6478]">
                          <span className="px-2 py-0.5 rounded bg-[#FAF8F4] border border-[#E6E1D8] font-semibold text-[#14233C]">
                            Foundation · Grades {msAct.grades.map((g) => `${g}th`).join(', ')}
                          </span>
                          <span>{msAct.activityType}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#14233C] truncate">
                          {msAct.position} — {msAct.organization}
                        </div>
                        <p className="text-xs text-[#5A6478] line-clamp-2">
                          {msAct.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenActivityModal(msAct)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#2B4C8C] hover:underline shrink-0 cursor-pointer no-print"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Honors & Essay Seeds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Academic Honors &amp; Awards (Top 5)
                    </h2>
                    <p className="text-xs text-slate-500">
                      100-character Award Titles + Grade Level + Recognition
                      Tier
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenHonorModal()}
                    className="px-3 py-1.5 text-xs font-medium bg-[#FAF8F4] hover:bg-[#FAF8F4] text-[#14233C] rounded-xl no-print cursor-pointer"
                  >
                    + Add Honor
                  </button>
                </div>

                {honors.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6">
                    No awards added yet. Record honor roll, competition medals,
                    or service awards here.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {honors.map((honor) => (
                      <div key={honor.id} className="py-3.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {honor.title}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(`hon_${honor.id}`, honor.title)
                            }
                            className="text-xs font-medium text-[#14233C] hover:underline no-print shrink-0 cursor-pointer"
                          >
                            {copiedKey === `hon_${honor.id}`
                              ? 'Copied!'
                              : 'Copy'}
                          </button>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span>{honor.gradeLevel}th Grade</span>
                          <span aria-hidden="true"> · </span>
                          <span>{honor.recognitionLevel} Level</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {honor.awardDate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Saved College Essay Seeds ({essaySeeds.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Reflections bookmarked as personal statement stories
                    </p>
                  </div>
                </div>

                {essaySeeds.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6">
                    Bookmark any reflection entry as an Essay Seed to keep your
                    best personal stories ready for senior year.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {essaySeeds.map((seed) => (
                      <div key={seed.id} className="py-3.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            <Bookmark className="w-3.5 h-3.5 text-[#14233C] shrink-0" />
                            {seed.title}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                `seed_${seed.id}`,
                                `${seed.title} (${seed.gradeLevel}th Grade)\n${seed.content}`
                              )
                            }
                            className="text-xs font-medium text-[#14233C] hover:underline no-print shrink-0 cursor-pointer"
                          >
                            {copiedKey === `seed_${seed.id}`
                              ? 'Copied!'
                              : 'Copy Story'}
                          </button>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span>{seed.gradeLevel}th Grade</span>
                          {seed.linkedActivityTitle && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{seed.linkedActivityTitle}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {seed.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          SUB-VIEW 2: COLLEGE LIST & APPLICATION DEADLINE TRACKER
         ================================================================= */}
      {subView === 'deadlines' && (
        <div className="space-y-6">
          {/* Add Target College Form */}
          <form
            onSubmit={handleAddCollege}
            className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#14233C]" />
                  Target College List &amp; Application Deadline Tracker
                </h2>
                <p className="text-xs text-slate-500">
                  Track Reach, Target, and Safety schools, EA/ED/RD deadlines,
                  and supplemental essay status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  College / University Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g., Stanford, UT Austin, Michigan..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tier
                </label>
                <select
                  aria-label="Tier"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as CollegeSelectivityCategory)
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="Reach">Reach</option>
                  <option value="Target">Target</option>
                  <option value="Safety">Safety</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  App Round
                </label>
                <select
                  aria-label="App Round"
                  value={appRound}
                  onChange={(e) =>
                    setAppRound(e.target.value as CollegeApplicationRound)
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="Early Action (EA)">Early Action (EA)</option>
                  <option value="Early Decision (ED)">
                    Early Decision (ED)
                  </option>
                  <option value="Restrictive EA">Restrictive EA</option>
                  <option value="Regular Decision (RD)">
                    Regular Decision (RD)
                  </option>
                  <option value="Rolling">Rolling</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Deadline Date
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  aria-label="Status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as CollegeApplicationStatus)
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="Researching">Researching</option>
                  <option value="Drafting Essays">Drafting Essays</option>
                  <option value="Ready to Submit">Ready to Submit</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Intended Major at This School
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={intendedMajor}
                  onChange={(e) => setIntendedMajor(e.target.value)}
                  placeholder="e.g., Computer Science, Mechanical Engineering"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Supplemental Essay Notes
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={supplementalStatus}
                  onChange={(e) => setSupplementalStatus(e.target.value)}
                  placeholder="e.g., Why Major essay (250 words) + Community essay (300 words)"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={addingCollege}
                  className="w-full py-2 px-4 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingCollege ? 'Adding...' : 'Add College'}
                </button>
              </div>
            </div>
          </form>

          {/* College Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collegeDeadlines.map((col) => {
              const daysLeft = getDaysUntil(col.deadlineDate);
              const tierBadge =
                col.category === 'Reach'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : col.category === 'Target'
                    ? 'bg-[#FAF8F4] text-[#14233C] border-[#E6E1D8]'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={col.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${tierBadge}`}
                          >
                            {col.category}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {col.appRound}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {col.collegeName}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-800">
                          Due {col.deadlineDate}
                        </div>
                        {daysLeft !== null && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              col.status === 'Submitted'
                                ? 'text-emerald-600'
                                : daysLeft < 14
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {col.status === 'Submitted'
                              ? 'Submitted ✓'
                              : daysLeft >= 0
                                ? `${daysLeft} days left`
                                : 'Deadline passed'}
                          </span>
                        )}
                      </div>
                    </div>

                    {col.intendedMajor && (
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          Major:
                        </span>{' '}
                        {col.intendedMajor}
                      </div>
                    )}

                    {col.supplementalStatus && (
                      <div className="p-2.5 rounded-xl bg-[#FAF8F4] border border-slate-200/80 text-xs text-slate-700">
                        {col.supplementalStatus}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Status:
                      </span>
                      <select
                        aria-label={`Application status for ${col.collegeName}`}
                        value={col.status}
                        onChange={(e) =>
                          onUpdateCollegeStatus(
                            col.id,
                            e.target.value as CollegeApplicationStatus
                          )
                        }
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
                      >
                        <option value="Researching">Researching</option>
                        <option value="Drafting Essays">Drafting Essays</option>
                        <option value="Ready to Submit">Ready to Submit</option>
                        <option value="Submitted">Submitted ✓</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteCollegeDeadline(col.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove college"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================
          SUB-VIEW 3: 1-PAGE TEACHER RECOMMENDATION BRAG SHEET
         ================================================================= */}
      {subView === 'bragsheet' && (
        <div className="space-y-6">
          {/* Customizer Controls (Hidden when printing) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  1-Page Teacher Recommendation &ldquo;Brag Sheet&rdquo; Builder
                </h2>
                <p className="text-xs text-slate-500">
                  Hand this structured 1-page summary to teachers or counselors
                  writing your Common App letters of recommendation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBragSheet}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FAF8F4] hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'brag_sheet_copy' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied Brag Sheet!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Text for Email
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#14233C] hover:bg-[#1e3252] text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save 1-Page PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recommender Teacher / Counselor Name
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course / Relationship to You
                </label>
                <input
                  type="text"
                  value={teacherSubject}
                  onChange={(e) => setTeacherSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3 Specific Classroom Moments or Qualities You Hope This Teacher
                Mentions
              </label>
              <textarea
                rows={3}
                value={threeHighlights}
                onChange={(e) => setThreeHighlights(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Printable 1-Page Brag Sheet Document */}
          <div className="bg-white rounded-2xl border border-slate-300 p-8 shadow-xs space-y-6">
            <div className="border-b-2 border-[#14233C] pb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#14233C]">
                  Letter of Recommendation Brag Sheet &amp; Activity Resume
                </span>
                <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {familyProfile.studentFullName || profile.displayName}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  {familyProfile.highSchoolName} (
                  {familyProfile.highSchoolCityState}) · {profile.currentGrade}
                  th Grade · Class of {profile.gradYear}
                </p>
              </div>
              <div className="text-right text-xs text-slate-700 space-y-0.5">
                <div className="font-bold text-[#14233C]">
                  Prepared for: {teacherName}
                </div>
                <div className="text-slate-500">{teacherSubject}</div>
                <div className="font-mono text-[11px] text-slate-500">
                  GPA: {familyProfile.unweightedGpa} UW /{' '}
                  {familyProfile.weightedGpa} W · {familyProfile.satActScore}
                </div>
              </div>
            </div>

            {/* Academic & Major Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#FAF8F4] p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-800 block">
                  Intended College Majors:
                </span>
                <span className="text-slate-700">
                  {familyProfile.intendedMajors || 'STEM / Interdisciplinary'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">
                  Curriculum &amp; Rank:
                </span>
                <span className="text-slate-700">
                  {familyProfile.curriculumType} · {familyProfile.classRank}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">
                  Target Colleges:
                </span>
                <span className="text-slate-700">{profile.dreamColleges}</span>
              </div>
            </div>

            {/* 3 Highlights for Teacher */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#14233C]">
                3 Anecdotes &amp; Qualities I Hope You Can Highlight
              </h3>
              <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                {threeHighlights}
              </div>
            </div>

            {/* Top Activities Table */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#14233C]">
                Core Extracurricular Leadership &amp; Multi-Year Commitment
              </h3>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {slottedActivities.slice(0, 6).map((act) => (
                  <div key={act.id} className="p-3.5 bg-white space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900">
                        {act.position} — {act.organization} ({act.activityType})
                      </span>
                      <span className="font-mono text-slate-500 shrink-0">
                        Grades {act.grades.join(', ')} ·{' '}
                        {calculateActivityTotalHours(act)} total hrs
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Honors */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#14233C]">
                Academic Honors &amp; Competition Distinctions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {honors.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-lg bg-[#FAF8F4] border border-slate-200 text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14233C] shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        {h.title}
                      </span>{' '}
                      <span className="text-slate-500">
                        ({h.gradeLevel}th · {h.recognitionLevel})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
