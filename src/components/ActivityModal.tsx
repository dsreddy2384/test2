import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Sparkles,
  Search,
  Star,
  Wand2,
  Plus,
  Check,
  BookOpen,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  ActivityItem,
  ALL_GRADES,
  COMMON_APP_CATEGORIES,
  GradeLevel,
  IMPACT_SCORE_LABELS,
  ParticipationTiming,
  StudentChildProfile,
} from '../types';
import {
  ActivityPresetSuggestion,
  getDynamicDescriptionSuggestions,
  getFilteredPresets,
  getOrganizationAutoSuggestions,
  getPositionAutoSuggestions,
  POPULAR_ACTIVITY_TOPICS,
} from '../activitySuggestions';
import { getAiAuthHeaders } from '../firebase';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    activityData: Omit<ActivityItem, 'id' | 'ownerId'>,
    existingId?: string
  ) => Promise<void>;
  initialActivity?: ActivityItem | null;
  defaultGrade: GradeLevel;
  usedSlots: number[];
  existingActivities: ActivityItem[];
  initialPrefill?: {
    activityType: string;
    position: string;
    organization: string;
    description: string;
    extendedNotes: string;
    hoursPerWeek: number;
    weeksPerYear: number;
  } | null;
  schoolName?: string;
  districtOrCity?: string;
  defaultZipCode?: string;
  students?: StudentChildProfile[];
  activeStudentId?: string;
  onSelectStudent?: (studentId: string) => void;
  onQuickAddStudent?: (
    name: string,
    grade: GradeLevel,
    schoolName?: string
  ) => StudentChildProfile;
}

type WizardStep = 1 | 2 | 3;

const REFLECTION_SPARKS = [
  'What challenged me most at the beginning, and how did I improve?',
  'My favorite memory or behind-the-scenes moment with teammates:',
  'A time I helped, encouraged, or taught someone younger:',
];

