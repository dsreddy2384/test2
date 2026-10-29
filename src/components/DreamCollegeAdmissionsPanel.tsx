import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Award,
  BookOpen,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  ActivityItem,
  CollegeDeadlineItem,
  FamilyProfileItem,
  HonorAwardItem,
  UserProfile,
} from '../types';
import {
  CollegePublishedAdmissionsData,
  PUBLISHED_COLLEGE_ADMISSIONS_DATA,
  evaluateStudentForCollege,
  findCollegeAdmissionsProfile,
  matchesCollegeQuery,
  readCachedColleges,
  resolveStudentTargetColleges,
  saveCachedCollege,
} from '../collegeAdmissionsData';
import { getAiAuthHeaders } from '../firebase';

interface DreamCollegeAdmissionsPanelProps {
  profile: UserProfile;
  familyProfile: FamilyProfileItem;
  activities: ActivityItem[];
  honors: HonorAwardItem[];
  collegeDeadlines?: CollegeDeadlineItem[];
  onNavigateToProfile?: () => void;
}

export const DreamCollegeAdmissionsPanel: React.FC<
  DreamCollegeAdmissionsPanelProps
> = ({
  profile,
  familyProfile,
  activities,
  honors,
  collegeDeadlines = [],
  onNavigateToProfile,
}) => {
  const [customColleges, setCustomColleges] = useState<
    CollegePublishedAdmissionsData[]
  >(() => readCachedColleges());
  const [sessionSearchedColleges, setSessionSearchedColleges] = useState<
    CollegePublishedAdmissionsData[]
  >([]);
  const [showMiddleSchoolSampleColleges, setShowMiddleSchoolSampleColleges] =
    useState(false);
  const [searchCollegeInput, setSearchCollegeInput] = useState('');
  const [loadingLiveCollege, setLoadingLiveCollege] = useState(false);
  const [refreshingCollegeId, setRefreshingCollegeId] = useState<string | null>(
    null
  );
  const autoFetchedFallbackNamesRef = useRef<Set<string>>(new Set());

  // Reset session-searched colleges and middle-school preview toggle when switching students
  useEffect(() => {
    setSessionSearchedColleges([]);
    setShowMiddleSchoolSampleColleges(false);
  }, [familyProfile.studentFullName, profile.currentGrade]);

  const isMiddleSchoolWithoutColleges =
    profile.currentGrade <= 8 &&
    !(profile.dreamColleges || '').trim() &&
    collegeDeadlines.length === 0 &&
    sessionSearchedColleges.length === 0;

  // Combine student's dream colleges + tracked colleges + any colleges searched in this session
  const allTargetColleges = useMemo(() => {
    const base = resolveStudentTargetColleges(
      profile.dreamColleges || '',
      collegeDeadlines.map((c) => c.collegeName)
    );
    const merged: CollegePublishedAdmissionsData[] = [];
    const seen = new Set<string>();

    // Replace any estimated fallback in `base` if we have a live/cached version in `customColleges`
    for (const item of base) {
      const liveOverride = customColleges.find(
        (c) =>
          c.id === item.id ||
          c.collegeName.toLowerCase() === item.collegeName.toLowerCase() ||
          matchesCollegeQuery(c, item.collegeName)
      );
      const chosen = liveOverride || item;
      const key = chosen.collegeName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(chosen);
      }
    }

    for (const searched of sessionSearchedColleges) {
      const key = searched.collegeName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(searched);
      }
    }

    return merged;
  }, [
    profile.dreamColleges,
    collegeDeadlines,
    customColleges,
    sessionSearchedColleges,
  ]);

  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(
    allTargetColleges[0]?.id || PUBLISHED_COLLEGE_ADMISSIONS_DATA[0].id
  );

  const activeCollege = useMemo(() => {
    return (
      allTargetColleges.find((c) => c.id === selectedCollegeId) ||
      PUBLISHED_COLLEGE_ADMISSIONS_DATA.find(
        (c) => c.id === selectedCollegeId
      ) ||
      allTargetColleges[0] ||
      PUBLISHED_COLLEGE_ADMISSIONS_DATA[0]
    );
  }, [allTargetColleges, selectedCollegeId]);

  const evaluation = useMemo(() => {
    return evaluateStudentForCollege(
      activeCollege,
      profile,
      familyProfile,
      activities,
      honors
    );
  }, [activeCollege, profile, familyProfile, activities, honors]);

  const fetchAndPersistCollege = async (
    queryName: string,
    options?: { forceRefresh?: boolean; selectAfterFetch?: boolean }
  ) => {
    const res = await fetch('/api/ai/college-admissions-insights', {
      method: 'POST',
      headers: await getAiAuthHeaders(),
      body: JSON.stringify({
        collegeName: queryName,
        forceRefresh: Boolean(options?.forceRefresh),
      }),
    });
    const data = await res.json();
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
    if (data.college) {
      const liveCol = data.college as CollegePublishedAdmissionsData;
      const updatedCache = saveCachedCollege(liveCol);
      setCustomColleges(updatedCache);
      if (options?.selectAfterFetch) {
        setSelectedCollegeId(liveCol.id);
      }
      return liveCol;
    }
    return null;
  };

  // Automatically fetch & cache any custom dream/tracked college that is currently using an estimated fallback
  useEffect(() => {
    const uncachedFallbacks = allTargetColleges.filter(
      (c) =>
        c.isEstimatedFallback &&
        !autoFetchedFallbackNamesRef.current.has(c.collegeName.toLowerCase())
    );
    if (uncachedFallbacks.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const item of uncachedFallbacks) {
        if (cancelled) break;
        autoFetchedFallbackNamesRef.current.add(item.collegeName.toLowerCase());
        try {
          await fetchAndPersistCollege(item.collegeName, {
            forceRefresh: false,
            selectAfterFetch: selectedCollegeId === item.id,
          });
        } catch {
          // Keep fallback if offline
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allTargetColleges, selectedCollegeId]);

  const handleRefreshActiveCollege = async () => {
    if (!activeCollege || refreshingCollegeId) return;
    setRefreshingCollegeId(activeCollege.id);
    try {
      await fetchAndPersistCollege(activeCollege.collegeName, {
        forceRefresh: true,
        selectAfterFetch: true,
      });
    } catch {
      // Keep current data on error
    } finally {
      setRefreshingCollegeId(null);
    }
  };

  const handleLookupOrAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchCollegeInput.trim();
    if (!raw) return;

    // 1. Check if it matches our built-in CDS dataset first (using whole-word boundary matching)
    const localMatch = PUBLISHED_COLLEGE_ADMISSIONS_DATA.find((c) =>
      matchesCollegeQuery(c, raw)
    );

    if (localMatch) {
      if (!customColleges.some((c) => c.id === localMatch.id)) {
        setCustomColleges((prev) => [localMatch, ...prev]);
      }
      setSessionSearchedColleges((prev) =>
        prev.some((c) => c.id === localMatch.id) ? prev : [localMatch, ...prev]
      );
      setSelectedCollegeId(localMatch.id);
      setSearchCollegeInput('');
      return;
    }

    // 2. Check if it's already in our non-expired localStorage cache
    const cachedMatch = readCachedColleges().find((c) =>
      matchesCollegeQuery(c, raw)
    );
    if (cachedMatch) {
      setCustomColleges(readCachedColleges());
      setSessionSearchedColleges((prev) =>
        prev.some((c) => c.id === cachedMatch.id) ? prev : [cachedMatch, ...prev]
      );
      setSelectedCollegeId(cachedMatch.id);
      setSearchCollegeInput('');
      return;
    }

    // 3. Otherwise query server (checks 30-day server cache -> IPEDS Scorecard -> Gemini Grounding)
    setLoadingLiveCollege(true);
    try {
      const liveCol = await fetchAndPersistCollege(raw, {
        forceRefresh: false,
        selectAfterFetch: true,
      });
      if (liveCol) {
        setSessionSearchedColleges((prev) =>
          prev.some((c) => c.id === liveCol.id) ? prev : [liveCol, ...prev]
        );
      } else {
        const fallbackCol = findCollegeAdmissionsProfile(raw);
        setCustomColleges((prev) => [
          fallbackCol,
          ...prev.filter((c) => c.id !== fallbackCol.id),
        ]);
        setSessionSearchedColleges((prev) =>
          prev.some((c) => c.id === fallbackCol.id)
            ? prev
            : [fallbackCol, ...prev]
        );
        setSelectedCollegeId(fallbackCol.id);
      }
      setSearchCollegeInput('');
    } catch {
      const fallbackCol = findCollegeAdmissionsProfile(raw);
      setCustomColleges((prev) => [
        fallbackCol,
        ...prev.filter((c) => c.id !== fallbackCol.id),
      ]);
      setSessionSearchedColleges((prev) =>
        prev.some((c) => c.id === fallbackCol.id) ? prev : [fallbackCol, ...prev]
      );
      setSelectedCollegeId(fallbackCol.id);
      setSearchCollegeInput('');
    } finally {
      setLoadingLiveCollege(false);
    }
  };

  if (isMiddleSchoolWithoutColleges && !showMiddleSchoolSampleColleges) {
    return (
      <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-6 sm:p-8 space-y-5">
        <div className="space-y-2 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2B4C8C]/10 text-[#2B4C8C] border border-[#2B4C8C]/25 text-[11px] font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            Middle School Foundation (Grade {profile.currentGrade}) · For Later in High School
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-normal text-[#14233C]">
            No target colleges needed in {profile.currentGrade}th grade
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
            {familyProfile.studentFullName || profile.displayName || 'Your student'} is in{' '}
            {profile.currentGrade}th grade — middle school is for exploring clubs, music,
            sports, and curiosity projects without college admissions pressure. High school
            GPA, SAT/ACT, and Common Data Set college comparisons begin in 9th grade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowMiddleSchoolSampleColleges(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] text-xs font-semibold cursor-pointer"
          >
            Preview sample college benchmarks (for later) →
          </button>
          {onNavigateToProfile && (
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="px-4 py-2.5 rounded-xl bg-[#FAF8F4] hover:bg-[#E6E1D8]/50 text-[#2B4C8C] text-xs font-semibold cursor-pointer"
            >
              Update school &amp; curiosity interests →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Annual Published College Admissions Data & Student Gap Analyzer */}
      <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs overflow-hidden">
        <div className="bg-[#14233C] text-white px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5C168] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              Annual Published College Admissions Data (Common Data Set / CDS)
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight">
              Dream College Acceptance Stats, Admitted GPA &amp; What You Need to Improve
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Compare your current GPA, course rigor, test scores, and extracurricular portfolio against annual published admissions data (students applied, students accepted, average GPA, and SAT/ACT ranges) for your target universities.
            </p>
          </div>

          {onNavigateToProfile && (
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold shrink-0 cursor-pointer"
            >
              Update My GPA / Dream Colleges →
            </button>
          )}
        </div>

        {/* Student Current Stats Strip + Search Any University */}
        <div className="p-5 bg-[#FAF8F4] border-b border-[#E6E1D8] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6478] block">
                Your Unweighted GPA
              </span>
              <span className="text-sm font-bold tabular-nums text-[#14233C]">
                {familyProfile.unweightedGpa || 'Not Entered'}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6478] block">
                Weighted GPA · Track
              </span>
              <span className="text-sm font-bold tabular-nums text-[#14233C]">
                {familyProfile.weightedGpa || '—'} ({familyProfile.curriculumType})
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6478] block">
                Your SAT / ACT
              </span>
              <span className="text-sm font-bold tabular-nums text-[#14233C]">
                {familyProfile.satActScore || 'Not Entered'}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6478] block">
                Intended Major
              </span>
              <span className="text-xs font-bold text-[#14233C] truncate max-w-[180px] block">
                {familyProfile.intendedMajors || 'Exploring Majors'}
              </span>
            </div>
          </div>

          {/* Search / Add Any College */}
          <form
            onSubmit={handleLookupOrAddCollege}
            className="flex items-center gap-2 w-full lg:w-auto"
          >
            <div className="relative flex-1 lg:w-64">
              <Search className="w-3.5 h-3.5 text-[#5A6478] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCollegeInput}
                onChange={(e) => setSearchCollegeInput(e.target.value)}
                placeholder="Add any college (e.g., Duke, Rice, NYU)..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E6E1D8] text-xs text-[#14233C] focus:outline-none focus:border-[#14233C]"
              />
            </div>
            <button
              type="submit"
              disabled={!searchCollegeInput.trim() || loadingLiveCollege}
              className="px-3.5 py-2 rounded-xl bg-[#14233C] hover:bg-[#1e3252] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {loadingLiveCollege ? 'Fetching CDS...' : 'Compare College'}
              </span>
            </button>
          </form>
        </div>

        {/* Target / Dream Colleges Selector Strip */}
        <div className="p-4 sm:p-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6478]">
              Select a Dream / Target University to Inspect Published Admissions Data:
            </span>
            <span className="text-[11px] text-[#5A6478]">
              From your Dream Colleges ({profile.dreamColleges || 'Default List'}) &amp; Common Data Set Library
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allTargetColleges.map((col) => {
              const isSelected = activeCollege.id === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollegeId(col.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#14233C] text-white border-[#14233C] shadow-xs'
                      : 'bg-white text-[#14233C] border-[#E6E1D8] hover:border-[#14233C]/40'
                  }`}
                >
                  <span>{col.shortName}</span>
                  <span
                    className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-[#E5C168]'
                        : 'bg-[#FAF8F4] text-[#5A6478]'
                    }`}
                  >
                    {col.acceptanceRatePercent}% Admit · {col.avgUnweightedGpa.toFixed(2)} GPA
                  </span>
                </button>
              );
            })}

            {/* Additional Built-In Universities Quick Pills */}
            {PUBLISHED_COLLEGE_ADMISSIONS_DATA.filter(
              (p) => !allTargetColleges.some((t) => t.id === p.id)
            )
              .slice(0, 6)
              .map((extraCol) => {
                const isSelected = activeCollege.id === extraCol.id;
                return (
                  <button
                    key={extraCol.id}
                    type="button"
                    onClick={() => setSelectedCollegeId(extraCol.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#14233C] text-white border-[#14233C]'
                        : 'bg-[#FAF8F4] text-[#5A6478] border-[#E6E1D8] hover:bg-white hover:text-[#14233C]'
                    }`}
                  >
                    + {extraCol.shortName} ({extraCol.acceptanceRatePercent}%)
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SELECTED COLLEGE: ANNUAL PUBLISHED ADMISSIONS DATA (COMMON DATA SET)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E6E1D8]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/30 text-[11px] font-bold">
                ✓ {activeCollege.cdsCycle}
              </span>
              <span className="text-xs text-[#5A6478]">
                {activeCollege.location} · {activeCollege.testPolicy}
              </span>
              {(activeCollege.officialCdsUrl || activeCollege.sourceUrl) && (
                <a
                  href={activeCollege.sourceUrl || activeCollege.officialCdsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FAF8F4] hover:bg-[#E6E1D8]/50 text-[11px] font-semibold text-[#14233C] border border-[#E6E1D8] transition-colors"
                >
                  <span>Verify Official University CDS Report</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {(activeCollege.isLiveGroundedResult ||
                activeCollege.cachedAt ||
                activeCollege.isEstimatedFallback) && (
                <button
                  type="button"
                  onClick={handleRefreshActiveCollege}
                  disabled={refreshingCollegeId === activeCollege.id}
                  title="Bypass 30-day cache and fetch fresh admissions data from IPEDS / CDS"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FAF8F4] hover:bg-[#E6E1D8]/50 disabled:opacity-50 text-[11px] font-semibold text-[#5A6478] hover:text-[#14233C] border border-[#E6E1D8] transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${
                      refreshingCollegeId === activeCollege.id
                        ? 'animate-spin'
                        : ''
                    }`}
                  />
                  <span>
                    {refreshingCollegeId === activeCollege.id
                      ? 'Refreshing...'
                      : activeCollege.cachedAt
                        ? `Cached ${new Date(
                            activeCollege.cachedAt
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })} · Refresh`
                        : 'Refresh Live Data'}
                  </span>
                </button>
              )}
            </div>
            <h3 className="text-2xl font-serif font-normal text-[#14233C]">
              {activeCollege.collegeName}
            </h3>
            {activeCollege.gpaReportingNote && (
              <p className="text-[11px] text-[#5A6478]">
                <strong>Data Source Note:</strong> {activeCollege.gpaReportingNote}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3.5 bg-[#FAF8F4] border border-[#E6E1D8] px-4 py-3 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5B1C]">
                  Admissions Selectivity Tier
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    evaluation.selectivityTier === 'High-Reach'
                      ? 'bg-[#B5473D]/12 text-[#A13D34] border-[#B5473D]/30'
                      : evaluation.selectivityTier === 'Reach'
                        ? 'bg-[#B8913A]/15 text-[#7A5B1C] border-[#B8913A]/35'
                        : evaluation.selectivityTier === 'Target'
                          ? 'bg-[#2B4C8C]/12 text-[#2B4C8C] border-[#2B4C8C]/30'
                          : 'bg-[#2F7A5A]/12 text-[#276B4E] border-[#2F7A5A]/30'
                  }`}
                >
                  {evaluation.selectivityTier}
                </span>
              </div>
              <div className="text-xs font-bold text-[#14233C] mt-1">
                {evaluation.competitivenessLabel}
              </div>
              <div className="text-[11px] text-[#5A6478] mt-0.5">
                {evaluation.selectivitySummary}
              </div>
            </div>
            <div className="pl-3 border-l border-[#E6E1D8] text-right shrink-0">
              <div className="text-lg font-bold tabular-nums text-[#14233C]">
                {evaluation.benchmarksMetCount}/4
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6478]">
                CDS Benchmarks
              </div>
            </div>
          </div>
        </div>

        {/* 4 Key Annual Published Admissions Metrics (Applicants, Accepted, Admitted GPA, SAT/ACT) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6478]">
              Annual Applicants &amp; Accepted
            </span>
            <div className="text-xl font-bold tabular-nums text-[#14233C]">
              {activeCollege.totalAccepted.toLocaleString()} Accepted
            </div>
            <p className="text-xs text-[#5A6478]">
              Out of{' '}
              <span className="tabular-nums font-semibold text-[#14233C]">
                {activeCollege.totalApplicants.toLocaleString()}
              </span>{' '}
              applicants ({activeCollege.enrolledFreshmen.toLocaleString()} enrolled)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6478]">
              Published Acceptance Rate
            </span>
            <div className="text-xl font-bold tabular-nums text-[#14233C]">
              {activeCollege.acceptanceRatePercent}% Admit Rate
            </div>
            <p className="text-xs text-[#5A6478]">
              {activeCollege.percentInTop10Class}% of admitted students graduated in the Top 10% of their high school class
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6478]">
              Admitted Student Unweighted GPA
            </span>
            <div className="text-xl font-bold tabular-nums text-[#276B4E]">
              {activeCollege.avgUnweightedGpa.toFixed(2)} Avg GPA
            </div>
            <p className="text-xs text-[#5A6478]">
              Middle 50% GPA Range:{' '}
              <span className="tabular-nums font-semibold text-[#14233C]">
                {activeCollege.gpaMiddle50Range}
              </span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6478]">
              {evaluation.testingComparison.isTestBlind
                ? 'Standardized Testing Policy'
                : 'Admitted SAT & ACT (25th–75th %)'}
            </span>
            <div className="text-lg font-bold tabular-nums text-[#14233C]">
              {evaluation.testingComparison.isTestBlind
                ? 'Test-Blind Policy'
                : `SAT ${activeCollege.satMiddle50Range.split('(')[0].trim()}`}
            </div>
            <p className="text-xs text-[#5A6478]">
              {evaluation.testingComparison.isTestBlind ? (
                <span>SAT/ACT scores are not considered in admissions</span>
              ) : (
                <>
                  ACT Middle 50%:{' '}
                  <span className="tabular-nums font-semibold text-[#14233C]">
                    {activeCollege.actMiddle50Range}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* =====================================================================
            SIDE-BY-SIDE COMPARISON: YOUR CURRENT STATS VS. ADMITTED BENCHMARKS
           ===================================================================== */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#14233C] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            How Your Current Portfolio Compares to {activeCollege.shortName} Admitted Students
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. GPA Comparison */}
            <div className="p-4 rounded-xl border border-[#E6E1D8] bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#14233C]">
                  1. Unweighted GPA Benchmark
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    evaluation.gpaComparison.status === 'On Target'
                      ? 'bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/30'
                      : evaluation.gpaComparison.status === 'Close'
                        ? 'bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/40'
                        : 'bg-[#B5473D]/12 text-[#A13D34] border border-[#B5473D]/30'
                  }`}
                >
                  {evaluation.gpaComparison.status}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs tabular-nums bg-[#FAF8F4] px-3 py-2 rounded-lg text-[#14233C]">
                <span>
                  Your GPA:{' '}
                  <strong>
                    {evaluation.gpaComparison.studentUnweighted !== null
                      ? evaluation.gpaComparison.studentUnweighted.toFixed(2)
                      : 'Not Entered'}
                  </strong>
                </span>
                <span>
                  {activeCollege.shortName} Admitted Avg:{' '}
                  <strong>
                    {activeCollege.avgUnweightedGpa.toFixed(2)}
                  </strong>
                </span>
              </div>
              <p className="text-xs text-[#5A6478]">
                {evaluation.gpaComparison.summary}
              </p>
            </div>

            {/* 2. Course Rigor Comparison */}
            <div className="p-4 rounded-xl border border-[#E6E1D8] bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#14233C]">
                  2. AP / IB / Honors Course Rigor
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    evaluation.rigorComparison.status === 'On Target'
                      ? 'bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/30'
                      : evaluation.rigorComparison.status === 'Close'
                        ? 'bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/40'
                        : 'bg-[#B5473D]/12 text-[#A13D34] border border-[#B5473D]/30'
                  }`}
                >
                  {evaluation.rigorComparison.status}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs tabular-nums bg-[#FAF8F4] px-3 py-2 rounded-lg text-[#14233C]">
                <span>
                  Your Track:{' '}
                  <strong>{familyProfile.curriculumType}</strong>
                </span>
                <span>
                  {activeCollege.shortName} Senior Target:{' '}
                  <strong>
                    {evaluation.rigorComparison.collegeSeniorTarget}+ AP/IBs
                  </strong>
                </span>
              </div>
              <p className="text-xs text-[#5A6478]">
                {evaluation.rigorComparison.summary}
              </p>
            </div>

            {/* 3. SAT / ACT Comparison */}
            <div className="p-4 rounded-xl border border-[#E6E1D8] bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#14233C]">
                  3. Standardized Testing (SAT / ACT)
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    evaluation.testingComparison.status === 'On Target' ||
                    evaluation.testingComparison.status === 'Test-Blind Policy'
                      ? 'bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/30'
                      : evaluation.testingComparison.status === 'Close' ||
                          evaluation.testingComparison.status === 'Pre-SAT Baseline'
                        ? 'bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/40'
                        : 'bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8]'
                  }`}
                >
                  {evaluation.testingComparison.status}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs tabular-nums bg-[#FAF8F4] px-3 py-2 rounded-lg text-[#14233C]">
                <span>
                  Your Score:{' '}
                  <strong>
                    {evaluation.testingComparison.studentSat
                      ? `SAT ${evaluation.testingComparison.studentSat}`
                      : evaluation.testingComparison.studentAct
                        ? `ACT ${evaluation.testingComparison.studentAct}`
                        : evaluation.testingComparison.studentPsat
                          ? `${evaluation.testingComparison.studentPsat} (Practice)`
                          : 'Not Entered'}
                  </strong>
                </span>
                <span>
                  {evaluation.testingComparison.isTestBlind ? (
                    <>
                      {activeCollege.shortName} Policy:{' '}
                      <strong>SAT/ACT Not Considered</strong>
                    </>
                  ) : (
                    <>
                      {activeCollege.shortName} 25th–75th:{' '}
                      <strong>{activeCollege.satMiddle50Range.split('(')[0]}</strong>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-[#5A6478]">
                {evaluation.testingComparison.summary}
              </p>
            </div>

            {/* 4. Extracurricular Leadership & Honors Comparison */}
            <div className="p-4 rounded-xl border border-[#E6E1D8] bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#14233C]">
                  4. Extracurricular Leadership &amp; Honors Depth
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    evaluation.activityAndHonorsComparison.status === 'On Target'
                      ? 'bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/30'
                      : 'bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/40'
                  }`}
                >
                  {evaluation.activityAndHonorsComparison.status}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs tabular-nums bg-[#FAF8F4] px-3 py-2 rounded-lg text-[#14233C]">
                <span>
                  Leadership Roles:{' '}
                  <strong>
                    {evaluation.activityAndHonorsComparison.leadershipCount}
                  </strong>
                </span>
                <span>
                  State/National Honors:{' '}
                  <strong>
                    {evaluation.activityAndHonorsComparison.tierHonorsCount}
                  </strong>
                </span>
              </div>
              <p className="text-xs text-[#5A6478]">
                {evaluation.activityAndHonorsComparison.summary}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            WHAT YOU NEED TO IMPROVE TO GET INTO THIS DREAM COLLEGE
           ===================================================================== */}
        <div className="rounded-2xl bg-[#FAF8F4] border border-[#E6E1D8] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A5B1C] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Personalized Action Plan for {activeCollege.shortName}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-[#14233C]">
                What You Need to Improve to Maximize Your {activeCollege.shortName} Admissions Chances
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {evaluation.whatToImprove.map((item, idx) => {
              const isHigh = item.priority === 'High Priority';
              const isOnTrack = item.priority === 'On Track — Maintain';
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-[#E6E1D8] shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#14233C]">
                        {item.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isHigh
                            ? 'bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/40'
                            : isOnTrack
                              ? 'bg-[#2F7A5A]/12 text-[#276B4E] border border-[#2F7A5A]/30'
                              : 'bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8]'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-[#14233C] leading-snug">
                      {item.title}
                    </h5>
                    <p className="text-xs text-[#5A6478] leading-relaxed">
                      {item.actionStep}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official CDS Section C7 Factors Rated "Very Important" by this University */}
          <div className="pt-3 border-t border-[#E6E1D8] flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#14233C] flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#7A5B1C]" />
              Factors Rated &ldquo;Very Important&rdquo; in {activeCollege.shortName}&apos;s Common Data Set:
            </span>
            {activeCollege.cdsVeryImportantFactors.map((factor) => (
              <span
                key={factor}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E1D8] text-[11px] font-semibold text-[#14233C]"
              >
                ✓ {factor}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
