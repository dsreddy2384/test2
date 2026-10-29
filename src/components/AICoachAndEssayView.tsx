import React, { useState } from 'react';
import {
  Sparkles,
  GraduationCap,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wand2,
  Check,
  Copy,
  Send,
  BookOpen,
  Award,
  TrendingUp,
  RefreshCw,
  Save,
  Trash2,
  Clock,
} from 'lucide-react';
import {
  UserProfile,
  FamilyProfileItem,
  ActivityItem,
  HonorAwardItem,
  JournalEntryItem,
  EssayDraftItem,
  CollegeDeadlineItem,
  COMMON_APP_ESSAY_PROMPTS,
} from '../types';
import { DreamCollegeAdmissionsPanel } from './DreamCollegeAdmissionsPanel';
import { getAiAuthHeaders } from '../firebase';

interface AICoachAndEssayViewProps {
  profile: UserProfile;
  familyProfile: FamilyProfileItem;
  activities: ActivityItem[];
  honors: HonorAwardItem[];
  journals: JournalEntryItem[];
  essayDrafts: EssayDraftItem[];
  collegeDeadlines?: CollegeDeadlineItem[];
  onNavigateToProfile?: () => void;
  onSaveEssayDraft: (
    draftData: Omit<EssayDraftItem, 'id' | 'ownerId'>
  ) => Promise<void>;
  onDeleteEssayDraft: (draftId: string) => Promise<void>;
  onApplyActivityDescriptionUpgrade: (
    activityId: string,
    upgradedDescription: string
  ) => Promise<void>;
}

// Set by the server whenever the response is the built-in sample analysis
// rather than a live AI result (not signed in, AI unavailable, too little content).
interface SampleFallbackFields {
  isSampleFallback?: boolean;
  fallbackReason?: 'sign_in_required' | 'ai_unavailable' | 'not_enough_content';
}

const SAMPLE_FALLBACK_MESSAGES: Record<NonNullable<SampleFallbackFields['fallbackReason']>, string> = {
  sign_in_required:
    'Sample analysis, not live AI. Sign in with Google (and enter your Family Beta Invite Code) for a live AI review.',
  ai_unavailable:
    'Sample analysis, not live AI. The AI service is busy right now, so this is our built-in guidance. Please try again in a few minutes.',
  not_enough_content:
    'Built-in guidance, not live AI. Add more to your portfolio or draft for a live AI review.',
};

const SampleFallbackNotice: React.FC<{ report: SampleFallbackFields | null }> = ({ report }) => {
  if (!report?.isSampleFallback) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-[#E6D3A8] bg-[#FBF5E8] px-4 py-3 text-xs font-medium text-[#5C4314]"
    >
      {SAMPLE_FALLBACK_MESSAGES[report.fallbackReason || 'sign_in_required']}
    </div>
  );
};

interface AdmissionsCoachReport extends SampleFallbackFields {
  readinessScore: number;
  spikeArchetype: string;
  executiveSummary: string;
  coachAnswer: string;
  strengths: string[];
  blindSpots: string[];
  nextStepsByGrade: {
    title: string;
    action: string;
    impactCategory: string;
  }[];
  activityUpgrades: {
    activityId: string;
    organization: string;
    currentDescription: string;
    upgradedDescription: string;
    whyItWorks: string;
    addedMetricFlag?: string;
  }[];
}

interface EssayCritiqueReport extends SampleFallbackFields {
  overallScore: number;
  tooShortToScore?: boolean;
  wordCount?: number;
  minWordsRequired?: number;
  admissionsOfficerTakeaway: string;
  dimensionScores: {
    hookAndScene: number;
    authenticVoice: number;
    growthAndReflection: number;
    structureAndImpact: number;
  };
  whatWorksWell: string[];
  areasToImprove: string[];
  sentenceUpgrades: {
    originalExcerpt: string;
    suggestedRewrite: string;
    reason: string;
  }[];
  polishedSampleParagraph: string;
}

