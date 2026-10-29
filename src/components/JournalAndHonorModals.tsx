import React, { useState, useEffect } from 'react';
import { X, Bookmark, Sparkles, Check } from 'lucide-react';
import {
  ActivityItem,
  ALL_GRADES,
  GradeLevel,
  HonorAwardItem,
  JOURNAL_PROMPTS,
  JournalEntryItem,
  JournalMood,
  RecognitionLevel,
  StudentChildProfile,
} from '../types';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<JournalEntryItem, 'id' | 'ownerId'>, existingId?: string) => Promise<void>;
  initialEntry?: JournalEntryItem | null;
  activities: ActivityItem[];
  defaultGrade: GradeLevel;
  students?: StudentChildProfile[];
  activeStudentId?: string;
  onSelectStudent?: (studentId: string) => void;
}

const MOODS: JournalMood[] = ['Energized', 'Proud', 'Curious', 'Challenged', 'Grateful'];

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEntry,
  activities,
  defaultGrade,
  students = [],
  activeStudentId = '',
  onSelectStudent,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [promptUsed, setPromptUsed] = useState(JOURNAL_PROMPTS[0].prompt);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(defaultGrade);
  const [linkedActivityId, setLinkedActivityId] = useState<string>('');
  const [mood, setMood] = useState<JournalMood>('Proud');
  const [hoursLogged, setHoursLogged] = useState<number>(1.5);
  const [isEssaySeed, setIsEssaySeed] = useState<boolean>(false);
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
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
    resolveValidStudentId(initialEntry?.studentId, initialEntry?.studentName)
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialEntry) {
      setTitle(initialEntry.title);
      setContent(initialEntry.content);
      setPromptUsed(initialEntry.promptUsed);
      setGradeLevel(initialEntry.gradeLevel);
      setLinkedActivityId(initialEntry.linkedActivityId);
      setMood(initialEntry.mood);
      setHoursLogged(initialEntry.hoursLogged);
      setIsEssaySeed(initialEntry.isEssaySeed);
      setEntryDate(initialEntry.entryDate);
      setSelectedStudentId(
        resolveValidStudentId(initialEntry.studentId, initialEntry.studentName)
      );
    } else {
      setTitle('');
      setContent('');
      setPromptUsed(JOURNAL_PROMPTS[0].prompt);
      setGradeLevel(defaultGrade);
      setLinkedActivityId(activities[0]?.id || '');
      setMood('Proud');
      setHoursLogged(1.5);
      setIsEssaySeed(false);
      setEntryDate(new Date().toISOString().slice(0, 10));
      setSelectedStudentId(resolveValidStudentId());
    }
    setErrorMsg('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry, defaultGrade, activities, isOpen, activeStudentId, students]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTitle = title.trim().slice(0, 100);
    const cleanContent = content.trim().slice(0, 3000);
    if (!cleanTitle || !cleanContent) {
      setErrorMsg('Please add a headline and your reflection entry.');
      return;
    }

    const linkedAct = activities.find((a) => a.id === linkedActivityId);
    const chosenStudent =
      students.find((s) => s.id === selectedStudentId) ||
      students.find((s) => s.id === activeStudentId) ||
      students[0];

    setSubmitting(true);
    try {
      await onSave(
        {
          title: cleanTitle,
          content: cleanContent,
          promptUsed: promptUsed.slice(0, 160),
          gradeLevel,
          linkedActivityId: linkedAct ? linkedAct.id : '',
          linkedActivityTitle: linkedAct ? linkedAct.organization.slice(0, 100) : 'General Milestone',
          mood,
          hoursLogged: Math.min(24, Math.max(0, Number(hoursLogged) || 0)),
          isEssaySeed,
          entryDate: entryDate || new Date().toISOString().slice(0, 10),
          ...(chosenStudent
            ? {
                studentId: chosenStudent.id.slice(0, 80),
                studentName: chosenStudent.name.slice(0, 80),
              }
            : initialEntry?.studentId
              ? {
                  studentId: initialEntry.studentId.slice(0, 80),
                  studentName: (initialEntry.studentName || '').slice(0, 80),
                }
              : {}),
        },
        initialEntry?.id
      );
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14233C]/45 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E6E1D8] rounded-2xl max-w-2xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Ink Navy Modal Header — Matches Add Activity Modal */}
        <div className="bg-[#14233C] text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5C168]">
                Daily Growth Reflection · Builds Streak & Future College Essay Vault
              </span>
              <h2 className="text-xl font-semibold text-white mt-0.5">
                {initialEntry ? 'Edit Journal Reflection' : 'Log Today’s Growth Entry'}
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
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Student Selector when Multiple Kids Exist */}
          {students.length > 0 && (
            <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-3.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#14233C]">
                Logging reflection for:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {students.map((stu) => {
                  const isSelected =
                    selectedStudentId === stu.id ||
                    (!selectedStudentId &&
                      (activeStudentId === stu.id || stu.id === students[0]?.id));
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(stu.id);
                        onSelectStudent?.(stu.id);
                        setGradeLevel(stu.grade);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#14233C] text-white border-[#14233C]'
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
                        {stu.grade}th
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#E5C168]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guided Prompt Selector */}
          <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-4 space-y-2.5">
            <label className="block text-xs font-bold text-[#14233C]">
              Choose a Reflection Spark Prompt
            </label>
            <div className="flex flex-wrap gap-1.5">
              {JOURNAL_PROMPTS.map((item) => {
                const active = promptUsed === item.prompt;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setPromptUsed(item.prompt)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                        : 'bg-white text-[#14233C] border-[#E6E1D8] hover:border-[#14233C]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#E6E1D8] text-xs text-[#14233C] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8913A] shrink-0" />
              <span className="font-medium">{promptUsed}</span>
            </div>
          </div>

          {/* Entry Headline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#14233C]">
                Memory Headline
              </label>
              <span className="text-xs font-mono tabular-nums text-[#5A6478]">
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              maxLength={100}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fixed our robot’s gear ratio right before qualification match #4"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] placeholder:text-[#5A6478]/60 focus:outline-none focus:border-[#14233C]"
            />
          </div>

          {/* Story Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#14233C]">
                Your Reflection Story
              </label>
              <span className="text-xs font-mono tabular-nums text-[#5A6478]">
                {content.length}/3000 chars
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={3000}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely! Specific details—what you built, who you worked with, what surprised you—make the best college essay stories years later."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] placeholder:text-[#5A6478]/60 focus:outline-none focus:border-[#14233C]"
            />
          </div>

          {/* Linked Activity, Grade, Date, Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#14233C] mb-1">
                Linked Activity (Optional)
              </label>
              <select
                aria-label="Linked Activity (Optional)"
                value={linkedActivityId}
                onChange={(e) => setLinkedActivityId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F4] border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
              >
                <option value="">General Personal Milestone</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.organization} ({a.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#14233C] mb-1">
                  Grade
                </label>
                <select
                  aria-label="Grade"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value) as GradeLevel)}
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                >
                  {ALL_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}th
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14233C] mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={hoursLogged}
                  onChange={(e) => setHoursLogged(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14233C] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-2 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
                />
              </div>
            </div>
          </div>

          {/* Mood & Essay Seed Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8]">
            <div>
              <span className="block text-xs font-bold text-[#14233C] mb-1.5">
                How did this session feel?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      mood === m
                        ? 'bg-[#14233C] text-white border-[#14233C]'
                        : 'bg-white text-[#5A6478] border-[#E6E1D8] hover:border-[#14233C] hover:text-[#14233C]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEssaySeed(!isEssaySeed)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isEssaySeed
                  ? 'bg-[#B8913A]/15 border-[#B8913A] text-[#14233C]'
                  : 'bg-white border-[#E6E1D8] text-[#14233C] hover:border-[#14233C]'
              }`}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  isEssaySeed ? 'text-[#B8913A] fill-[#B8913A]' : 'text-[#5A6478]'
                }`}
              />
              {isEssaySeed ? 'Bookmarked as Essay Seed' : 'Bookmark as Future Essay Seed'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#E6E1D8]">
            <span className="text-xs text-[#5A6478]">
              Logging daily entries extends your streak and awards{' '}
              <strong className="text-[#276B4E] font-mono">+40 XP</strong>.
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#5A6478] hover:text-[#14233C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#14233C] hover:bg-[#1e3252] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting
                  ? 'Saving...'
                  : initialEntry
                    ? 'Save Changes'
                    : 'Save Journal Entry (+40 XP)'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface HonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (honor: Omit<HonorAwardItem, 'id' | 'ownerId'>, existingId?: string) => Promise<void>;
  initialHonor?: HonorAwardItem | null;
  defaultGrade: GradeLevel;
  students?: StudentChildProfile[];
  activeStudentId?: string;
  onSelectStudent?: (studentId: string) => void;
}

const RECOGNITION_LEVELS: RecognitionLevel[] = [
  'School',
  'State/Regional',
  'National',
  'International',
];

export const HonorModal: React.FC<HonorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialHonor,
  defaultGrade,
  students = [],
  activeStudentId = '',
  onSelectStudent,
}) => {
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(defaultGrade);
  const [recognitionLevel, setRecognitionLevel] = useState<RecognitionLevel>('State/Regional');
  const [commonAppRank, setCommonAppRank] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [awardDate, setAwardDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const resolveValidHonorStudentId = (
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
    resolveValidHonorStudentId(
      initialHonor?.studentId,
      initialHonor?.studentName
    )
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialHonor) {
      setTitle(initialHonor.title);
      setGradeLevel(initialHonor.gradeLevel);
      setRecognitionLevel(initialHonor.recognitionLevel);
      setCommonAppRank(initialHonor.commonAppRank);
      setNotes(initialHonor.notes);
      setAwardDate(initialHonor.awardDate);
      setSelectedStudentId(
        resolveValidHonorStudentId(
          initialHonor.studentId,
          initialHonor.studentName
        )
      );
    } else {
      setTitle('');
      setGradeLevel(defaultGrade);
      setRecognitionLevel('School');
      setCommonAppRank(1);
      setNotes('');
      setAwardDate(new Date().toISOString().slice(0, 10));
      setSelectedStudentId(resolveValidHonorStudentId());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHonor, defaultGrade, isOpen, activeStudentId, students]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const chosenStudent =
      students.find((s) => s.id === selectedStudentId) ||
      students.find((s) => s.id === activeStudentId) ||
      students[0];
    setSubmitting(true);
    try {
      await onSave(
        {
          title: title.trim().slice(0, 100),
          gradeLevel,
          recognitionLevel,
          commonAppRank,
          notes: notes.trim().slice(0, 500),
          awardDate: awardDate || new Date().toISOString().slice(0, 10),
          ...(chosenStudent
            ? {
                studentId: chosenStudent.id.slice(0, 80),
                studentName: chosenStudent.name.slice(0, 80),
              }
            : initialHonor?.studentId
              ? {
                  studentId: initialHonor.studentId.slice(0, 80),
                  studentName: (initialHonor.studentName || '').slice(0, 80),
                }
              : {}),
        },
        initialHonor?.id
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14233C]/45 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E6E1D8] rounded-2xl max-w-xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Ink Navy Modal Header — Matches Add Activity Modal */}
        <div className="bg-[#14233C] text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5C168]">
                Common App Honors & Awards Vault (Up to 5 Official Slots)
              </span>
              <h2 className="text-xl font-semibold text-white mt-0.5">
                {initialHonor ? 'Edit Academic or Competition Honor' : 'Record New Honor / Award'}
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
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {students.length > 0 && (
            <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] p-3.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#14233C]">
                Logging honor for:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {students.map((stu) => {
                  const isSelected =
                    selectedStudentId === stu.id ||
                    (!selectedStudentId &&
                      (activeStudentId === stu.id || stu.id === students[0]?.id));
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(stu.id);
                        onSelectStudent?.(stu.id);
                        setGradeLevel(stu.grade);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#14233C] text-white border-[#14233C]'
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
                        {stu.grade}th
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#E5C168]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#14233C]">
                Honor / Award Title (Common App max 100 chars)
              </label>
              <span className="text-xs font-mono tabular-nums text-[#5A6478]">
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              maxLength={100}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Science Olympiad Regional Medal — Forensics"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] placeholder:text-[#5A6478]/60 focus:outline-none focus:border-[#14233C]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8]">
            <div>
              <label className="block text-xs font-bold text-[#14233C] mb-1">
                Grade Level
              </label>
              <select
                aria-label="Grade Level"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value) as GradeLevel)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
              >
                {ALL_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}th Grade
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233C] mb-1">
                Recognition Level
              </label>
              <select
                aria-label="Recognition Level"
                value={recognitionLevel}
                onChange={(e) => setRecognitionLevel(e.target.value as RecognitionLevel)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
              >
                {RECOGNITION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233C] mb-1">
                Common App Slot
              </label>
              <select
                aria-label="Common App Slot"
                value={commonAppRank}
                onChange={(e) => setCommonAppRank(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] focus:outline-none focus:border-[#14233C]"
              >
                <option value={0}>Archive Only</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    Honor Slot #{r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14233C] mb-1.5">
              Context / What It Took to Earn This (Max 500 chars)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional memory note about the competition, ceremony, or project."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E6E1D8] rounded-xl text-[#14233C] placeholder:text-[#5A6478]/60 focus:outline-none focus:border-[#14233C]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E6E1D8]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#5A6478] hover:text-[#14233C] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#14233C] hover:bg-[#1e3252] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Honor (+50 XP)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