export const ActivityModal: React.FC<ActivityModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    onSave,
    initialActivity,
    defaultGrade,
    usedSlots,
    existingActivities = [],
    initialPrefill,
    schoolName = 'High School',
    districtOrCity = 'School District',
    defaultZipCode = '78701',
    students = [],
    activeStudentId = '',
    onSelectStudent,
    onQuickAddStudent,
  } = props;
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const resolveValidStudentId = (
    preferredId?: string,
    preferredName?: string
  ): string => {
    if (students.length === 0) return preferredId || activeStudentId || '';
    if (preferredId && students.some((s) => s.id === preferredId)) {
      return preferredId;
    }
    if (preferredName) {
      const byName = students.find(
        (s) => s.name.trim().toLowerCase() === preferredName.trim().toLowerCase()
      );
      if (byName) return byName.id;
    }
    if (activeStudentId && students.some((s) => s.id === activeStudentId)) {
      return activeStudentId;
    }
    return students[0]?.id || '';
  };

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() =>
    resolveValidStudentId(
      initialActivity?.studentId,
      initialActivity?.studentName
    )
  );
  const [showAddSiblingForm, setShowAddSiblingForm] = useState<boolean>(false);
  const [newSiblingName, setNewSiblingName] = useState<string>('');
  const [newSiblingGrade, setNewSiblingGrade] = useState<GradeLevel>(9);
  const [newSiblingSchool, setNewSiblingSchool] = useState<string>('');
  const [suggestionMode, setSuggestionMode] = useState<'phrases' | 'examples'>(
    'phrases'
  );
  const [showTemplates, setShowTemplates] = useState<boolean>(true);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [extendedNotes, setExtendedNotes] = useState<string>('');
  const [grades, setGrades] = useState<GradeLevel[]>([defaultGrade]);
  const [timing, setTiming] = useState<ParticipationTiming>('School Year');
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(0);
  const [weeksPerYear, setWeeksPerYear] = useState<number>(0);
  const [continueInCollege, setContinueInCollege] = useState<boolean>(true);
  const [commonAppSlot, setCommonAppSlot] = useState<number>(0);
  const [impactScore, setImpactScore] = useState<number>(0);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [aiPolishLoading, setAiPolishLoading] = useState<boolean>(false);
  const [aiPolishSuggestions, setAiPolishSuggestions] = useState<
    { styleLabel: string; text: string }[]
  >([]);

  // Compute used Top 10 slots specifically for the currently selected child inside the modal (excluding the activity being edited)
  const usedSlotsForSelectedStudent = useMemo(() => {
    const selStu = students.find((s) => s.id === selectedStudentId);
    if (!selStu && existingActivities.length === 0) {
      return usedSlots;
    }
    const selNameLower = selStu?.name.trim().toLowerCase() || '';
    const slots: number[] = [];
    for (const act of existingActivities) {
      if (initialActivity && act.id === initialActivity.id) continue;
      if (
        act.commonAppSlot >= 1 &&
        act.commonAppSlot <= 10 &&
        act.grades.some((g) => g >= 9)
      ) {
        if (selStu) {
          const matchesId = act.studentId === selStu.id;
          const matchesName =
            Boolean(act.studentName) &&
            act.studentName!.trim().toLowerCase() === selNameLower;
          if (matchesId || matchesName) {
            slots.push(act.commonAppSlot);
          }
        } else {
          slots.push(act.commonAppSlot);
        }
      }
    }
    return slots;
  }, [
    existingActivities,
    students,
    selectedStudentId,
    initialActivity,
    usedSlots,
  ]);

  const nextAvailableSlot = useMemo(() => {
    return (
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(
        (s) => !usedSlotsForSelectedStudent.includes(s)
      ) || 10
    );
  }, [usedSlotsForSelectedStudent]);

  // If the user switches to a different child (or edits an activity and moves it to another child) whose Top 10 already uses `commonAppSlot`, automatically bump to `nextAvailableSlot`
  useEffect(() => {
    if (
      commonAppSlot >= 1 &&
      commonAppSlot <= 10 &&
      usedSlotsForSelectedStudent.includes(commonAppSlot)
    ) {
      setCommonAppSlot(nextAvailableSlot);
    }
  }, [commonAppSlot, usedSlotsForSelectedStudent, nextAvailableSlot]);

  // Keep selectedStudentId valid if students array hydrates after modal open
  useEffect(() => {
    if (
      students.length > 0 &&
      !students.some((s) => s.id === selectedStudentId)
    ) {
      setSelectedStudentId(
        resolveValidStudentId(
          initialActivity?.studentId,
          initialActivity?.studentName
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, activeStudentId]);

  const wasOpenRef = useRef<boolean>(false);
  const lastInitKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    const initKey = `${initialActivity?.id || 'new'}|${
      initialPrefill
        ? `${initialPrefill.activityType}:${initialPrefill.position}:${initialPrefill.organization}`
        : 'blank'
    }`;

    if (wasOpenRef.current && lastInitKeyRef.current === initKey) {
      return;
    }

    wasOpenRef.current = true;
    lastInitKeyRef.current = initKey;

    if (initialActivity) {
      setActivityType(initialActivity.activityType);
      setPosition(initialActivity.position);
      setOrganization(initialActivity.organization);
      setDescription(initialActivity.description);
      setExtendedNotes(initialActivity.extendedNotes);
      setGrades(
        initialActivity.grades.length > 0
          ? initialActivity.grades
          : [defaultGrade]
      );
      setTiming(initialActivity.timing);
      setHoursPerWeek(initialActivity.hoursPerWeek);
      setWeeksPerYear(initialActivity.weeksPerYear);
      setContinueInCollege(initialActivity.continueInCollege);
      setCommonAppSlot(
        initialActivity.grades.some((g) => g >= 9)
          ? initialActivity.commonAppSlot
          : 0
      );
      setImpactScore(
        typeof initialActivity.impactScore === 'number'
          ? initialActivity.impactScore
          : 4
      );
    } else if (initialPrefill) {
      setActivityType(initialPrefill.activityType);
      setPosition(initialPrefill.position);
      setOrganization(initialPrefill.organization);
      setDescription(initialPrefill.description);
      setExtendedNotes(initialPrefill.extendedNotes);
      setGrades([defaultGrade]);
      setTiming('School Year');
      setHoursPerWeek(initialPrefill.hoursPerWeek || 0);
      setWeeksPerYear(initialPrefill.weeksPerYear || 0);
      setContinueInCollege(true);
      // Leave Top 10 and Impact Score unselected on new activities so the student makes an intentional choice
      setCommonAppSlot(0);
      setImpactScore(0);
    } else {
      setActivityType('');
      setPosition('');
      setOrganization('');
      setDescription('');
      setExtendedNotes('');
      setGrades([defaultGrade]);
      setTiming('School Year');
      setHoursPerWeek(0);
      setWeeksPerYear(0);
      setContinueInCollege(true);
      // Leave Top 10 and Impact Score unselected on new activities
      setCommonAppSlot(0);
      setImpactScore(0);
    }
    setCurrentStep(1);
    setSelectedStudentId(
      resolveValidStudentId(
        initialActivity?.studentId,
        initialActivity?.studentName
      )
    );
    setShowAddSiblingForm(false);
    setNewSiblingName('');
    setNewSiblingSchool('');
    setSuggestionMode('phrases');
    setShowTemplates(!initialActivity);
    setQuickSearch('');
    setSelectedPresetId('');
    setErrorMsg('');
    setAiPolishSuggestions([]);
    setAiPolishLoading(false);
  }, [
    initialActivity,
    initialPrefill,
    defaultGrade,
    isOpen,
    nextAvailableSlot,
    activeStudentId,
    students,
  ]);

  // Dynamic suggestion hooks
  const matchingPresets = useMemo(
    () =>
      getFilteredPresets(
        quickSearch,
        activityType,
        description,
        position,
        organization
      ),
    [quickSearch, activityType, description, position, organization]
  );

  const positionSuggestions = useMemo(
    () =>
      getPositionAutoSuggestions(
        position,
        activityType,
        description,
        organization
      ),
    [position, activityType, description, organization]
  );

  const organizationSuggestions = useMemo(
    () =>
      getOrganizationAutoSuggestions(
        organization,
        activityType,
        position,
        description
      ),
    [organization, activityType, position, description]
  );

  const dynamicDesc = useMemo(
    () =>
      getDynamicDescriptionSuggestions(
        description,
        activityType,
        position,
        organization,
        quickSearch
      ),
    [description, activityType, position, organization, quickSearch]
  );

  const unreplacedPlaceholders = useMemo(
    () => description.match(/\[[^\]]+\]/g) || [],
    [description]
  );

  if (!isOpen) return null;

  const handleCategoryChange = (newCategory: string) => {
    setActivityType(newCategory);
    setSelectedPresetId('');
  };

  const applyPreset = (preset: ActivityPresetSuggestion) => {
    setSelectedPresetId(preset.id);
    setActivityType(preset.activityType);
    setPosition(preset.position.slice(0, 50));
    setOrganization(preset.organization.slice(0, 100));
    setDescription(preset.description.slice(0, 150));
    setErrorMsg('');
  };

  const appendPhraseToDescription = (phrase: string) => {
    const cleanPhrase = phrase
      .trim()
      .replace(/^[;,.]+\s*/, '')
      .replace(/[;,.]+$/, '');
    const rawTrimmed = description.trim();
    const current = rawTrimmed.replace(/[;,.]+$/, '');

    if (!current) {
      const cap =
        cleanPhrase.charAt(0).toUpperCase() + cleanPhrase.slice(1) + '.';
      setDescription(cap.slice(0, 150));
      return;
    }

    // Parse into clauses while preserving each clause's original separator ('. ' vs '; ')
    const segmentRegex = /([^;.]+)([;.]\s*|$)/g;
    const segments: { text: string; sep: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = segmentRegex.exec(rawTrimmed)) !== null) {
      const text = match[1].trim().replace(/[,]+$/, '');
      if (text) {
        const rawSep = match[2].trim();
        segments.push({
          text,
          sep: rawSep === '.' ? '. ' : rawSep === ';' ? '; ' : '; ',
        });
      }
    }

    const rebuildSegments = (items: { text: string; sep: string }[]) => {
      if (items.length === 0) return '';
      let out = '';
      for (let i = 0; i < items.length; i++) {
        out += items[i].text;
        if (i < items.length - 1) {
          out += items[i].sep || '; ';
        }
      }
      return `${out.replace(/[;,.]+$/, '')}.`;
    };

    const getSignificantTokens = (str: string) =>
      str
        .toLowerCase()
        .replace(/\[[^\]]+\]/g, '')
        .split(/[^a-z]+/)
        .filter(
          (w) =>
            w.length >= 4 &&
            ![
              'with',
              'from',
              'that',
              'this',
              'were',
              'have',
              'every',
              'week',
              'weekly',
              'school',
              'local',
              'fellow',
              'across',
            ].includes(w)
        )
        .map((w) => w.replace(/(ed|ing|es|s)$/, ''));

    const phraseStems = getSignificantTokens(cleanPhrase);
    const phraseLeadStem = phraseStems[0] || '';

    // Check if any existing clause already talks about the same verb/topic (e.g. "I performed at a few recitals" vs "performed at [#] recitals")
    const matchingClauseIdx = segments.findIndex((seg) => {
      const clauseStems = getSignificantTokens(seg.text);
      if (phraseLeadStem && clauseStems.includes(phraseLeadStem)) {
        return true;
      }
      const sharedCount = phraseStems.filter((s) =>
        clauseStems.includes(s)
      ).length;
      return sharedCount >= 1 && sharedCount >= Math.min(2, phraseStems.length);
    });

    if (matchingClauseIdx !== -1) {
      const updatedSegments = segments.map((s) => ({ ...s }));
      const originalClause = updatedSegments[matchingClauseIdx].text;
      const prevSep =
        matchingClauseIdx > 0 ? updatedSegments[matchingClauseIdx - 1].sep : '. ';
      const startsNewSentence =
        matchingClauseIdx === 0 || prevSep.trim() === '.';
      const hadFirstPersonI = /^I\s+/i.test(originalClause);

      let replacementText = cleanPhrase;
      if (hadFirstPersonI && !/^I\s+/i.test(cleanPhrase)) {
        replacementText = `I ${cleanPhrase.charAt(0).toLowerCase()}${cleanPhrase.slice(1)}`;
      } else if (startsNewSentence) {
        replacementText =
          cleanPhrase.charAt(0).toUpperCase() + cleanPhrase.slice(1);
      }

      updatedSegments[matchingClauseIdx].text = replacementText;
      const replaced = rebuildSegments(updatedSegments);
      if (replaced.length <= 150) {
        setDescription(replaced);
        return;
      }
    }

    const joined = `${current}; ${cleanPhrase}.`;
    if (joined.length <= 150) {
      setDescription(joined);
      return;
    }

    if (segments.length > 1) {
      const updatedSegments = segments.map((s) => ({ ...s }));
      updatedSegments[updatedSegments.length - 1].text = cleanPhrase;
      const swapped = rebuildSegments(updatedSegments);
      if (swapped.length <= 150) {
        setDescription(swapped);
        return;
      }
    }

    const maxLen = 149;
    const rawCombined = `${current}; ${cleanPhrase}`;
    const sliced = rawCombined.slice(0, maxLen);
    const lastSpace = sliced.lastIndexOf(' ');
    if (lastSpace > current.length + 3) {
      setDescription(`${sliced.slice(0, lastSpace).replace(/[,;]+$/, '')}.`);
    }
  };

  const toggleGrade = (g: GradeLevel) => {
    let nextGrades = grades;
    if (grades.includes(g)) {
      if (grades.length > 1) {
        nextGrades = grades.filter((item) => item !== g).sort((a, b) => a - b);
        setGrades(nextGrades);
      }
    } else {
      nextGrades = [...grades, g].sort((a, b) => a - b);
      setGrades(nextGrades);
    }
    // Only allow Common App Top 10 slots if at least one High School grade (9-12) is selected
    if (!nextGrades.some((gr) => gr >= 9) && commonAppSlot > 0) {
      setCommonAppSlot(0);
    }
  };

  const insertVerbIntoDescription = (verb: string) => {
    const current = description.trim();
    if (!current) {
      setDescription(`${verb} `);
    } else if ((current + `; ${verb.toLowerCase()} `).length <= 150) {
      setDescription(
        `${current.replace(/[;,.]+$/, '')}; ${verb.toLowerCase()} `
      );
    }
  };

  const insertReflectionSpark = (spark: string) => {
    if (!extendedNotes.trim()) {
      setExtendedNotes(`${spark} `);
    } else if ((extendedNotes + `\n\n${spark} `).length <= 2000) {
      setExtendedNotes(`${extendedNotes.trim()}\n\n${spark} `);
    }
  };

  const getClientPolishKey = (
    cat: string,
    pos: string,
    org: string,
    draft: string
  ) =>
    [
      cat.trim().toLowerCase(),
      pos.trim().toLowerCase(),
      org.trim().toLowerCase(),
      draft.trim().toLowerCase(),
    ].join('|');

  const fetchPolishOptions = async (
    cat: string,
    pos: string,
    org: string,
    draft: string,
    silent = false
  ) => {
    const key = getClientPolishKey(cat, pos, org, draft);
    const w = window as unknown as {
      __polishCache?: Record<string, { styleLabel: string; text: string }[]>;
    };
    if (!w.__polishCache) w.__polishCache = {};

    if (w.__polishCache[key]?.length) {
      if (!silent) {
        setAiPolishSuggestions(w.__polishCache[key]);
      }
      return w.__polishCache[key];
    }

    if (!silent) {
      setAiPolishLoading(true);
      setErrorMsg('');
    }
    try {
      const res = await fetch('/api/ai/polish-activity', {
        method: 'POST',
        headers: await getAiAuthHeaders(),
        body: JSON.stringify({
          activityType: cat,
          position: pos,
          organization: org,
          draftDescription: draft,
          hoursPerWeek: hoursPerWeek > 0 ? hoursPerWeek : undefined,
          weeksPerYear: weeksPerYear > 0 ? weeksPerYear : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to polish description with AI.');
      }
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
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        w.__polishCache[key] = data.suggestions;
        if (!silent) {
          setAiPolishSuggestions(data.suggestions);
        }
        return data.suggestions;
      }
    } catch (err) {
      if (!silent) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Unable to polish description right now.'
        );
      }
    } finally {
      if (!silent) {
        setAiPolishLoading(false);
      }
    }
    return null;
  };

  const handleAiPolishDescription = async () => {
    await fetchPolishOptions(activityType, position, organization, description, false);
  };

  const handleNextStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg('');
    if (currentStep === 1) {
      if (
        students.length > 0 &&
        !students.some((s) => s.id === selectedStudentId)
      ) {
        setErrorMsg(
          'Please select which student this activity is for before continuing.'
        );
        return;
      }
      if (!activityType.trim()) {
        setErrorMsg(
          'Please select an Activity Category (or pick a template below) to continue.'
        );
        return;
      }
      if (!position.trim() || !organization.trim()) {
        setErrorMsg(
          'Please enter your Role/Position and your Club/Team/Organization name to continue.'
        );
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!description.trim()) {
        setErrorMsg(
          'Please write a short 150-character summary (or click one of the suggested examples below) to continue.'
        );
        return;
      }
      const placeholders = description.match(/\[[^\]]+\]/g);
      if (placeholders && placeholders.length > 0) {
        setErrorMsg(
          `Please replace the placeholder ${placeholders.join(', ')} in your 150-character summary with your real number or detail before continuing.`
        );
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 3) {
      handleNextStep();
      return;
    }
    setErrorMsg('');

    const cleanPos = position.trim().slice(0, 50);
    const cleanOrg = organization.trim().slice(0, 100);
    const cleanDesc = description.trim().slice(0, 150);
    const cleanNotes = extendedNotes.trim().slice(0, 2000);

    if (
      students.length > 0 &&
      !students.some((s) => s.id === selectedStudentId)
    ) {
      setCurrentStep(1);
      setErrorMsg('Please select which student this activity belongs to.');
      return;
    }

    if (!activityType.trim() || !cleanPos || !cleanOrg) {
      setCurrentStep(1);
      setErrorMsg('Please select an Activity Category and complete your Role and Organization Name.');
      return;
    }

    if (!cleanDesc) {
      setCurrentStep(2);
      setErrorMsg('Please add a brief 150-character activity summary.');
      return;
    }

    const placeholders = cleanDesc.match(/\[[^\]]+\]/g);
    if (placeholders && placeholders.length > 0) {
      setCurrentStep(2);
      setErrorMsg(
        `Please replace the placeholder ${placeholders.join(', ')} in your 150-character summary with your real number or detail before saving.`
      );
      return;
    }

    if (!hoursPerWeek || hoursPerWeek <= 0 || !weeksPerYear || weeksPerYear <= 0) {
      setCurrentStep(3);
      setErrorMsg(
        'Please enter your Hours / Week and Weeks / Year commitment.'
      );
      return;
    }

    if (!impactScore || impactScore < 1 || impactScore > 5) {
      setCurrentStep(3);
      setErrorMsg(
        'Please select a Growth Impact Score (1–5 ★) to rate how meaningful this activity was.'
      );
      return;
    }

    const effectiveGrades = grades.length > 0 ? grades : [defaultGrade];
    const hasHighSchoolGrade = effectiveGrades.some((g) => g >= 9);
    const finalCommonAppSlot = hasHighSchoolGrade ? commonAppSlot : 0;

    setSubmitting(true);
    try {
      const chosenStudent = students.find((s) => s.id === selectedStudentId);
      await onSave(
        {
          activityType,
          position: cleanPos,
          organization: cleanOrg,
          description: cleanDesc,
          extendedNotes: cleanNotes,
          grades: effectiveGrades,
          timing,
          hoursPerWeek: Math.min(80, Math.max(0.5, Number(hoursPerWeek))),
          weeksPerYear: Math.min(
            52,
            Math.max(1, Math.round(Number(weeksPerYear)))
          ),
          continueInCollege,
          commonAppSlot: finalCommonAppSlot,
          impactScore: Math.min(5, Math.max(1, Math.round(Number(impactScore)))),
          ...(chosenStudent
            ? {
                studentId: chosenStudent.id.slice(0, 80),
                studentName: chosenStudent.name.slice(0, 80),
              }
            : initialActivity?.studentId
              ? {
                  studentId: initialActivity.studentId.slice(0, 80),
                  studentName: (initialActivity.studentName || '').slice(0, 80),
                }
              : {}),
        },
        initialActivity?.id
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save activity.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cumulativeHours = Math.round(
    (Number(hoursPerWeek) || 0) *
      (Number(weeksPerYear) || 0) *
      Math.max(1, grades.length)
  );
  const hasHighSchoolGradeSelected = grades.some((g) => g >= 9);
  const isPinnedToTop10 = hasHighSchoolGradeSelected && commonAppSlot > 0;
  const step1Done = Boolean(
    activityType.trim() && position.trim() && organization.trim()
  );
  const step2Done = Boolean(
    description.trim() && unreplacedPlaceholders.length === 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14233C]/45 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Royal Blue Website Modal Header + Clear 3-Step Progress Bar */}
        <div className="bg-[#14233C] text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                {initialActivity
                  ? 'Edit Portfolio Activity'
                  : 'Add Extracurricular Activity (+60 XP)'}
              </span>
              <h2 className="text-xl font-semibold text-white mt-0.5">
                {initialActivity
                  ? initialActivity.organization
                  : 'Guided 3-Step Activity Builder'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3-Step Interactive Stepper Bar */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              {
                step: 1 as WizardStep,
                label: '1. Activity & Role',
                done: step1Done,
              },
              {
                step: 2 as WizardStep,
                label: '2. 150-Char Summary',
                done: step2Done,
              },
              {
                step: 3 as WizardStep,
                label: '3. Schedule & Impact',
                done: Boolean(hoursPerWeek > 0 && weeksPerYear > 0 && impactScore > 0),
              },
            ].map((item) => {
              const isCurrent = currentStep === item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    if (item.step === 3 && unreplacedPlaceholders.length > 0) {
                      setCurrentStep(2);
                      setErrorMsg(
                        `Please replace the placeholder ${unreplacedPlaceholders.join(', ')} in your 150-character summary with your real number or detail before continuing.`
                      );
                      return;
                    }
                    setCurrentStep(item.step);
                  }}
                  className={`px-3 py-2 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between gap-1.5 ${
                    isCurrent
                      ? 'bg-white text-[#14233C] border-white font-semibold shadow-xs'
                      : 'bg-white/12 text-slate-200 border-white/20 hover:bg-white/20'
                  }`}
                >
                  <span className="text-xs truncate">{item.label}</span>
                  {item.done && !isCurrent && (
                    <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body — Shows ONLY the Current Step for a Clean, Uncluttered UX Flow */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* =========================================================
              STEP 1: STUDENT SELECTION, CATEGORY, ROLE & ORGANIZATION
             ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Student / Child Selector (Supports Multiple Kids in Family Portfolio) */}
              <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#14233C] block">
                      Which student is this activity for?
                    </span>
                    <span className="text-[11px] text-[#5A6478]">
                      Select a child below, or click &ldquo;+ Add another child&rdquo; if you have multiple kids.
                    </span>
                  </div>
                  {onQuickAddStudent && (
                    <button
                      type="button"
                      onClick={() => setShowAddSiblingForm((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#14233C] text-[#14233C] hover:text-white border border-[#E6E1D8] text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {showAddSiblingForm ? 'Cancel' : 'Add another child'}
                      </span>
                    </button>
                  )}
                </div>

                {students.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {students.map((stu) => {
                      const isSelected = selectedStudentId === stu.id;
                      return (
                        <button
                          key={stu.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(stu.id);
                            onSelectStudent?.(stu.id);
                            if (!initialActivity) {
                              setGrades([stu.grade]);
                              if (stu.grade <= 8) {
                                setCommonAppSlot(0);
                              }
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                              : 'bg-white text-[#14233C] border-[#E6E1D8] hover:border-[#14233C]'
                          }`}
                        >
                          <span>{stu.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSelected
                                ? 'bg-white/20 text-[#E5C168]'
                                : 'bg-[#FAF8F4] text-[#5A6478]'
                            }`}
                          >
                            {stu.grade}th Grade
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#E5C168]" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#5A6478]">
                    No student named yet — click &ldquo;+ Add another child&rdquo; to name your student(s), or save directly to your current portfolio.
                  </p>
                )}

                {showAddSiblingForm && onQuickAddStudent && (
                  <div className="pt-2 border-t border-[#E6E1D8] grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-[#14233C] mb-1">
                        Student&apos;s Full Name
                      </label>
                      <input
                        type="text"
                        value={newSiblingName}
                        onChange={(e) => setNewSiblingName(e.target.value)}
                        placeholder="e.g., Diya Reddy"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E6E1D8] rounded-lg text-[#14233C] focus:outline-none focus:border-[#14233C]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-[#14233C] mb-1">
                        Current Grade
                      </label>
                      <select
                        aria-label="Current grade"
                        value={newSiblingGrade}
                        onChange={(e) =>
                          setNewSiblingGrade(Number(e.target.value) as GradeLevel)
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E6E1D8] rounded-lg text-[#14233C] focus:outline-none focus:border-[#14233C]"
                      >
                        {ALL_GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g}th Grade
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSiblingName.trim()) {
                            setErrorMsg("Please enter the student's name first.");
                            return;
                          }
                          const created = onQuickAddStudent(
                            newSiblingName.trim(),
                            newSiblingGrade,
                            newSiblingSchool.trim()
                          );
                          setSelectedStudentId(created.id);
                          setGrades([created.grade]);
                          setNewSiblingName('');
                          setNewSiblingSchool('');
                          setShowAddSiblingForm(false);
                          setErrorMsg('');
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold cursor-pointer"
                      >
                        Save &amp; Select Student
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Selection + Optional Quick Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Activity Category
                  </label>
                  <select
                    aria-label="Activity category"
                    value={activityType}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium bg-[#FAF8F4] border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-[#14233C]"
                  >
                    <option value="" disabled>
                      Select an activity category...
                    </option>
                    {COMMON_APP_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quick Topic Search (Optional)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={quickSearch}
                      onChange={(e) => {
                        setQuickSearch(e.target.value);
                        if (e.target.value.trim()) setShowTemplates(true);
                      }}
                      placeholder="e.g., basketball, violin, robotics..."
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-[#FAF8F4] border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-[#14233C]"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Suggested Templates Based on Selected Activity & Category */}
              <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#14233C] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#14233C]" />
                      Dynamic Activity Templates ({quickSearch ? `"${quickSearch}"` : activityType || 'All Categories'})
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Select an activity topic below (Math Olympiad, Science Olympiad, Basketball, Volunteering, etc.) or change the category above to see tailored templates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs font-semibold text-[#14233C] hover:underline shrink-0 cursor-pointer"
                  >
                    {showTemplates ? 'Hide Templates' : 'Show Templates'}
                  </button>
                </div>

                {/* Popular Activity Topic Quick-Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {POPULAR_ACTIVITY_TOPICS.map((topic) => {
                    const isSelectedTopic =
                      quickSearch.toLowerCase() === topic.query.toLowerCase();
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          if (isSelectedTopic) {
                            setQuickSearch('');
                          } else {
                            setActivityType(topic.category);
                            setQuickSearch(topic.query);
                            setShowTemplates(true);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelectedTopic
                            ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#E6E1D8] hover:text-[#14233C]'
                        }`}
                      >
                        {topic.label}
                      </button>
                    );
                  })}
                </div>

                {showTemplates && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#E6E1D8]">
                    {matchingPresets.slice(0, 4).map((preset) => {
                      const isChosen = selectedPresetId === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isChosen
                              ? 'bg-white border-[#14233C] ring-2 ring-[#14233C]/15'
                              : 'bg-white hover:bg-[#FAF8F4] border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#14233C]">
                                {preset.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  isChosen
                                    ? 'bg-[#14233C] text-white'
                                    : 'bg-[#FAF8F4] text-[#14233C]'
                                }`}
                              >
                                {isChosen ? 'Applied ✓' : 'Use Template'}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-1">
                              {preset.position}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {preset.organization}
                            </p>
                            <p className="text-[11px] text-slate-700 mt-1.5 leading-snug bg-slate-50 p-2 rounded-lg border border-slate-100">
                              “{preset.description}”
                            </p>
                          </div>

                          {isChosen && preset.relatedAddOns.length > 0 && (
                            <div
                              className="pt-2 border-t border-slate-100 space-y-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-bold text-slate-500 block">
                                Click to swap/add what you did:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {preset.relatedAddOns.slice(0, 3).map((addon) => (
                                  <button
                                    key={addon}
                                    type="button"
                                    onClick={() =>
                                      appendPhraseToDescription(addon)
                                    }
                                    className="px-2 py-0.5 rounded bg-[#FAF8F4] hover:bg-[#FAF8F4] text-[#14233C] text-[10px] font-medium border border-[#E6E1D8] cursor-pointer text-left"
                                  >
                                    + {addon}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Input 1: Role / Position */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Your Role or Position
                  </label>
                  <span className="text-xs font-mono text-slate-400">
                    {position.length}/50 chars
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Point Guard & Team Player, Club Member, Lead Programmer..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#14233C]"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-slate-400 mr-1">
                    Quick pick:
                  </span>
                  {positionSuggestions.slice(0, 3).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setPosition(sug.slice(0, 50))}
                      className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F4] hover:bg-[#FAF8F4] hover:text-[#14233C] text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input 2: Club / Team / Organization Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Club, Team, or Organization Name
                  </label>
                  <span className="text-xs font-mono text-slate-400">
                    {organization.length}/100 chars
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g., School JV Basketball Team, VEX Robotics Club..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#14233C]"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-slate-400 mr-1">
                    Quick pick:
                  </span>
                  {organizationSuggestions.slice(0, 3).map((orgSug) => (
                    <button
                      key={orgSug}
                      type="button"
                      onClick={() => setOrganization(orgSug.slice(0, 100))}
                      className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F4] hover:bg-[#FAF8F4] hover:text-[#14233C] text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer truncate max-w-full"
                    >
                      + {orgSug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 2: 150-CHAR SUMMARY & CLEAN SMART SUGGESTIONS
             ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Context Pill showing what you entered in Step 1 */}
              <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] flex items-center justify-between gap-2 text-xs">
                <div className="truncate">
                  <span className="font-semibold text-[#14233C]">
                    {position || 'Role'}
                  </span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span className="text-slate-600">
                    {organization || activityType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[#14233C] font-medium hover:underline shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* 150-Character Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Common App Activity Summary (Max 150 Characters)
                  </label>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      description.length > 140
                        ? 'text-amber-600'
                        : 'text-[#14233C]'
                    }`}
                  >
                    {description.length}/150 chars
                  </span>
                </div>

                <textarea
                  rows={3}
                  maxLength={150}
                  required
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Describe what you did, how often you practiced/met, and your impact..."
                  className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 focus:outline-none ${
                    unreplacedPlaceholders.length > 0
                      ? 'border-amber-500 ring-2 ring-amber-500/20 focus:border-amber-600'
                      : 'border-slate-300 focus:border-[#14233C]'
                  }`}
                />

                {unreplacedPlaceholders.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between gap-2">
                    <span>
                      <strong className="font-bold">Fill in placeholder before continuing:</strong>{' '}
                      Replace{' '}
                      <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono font-bold text-amber-950">
                        {unreplacedPlaceholders.join(', ')}
                      </code>{' '}
                      in the box above with your actual number or detail.
                    </span>
                  </div>
                )}

                {/* AI 150-Character Polish Action Bar */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">
                    Want admissions-ready phrasing under 150 chars?
                  </span>
                  <button
                    type="button"
                    onClick={handleAiPolishDescription}
                    disabled={aiPolishLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#14233C] hover:bg-[#1e3252] text-white transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiPolishLoading ? 'Polishing with AI...' : 'AI Polish (150 Chars)'}
                  </button>
                </div>

                {aiPolishSuggestions.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] space-y-2 mt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#14233C]">
                      AI Admissions-Ready Options (Click to Use)
                    </div>
                    <div className="space-y-1.5">
                      {aiPolishSuggestions.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDescription(opt.text.slice(0, 150))}
                          className="w-full text-left p-2.5 rounded-lg bg-white hover:bg-[#FAF8F4] border border-[#E6E1D8] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[10px] font-semibold text-[#14233C] mb-0.5">
                            <span>{opt.styleLabel}</span>
                            <span>{opt.text.length}/150 chars</span>
                          </div>
                          <div className="text-xs text-slate-800">{opt.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clean 2-Tab Smart Writing Assistant (Eliminates visual clutter!) */}
              <div className="rounded-2xl bg-[#FAF8F4] border border-slate-200/90 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#14233C]">
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Smart Suggestions</span>
                  </div>

                  {/* Toggle between Bite-Sized Phrases vs Full Examples */}
                  <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                    <button
                      type="button"
                      onClick={() => setSuggestionMode('phrases')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        suggestionMode === 'phrases'
                          ? 'bg-white text-[#14233C] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      + Add Detail Phrases
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestionMode('examples')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        suggestionMode === 'examples'
                          ? 'bg-white text-[#14233C] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Complete 150-Char Examples
                    </button>
                  </div>
                </div>

                {suggestionMode === 'phrases' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dynamicDesc.relatedAddOns.slice(0, 4).map((addon, idx) => (
                        <button
                          key={`${addon.text}_${idx}`}
                          type="button"
                          onClick={() => appendPhraseToDescription(addon.text)}
                          className="p-2.5 rounded-xl bg-white hover:bg-[#FAF8F4] border border-slate-200 hover:border-[#14233C] text-left transition-colors flex items-start gap-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#14233C] shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 leading-snug">
                            {addon.text}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 mr-1">
                        Action verbs:
                      </span>
                      {dynamicDesc.recommendedVerbs.slice(0, 6).map((verb) => (
                        <button
                          key={verb}
                          type="button"
                          onClick={() => insertVerbIntoDescription(verb)}
                          className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-[#FAF8F4] hover:text-[#14233C] border border-slate-200 text-slate-600 rounded-md transition-colors cursor-pointer"
                        >
                          + {verb}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dynamicDesc.fullStatements.slice(0, 3).map((item, i) => (
                      <button
                        key={`${item.angle}_${i}`}
                        type="button"
                        onClick={() => setDescription(item.text.slice(0, 150))}
                        className="w-full p-3 rounded-xl bg-white hover:bg-[#FAF8F4] border border-slate-200 hover:border-[#14233C] text-left text-xs transition-colors space-y-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#14233C]">
                            {item.angle}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {item.text.length}/150 · Click to use
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {item.text}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 3: GRADES, SCHEDULE, IMPACT SCORE & REFLECTION
             ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* 1. Grades & Time Commitment */}
              <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-slate-200/90 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-800">
                      Grades Participated
                    </label>
                    <span className="text-xs font-medium text-[#14233C]">
                      {grades.map((g) => `${g}th`).join(', ')} Grade
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {ALL_GRADES.map((g) => {
                      const active = grades.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGrade(g)}
                          className={`py-2 px-1 rounded-xl border text-center transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#14233C] text-white border-[#14233C] font-semibold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xs font-mono">{g}th</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/70">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Hours / Week <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="80"
                      required
                      placeholder="e.g., 3"
                      value={hoursPerWeek > 0 ? hoursPerWeek : ''}
                      onChange={(e) =>
                        setHoursPerWeek(
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Weeks / Year <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      required
                      placeholder="e.g., 28"
                      value={weeksPerYear > 0 ? weeksPerYear : ''}
                      onChange={(e) =>
                        setWeeksPerYear(
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#14233C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Season
                    </label>
                    <select
                      aria-label="Season"
                      value={timing}
                      onChange={(e) =>
                        setTiming(e.target.value as ParticipationTiming)
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#14233C]"
                    >
                      <option value="School Year">School Year</option>
                      <option value="School Break">Summer / Break</option>
                      <option value="All Year">All Year</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Personal Growth Impact Score (1-5 Scale) */}
              <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 block">
                      Growth Impact Score (1–5 Scale){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      How meaningful was this activity to your personal growth? (Select 1–5)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#14233C]">
                    {impactScore >= 1 && impactScore <= 5
                      ? `${impactScore}/5 · ${IMPACT_SCORE_LABELS[impactScore]?.label}`
                      : 'Select 1–5 ★'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((scoreVal) => {
                    const isSelected = impactScore === scoreVal;
                    const info = IMPACT_SCORE_LABELS[scoreVal];
                    return (
                      <button
                        key={scoreVal}
                        type="button"
                        onClick={() => setImpactScore(scoreVal)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#14233C] text-white border-[#14233C]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#E6E1D8]'
                        }`}
                      >
                        <div className="text-xs font-mono font-semibold">
                          {scoreVal} ★
                        </div>
                        <div
                          className={`text-[10px] truncate mt-0.5 ${
                            isSelected ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {info.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Personal Reflection & Common App Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#14233C]" />
                    Personal Reflection &amp; Memories (Optional)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {extendedNotes.length}/2000
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {REFLECTION_SPARKS.map((spark, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertReflectionSpark(spark)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-[#FAF8F4] hover:bg-[#FAF8F4] text-slate-600 hover:text-[#14233C] border border-slate-200 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      + {spark}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  maxLength={2000}
                  value={extendedNotes}
                  onChange={(e) => setExtendedNotes(e.target.value)}
                  placeholder="Record a favorite memory, lesson learned, or proud moment for future college essays..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#14233C]"
                />

                {/* Simple Common App Top 10 Toggle (Grades 9–12) vs Middle School Foundation (Grades 6–8) */}
                {hasHighSchoolGradeSelected ? (
                  <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Star
                        className={`w-4 h-4 ${
                          isPinnedToTop10
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          Include in Common App Top 10 Showcase (Optional)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Leave unselected if you are still exploring, or star for your 10 high-school application slots
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCommonAppSlot(
                          isPinnedToTop10 ? 0 : nextAvailableSlot
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                        isPinnedToTop10
                          ? 'bg-[#14233C] border-[#14233C] text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isPinnedToTop10
                        ? `★ Top 10 (#${commonAppSlot})`
                        : 'Add to Top 10'}
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-[#14233C]">
                        Tagged as Middle School Foundation (Grades 6–8)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        The Common App only exports Grades 9–12. This activity will be saved in your Foundation timeline.
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#2B4C8C]/12 text-[#2B4C8C] border border-[#2B4C8C]/25 text-[11px] font-semibold shrink-0">
                      Foundation
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clean Wizard Footer */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              {currentStep === 1 && 'Step 1 of 3 · Role & Organization'}
              {currentStep === 2 && 'Step 2 of 3 · 150-Character Summary'}
              {currentStep === 3 && (
                <span>
                  Total:{' '}
                  <strong className="font-mono text-slate-800">
                    {cumulativeHours} hrs
                  </strong>{' '}
                  · Impact:{' '}
                  <strong className="font-mono text-[#14233C]">
                    {impactScore >= 1 ? `${impactScore}/5 ★` : 'Not selected'}
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentStep((prev) => (prev - 1) as WizardStep)
                  }
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  key={`wizard-next-step-${currentStep}`}
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  key="wizard-submit-step-3"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Saving...'
                    : initialActivity
                      ? 'Save Changes'
                      : 'Save Activity (+60 XP)'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