const PRESET_COACH_QUESTIONS = [
  'How should I order my Top 10 Common App activities for maximum impact?',
  'What is the biggest gap in my profile for my intended major and target colleges?',
  'How can I turn my current clubs and sports into stronger leadership spikes next year?',
  'Which of my activities and family experiences make the best Personal Statement topic?',
];

export const AICoachAndEssayView: React.FC<AICoachAndEssayViewProps> = ({
  profile,
  familyProfile,
  activities,
  honors,
  journals,
  essayDrafts,
  collegeDeadlines = [],
  onNavigateToProfile,
  onSaveEssayDraft,
  onDeleteEssayDraft,
  onApplyActivityDescriptionUpgrade,
}) => {
  const [subTab, setSubTab] = useState<'colleges' | 'coach' | 'essay'>('colleges');

  // --- AI Admissions Coach State ---
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachReport, setCoachReport] = useState<AdmissionsCoachReport | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [appliedUpgrades, setAppliedUpgrades] = useState<Record<string, boolean>>({});

  // --- AI Essay Critique State ---
  const [selectedPrompt, setSelectedPrompt] = useState(COMMON_APP_ESSAY_PROMPTS[0]);
  const [draftVersionTitle, setDraftVersionTitle] = useState(
    `Draft v${essayDrafts.length + 1} — Personal Statement`
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [essayText, setEssayText] = useState(() => {
    const firstSeed = journals.find((j) => j.isEssaySeed) || journals[0];
    return firstSeed
      ? `${firstSeed.title}\n\n${firstSeed.content}`
      : '';
  });
  const [essayLoading, setEssayLoading] = useState(false);
  const [essayError, setEssayError] = useState<string | null>(null);
  const [essayReport, setEssayReport] = useState<EssayCritiqueReport | null>(null);
  const [copiedParagraph, setCopiedParagraph] = useState(false);

  const wordCount = essayText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleSaveCurrentDraft = async () => {
    if (!essayText.trim()) return;
    setSavingDraft(true);
    try {
      await onSaveEssayDraft({
        versionTitle:
          draftVersionTitle.trim() || `Draft v${essayDrafts.length + 1}`,
        promptId: `prompt_${COMMON_APP_ESSAY_PROMPTS.indexOf(selectedPrompt) + 1}`,
        promptText: selectedPrompt.slice(0, 350),
        essayText: essayText.trim().slice(0, 5000),
        wordCount,
        overallScore: essayReport?.overallScore || 85,
        takeawaySummary: (
          essayReport?.admissionsOfficerTakeaway ||
          'Saved personal statement draft in progress.'
        ).slice(0, 600),
        savedDate: new Date().toISOString().slice(0, 10),
      });
      setDraftVersionTitle(`Draft v${essayDrafts.length + 2} — Revised`);
    } finally {
      setSavingDraft(false);
    }
  };

  const runAdmissionsCoach = async (questionOverride?: string) => {
    setCoachLoading(true);
    setCoachError(null);
    const q = questionOverride !== undefined ? questionOverride : customQuestion;
    try {
      const response = await fetch('/api/ai/admissions-coach', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify({
          profile,
          familyProfile,
          activities,
          honors,
          journals,
          customQuestion: q.trim(),
        }),
      });
      const data = await response.json();
      if (typeof data.aiRemainingToday === 'number') {
        window.dispatchEvent(
          new CustomEvent('pathtoadmit:ai-quota-updated', {
            detail: {
              aiRemainingToday: data.aiRemainingToday,
              dailyUserLimit: data.dailyUserLimit,
            },
          })
        );
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI Admissions Coach report.');
      }
      setCoachReport(data);
    } catch (err) {
      setCoachError(
        err instanceof Error ? err.message : 'Unable to reach AI Admissions Coach.'
      );
    } finally {
      setCoachLoading(false);
    }
  };

  const runEssayCritique = async () => {
    if (essayText.trim().length < 20) {
      setEssayError('Please enter or import at least a few sentences of your draft first.');
      return;
    }
    setEssayLoading(true);
    setEssayError(null);
    try {
      const activitiesSummary = activities
        .slice(0, 5)
        .map((a) => `${a.position} at ${a.organization} (${a.description})`)
        .join('; ');

      const response = await fetch('/api/ai/essay-critique', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify({
          promptTitle: selectedPrompt,
          essayText,
          studentGrade: profile.currentGrade,
          intendedMajors: familyProfile.intendedMajors,
          dreamColleges: profile.dreamColleges,
          activitiesSummary,
        }),
      });
      const data = await response.json();
      if (typeof data.aiRemainingToday === 'number') {
        window.dispatchEvent(
          new CustomEvent('pathtoadmit:ai-quota-updated', {
            detail: {
              aiRemainingToday: data.aiRemainingToday,
              dailyUserLimit: data.dailyUserLimit,
            },
          })
        );
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run AI Essay Critique.');
      }
      setEssayReport(data);
    } catch (err) {
      setEssayError(
        err instanceof Error ? err.message : 'Unable to run AI Essay Critique.'
      );
    } finally {
      setEssayLoading(false);
    }
  };

  const handleApplyUpgrade = async (activityId: string, upgradedText: string) => {
    const trimmed = upgradedText.trim().slice(0, 150);
    await onApplyActivityDescriptionUpgrade(activityId, trimmed);
    setAppliedUpgrades((prev) => ({ ...prev, [activityId]: true }));
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('colleges')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'colleges'
                ? 'bg-[#14233C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Dream College Data, GPA &amp; What to Improve
          </button>
          <button
            type="button"
            onClick={() => setSubTab('coach')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'coach'
                ? 'bg-[#14233C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            AI Admissions Coach &amp; Portfolio Audit
          </button>
          <button
            type="button"
            onClick={() => setSubTab('essay')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'essay'
                ? 'bg-[#14233C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            AI Essay Critique &amp; Personal Statement Studio
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] text-[11px] font-medium text-[#14233C]">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            Grounded in your {activities.length}{' '}
            {activities.length === 1 ? 'activity' : 'activities'},{' '}
            {honors.length} {honors.length === 1 ? 'honor' : 'honors'} &amp;{' '}
            {familyProfile.intendedMajors || 'academic profile'}
          </span>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 0: DREAM COLLEGE PUBLISHED ADMISSIONS DATA & GAP ANALYSIS
         ===================================================================== */}
      {subTab === 'colleges' && (
        <DreamCollegeAdmissionsPanel
          profile={profile}
          familyProfile={familyProfile}
          activities={activities}
          honors={honors}
          collegeDeadlines={collegeDeadlines}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}

      {/* =====================================================================
          SUB-TAB 1: AI ADMISSIONS COACH
         ===================================================================== */}
      {subTab === 'coach' && (
        <div className="space-y-6">
          {/* Interactive Coach Prompt & Launch Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#14233C]" />
                  Holistic Admissions Officer Evaluation
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Reviews your 6th–12th grade activities, impact scores, honors, GPA/testing,
                  and family background to identify your admissions spike, blind spots, and
                  150-character Common App upgrades.
                </p>
              </div>

              <button
                type="button"
                onClick={() => runAdmissionsCoach()}
                disabled={coachLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-[#14233C] hover:bg-[#1e3252] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
              >
                {coachLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Evaluating Your Portfolio...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {coachReport ? 'Refresh Holistic Audit' : 'Run Full Admissions Audit'}
                  </>
                )}
              </button>
            </div>

            {/* Ask Specific Question Input */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Ask Your AI Admissions Coach a Specific Question (Optional)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g., How should I connect my Robotics and Library Science Kits for MIT & UT Austin?"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#14233C]"
                />
                <button
                  type="button"
                  onClick={() => runAdmissionsCoach(customQuestion)}
                  disabled={coachLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF8F4] hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  Ask Coach
                </button>
              </div>

              {/* Quick Question Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_COACH_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setCustomQuestion(q);
                      runAdmissionsCoach(q);
                    }}
                    disabled={coachLoading}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-[#FAF8F4] hover:text-[#14233C] text-slate-600 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {coachError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{coachError}</span>
              </div>
            )}
          </div>

          {/* Admissions Coach Results */}
          {coachReport && (
            <div className="space-y-6">
              <SampleFallbackNotice report={coachReport} />
              {/* Top Score & Spike Archetype Banner */}
              <div className="bg-[#14233C] rounded-2xl p-6 text-white shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/15 text-slate-200">
                      ADMISSIONS COMMITTEE ARCHETYPE
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                      “{coachReport.spikeArchetype}”
                    </h3>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {coachReport.executiveSummary}
                    </p>
                  </div>

                  <div className="bg-white/12 backdrop-blur-xs border border-white/20 rounded-2xl p-4 text-center min-w-[150px] shrink-0">
                    <div className="text-3xl font-bold text-white">
                      {coachReport.readinessScore}
                      <span className="text-base font-normal text-slate-300">/100</span>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-200 mt-1">
                      Readiness Index
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      For {profile.currentGrade}th Grade Track
                    </div>
                  </div>
                </div>

                {coachReport.coachAnswer && (
                  <div className="mt-5 pt-4 border-t border-white/15">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                      Coach Strategic Advice
                    </div>
                    <p className="text-sm text-white/95 leading-relaxed">
                      {coachReport.coachAnswer}
                    </p>
                  </div>
                )}
              </div>

              {/* Strengths & Blind Spots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Standout Portfolio Pillars
                  </h4>
                  <ul className="space-y-2.5">
                    {coachReport.strengths.map((item, idx) => (
                      <li
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-slate-800 leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Gaps &amp; Blind Spots to Address
                  </h4>
                  <ul className="space-y-2.5">
                    {coachReport.blindSpots.map((item, idx) => (
                      <li
                        key={idx}
                        className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-slate-800 leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Grade-Level Action Plan */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#14233C]" />
                  Recommended Action Plan for {profile.currentGrade}th Grade
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {coachReport.nextStepsByGrade.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1.5">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F4] text-[#14233C]">
                          {step.impactCategory}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">
                          {step.title}
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {step.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 150-Character Common App Activity Upgrades */}
              {coachReport.activityUpgrades && coachReport.activityUpgrades.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#14233C]" />
                      AI 150-Character Common App Activity Rewrites
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Admissions-ready upgrades under the strict 150-character Common App
                      limit. Click &ldquo;Apply Upgrade&rdquo; to update your activity card
                      instantly.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {coachReport.activityUpgrades.map((upg, idx) => {
                      const isApplied = appliedUpgrades[upg.activityId];
                      const matchingActivity = activities.find(
                        (a) =>
                          a.id === upg.activityId ||
                          a.organization.toLowerCase() ===
                            upg.organization.toLowerCase()
                      );

                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="text-xs font-bold text-slate-900">
                              {upg.organization}
                            </div>
                            {matchingActivity && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplyUpgrade(
                                    matchingActivity.id,
                                    upg.upgradedDescription
                                  )
                                }
                                disabled={isApplied}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  isApplied
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-[#14233C] hover:bg-[#1e3252] text-white'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Applied to Activity
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-3.5 h-3.5" />
                                    Apply Upgrade ({upg.upgradedDescription.length}/150 chars)
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-lg bg-white border border-slate-200">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Current Description ({upg.currentDescription.length} chars)
                              </div>
                              <p className="text-slate-600">{upg.currentDescription}</p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E6E1D8]">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#14233C] mb-1">
                                AI Admissions Upgrade ({upg.upgradedDescription.length}/150 chars)
                              </div>
                              <p className="font-medium text-slate-900">
                                {upg.upgradedDescription}
                              </p>
                            </div>
                          </div>

                          {upg.addedMetricFlag && (
                            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                              <span>
                                <strong className="font-semibold">Confirm added schedule metric:</strong>{' '}
                                Added <code className="px-1 py-0.5 rounded bg-amber-100 font-mono font-bold">{upg.addedMetricFlag}</code> from your logged activity schedule while keeping every original award, number, and grade range.
                              </span>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">
                              Why it works:
                            </span>{' '}
                            {upg.whyItWorks}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: AI ESSAY CRITIQUE & PERSONAL STATEMENT STUDIO
         ===================================================================== */}
      {subTab === 'essay' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Essay Editor & Reflection Seed Importer */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Personal Statement &amp; Essay Draft Editor
                </h2>
                <p className="text-xs text-slate-500">
                  Select a Common App prompt, import a reflection seed, or paste your draft
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {wordCount > 0 && wordCount < 150 && (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Seed note ({150 - wordCount} more words needed for 100-pt rubric score)
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    wordCount > 650
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : wordCount >= 150
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {wordCount} / 650 words
                </span>
              </div>
            </div>

            {/* Prompt Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Common App Personal Statement Prompt
              </label>
              <select
                aria-label="Common App Personal Statement Prompt"
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#14233C]"
              >
                {COMMON_APP_ESSAY_PROMPTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Import from Journal / Essay Seeds */}
            {journals.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Import a Story Seed from Your Reflection Journal
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {journals.slice(0, 5).map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => setEssayText(`${j.title}\n\n${j.content}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FAF8F4] hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[200px]">{j.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Essay Textarea */}
            <div>
              <textarea
                rows={13}
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Write or paste your college essay draft or personal reflection story here..."
                className="w-full p-4 rounded-xl border border-slate-300 text-sm text-slate-900 leading-relaxed focus:outline-none focus:border-[#14233C] resize-y"
              />
            </div>

            {essayError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{essayError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <input
                  type="text"
                  maxLength={100}
                  value={draftVersionTitle}
                  onChange={(e) => setDraftVersionTitle(e.target.value)}
                  placeholder="Version name (e.g., Draft v2 — Robotics Hook)"
                  className="px-3 py-2 text-xs bg-[#FAF8F4] border border-slate-300 rounded-xl text-slate-900 flex-1"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentDraft}
                  disabled={savingDraft || !essayText.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF8F4] hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingDraft ? 'Saving...' : 'Save Version'}
                </button>
              </div>

              <button
                type="button"
                onClick={runEssayCritique}
                disabled={essayLoading}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-[#14233C] hover:bg-[#1e3252] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {essayLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Critiquing Essay Draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run AI Admissions Essay Critique
                  </>
                )}
              </button>
            </div>

            {/* Saved Essay Drafts & Version History Vault */}
            {essayDrafts.length > 0 && (
              <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#14233C]" />
                    Saved Essay Drafts & AI Score History ({essayDrafts.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Click any version to load into editor
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {essayDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-[#FAF8F4] border border-slate-200/90 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {d.versionTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF8F4] text-[#14233C] text-[10px] font-bold shrink-0">
                            Score: {d.overallScore}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {d.takeawaySummary}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-400 font-mono">
                          {d.wordCount} words · {d.savedDate}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEssayText(d.essayText);
                              setSelectedPrompt(
                                d.promptText || COMMON_APP_ESSAY_PROMPTS[0]
                              );
                            }}
                            className="font-semibold text-[#14233C] hover:underline cursor-pointer"
                          >
                            Load Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEssayDraft(d.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete saved draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Essay Critique Results */}
          <div className="lg:col-span-5 space-y-4">
            {!essayReport ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] text-[#14233C] flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ready to Review Your Draft
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Click &ldquo;Run AI Admissions Essay Critique&rdquo; to get your 4-pillar
                  rubric score, admissions reader takeaway, &ldquo;Show, Don&apos;t
                  Tell&rdquo; sentence rewrites, and a polished paragraph example.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <SampleFallbackNotice report={essayReport} />
                {/* Score & Reader Takeaway */}
                {essayReport.tooShortToScore || essayReport.overallScore <= 0 ? (
                  <div className="bg-amber-950 rounded-2xl p-5 text-white shadow-xs space-y-3 border border-amber-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        Draft Length Check (Minimum 150 Words to Score)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-xs font-bold text-amber-200">
                        Not Scored Yet ({essayReport.wordCount ?? wordCount} / {essayReport.minWordsRequired ?? 150} words)
                      </span>
                    </div>
                    <p className="text-xs text-amber-100 leading-relaxed">
                      <span className="font-bold text-white">Why no numerical score yet:</span>{' '}
                      {essayReport.admissionsOfficerTakeaway}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#14233C] rounded-2xl p-5 text-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Essay Impact Score
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-white/15 text-lg font-bold">
                        {essayReport.overallScore} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-100 leading-relaxed">
                      <span className="font-bold text-white">Reader Takeaway:</span>{' '}
                      {essayReport.admissionsOfficerTakeaway}
                    </p>

                    {/* 4 Dimension Bars */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      {[
                        {
                          label: 'Hook & Scene',
                          score: essayReport.dimensionScores.hookAndScene,
                        },
                        {
                          label: 'Authentic Voice',
                          score: essayReport.dimensionScores.authenticVoice,
                        },
                        {
                          label: 'Growth & Insight',
                          score: essayReport.dimensionScores.growthAndReflection,
                        },
                        {
                          label: 'Structure & Arc',
                          score: essayReport.dimensionScores.structureAndImpact,
                        },
                      ].map((dim) => (
                        <div
                          key={dim.label}
                          className="bg-white/10 rounded-xl p-2.5 border border-white/15"
                        >
                          <div className="flex justify-between text-[11px] font-semibold">
                            <span>{dim.label}</span>
                            <span>{dim.score}/10</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-amber-300 rounded-full"
                              style={{ width: `${Math.min(100, dim.score * 10)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                      What Works Well
                    </h4>
                    <ul className="space-y-1.5">
                      {essayReport.whatWorksWell.map((w, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                      How to Elevate This Draft
                    </h4>
                    <ul className="space-y-1.5">
                      {essayReport.areasToImprove.map((imp, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 flex items-start gap-2"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Sentence-Level Upgrades */}
                {essayReport.sentenceUpgrades.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#14233C]">
                      Line-by-Line &ldquo;Show, Don&apos;t Tell&rdquo; Upgrades
                    </h4>
                    <div className="space-y-3">
                      {essayReport.sentenceUpgrades.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                        >
                          <div className="text-slate-500 line-through">
                            &ldquo;{s.originalExcerpt}&rdquo;
                          </div>
                          <div className="font-medium text-slate-900 bg-[#FAF8F4] p-2.5 rounded-lg border border-[#E6E1D8]">
                            &ldquo;{s.suggestedRewrite}&rdquo;
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500">
                              {s.reason}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (essayText.includes(s.originalExcerpt)) {
                                  setEssayText(
                                    essayText.replace(
                                      s.originalExcerpt,
                                      s.suggestedRewrite
                                    )
                                  );
                                } else {
                                  navigator.clipboard.writeText(s.suggestedRewrite);
                                }
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#14233C] text-white hover:bg-[#1e3252] shrink-0 cursor-pointer"
                            >
                              {essayText.includes(s.originalExcerpt)
                                ? 'Replace in Draft'
                                : 'Copy Rewrite'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Polished Sample Paragraph */}
                {essayReport.polishedSampleParagraph && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#14233C]">
                        Sample Polished Opening / Key Paragraph
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            essayReport.polishedSampleParagraph
                          );
                          setCopiedParagraph(true);
                          setTimeout(() => setCopiedParagraph(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#14233C] hover:underline cursor-pointer"
                      >
                        {copiedParagraph ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Paragraph
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-[#FAF8F4] p-3.5 rounded-xl border border-[#E6E1D8]">
                      {essayReport.polishedSampleParagraph}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
