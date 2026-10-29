import React, { useState } from 'react';
import {
  Star,
  Edit3,
  Trash2,
  BookOpen,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActivityItem,
  JournalEntryItem,
  JournalMood,
} from '../types';
import { calculateActivityTotalHours } from '../badges';
import {
  ActivityCategoryBanner,
  ImpactScoreControl,
} from './EditorialIllustrations';

interface ActivityCardProps {
  activity: ActivityItem;
  linkedReflections: JournalEntryItem[];
  onEdit: (act: ActivityItem) => void;
  onDelete: (id: string) => void;
  onToggleStar: (act: ActivityItem) => void;
  onUpdateImpactScore: (act: ActivityItem, newScore: number) => void;
  onAddQuickReflection: (
    act: ActivityItem,
    reflectionText: string,
    mood: JournalMood
  ) => Promise<void>;
}

const MOOD_LABELS: JournalMood[] = [
  'Proud',
  'Energized',
  'Curious',
  'Grateful',
  'Challenged',
];

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  linkedReflections,
  onEdit,
  onDelete,
  onToggleStar,
  onUpdateImpactScore,
  onAddQuickReflection,
}) => {
  const [showReflections, setShowReflections] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [selectedMood, setSelectedMood] = useState<JournalMood>('Proud');
  const [savingReflection, setSavingReflection] = useState(false);

  const totalHours = calculateActivityTotalHours(activity);
  const impactScore = activity.impactScore ?? 4;
  const isStarred =
    activity.commonAppSlot >= 1 && activity.commonAppSlot <= 10;

  const hasUnsyncedNotes =
    Boolean(activity.extendedNotes?.trim()) &&
    !linkedReflections.some(
      (r) => r.content.trim() === activity.extendedNotes.trim()
    );

  const reflectionCount =
    (hasUnsyncedNotes ? 1 : 0) + linkedReflections.length;

  const sortedGrades = [...activity.grades].sort((a, b) => a - b);
  const gradeSummary =
    sortedGrades.length === 0
      ? '—'
      : sortedGrades.length === 1
        ? `${sortedGrades[0]}th Grade`
        : `${sortedGrades[0]}th–${sortedGrades[sortedGrades.length - 1]}th Grade`;

  const handleQuickReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionDraft.trim()) return;
    setSavingReflection(true);
    try {
      await onAddQuickReflection(activity, reflectionDraft.trim(), selectedMood);
      setReflectionDraft('');
    } finally {
      setSavingReflection(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs hover:shadow-md hover:border-[#14233C]/30 transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div>
        <ActivityCategoryBanner
          activityType={activity.activityType}
          organization={activity.organization}
          position={activity.position}
          commonAppSlot={activity.commonAppSlot}
        />

        <div className="p-5 sm:p-6 space-y-4">
          {/* Zone 1: Role Title, Organization & Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {activity.studentName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FAF8F4] border border-[#E6E1D8] text-[11px] font-semibold text-[#2B4C8C] mb-1">
                  Student: {activity.studentName}
                </span>
              )}
              <h3 className="text-base sm:text-lg font-semibold text-[#14233C] leading-snug">
                {activity.position}
              </h3>
              <p className="text-sm font-medium text-[#5A6478] mt-0.5">
                {activity.organization}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onToggleStar(activity)}
                title={
                  isStarred
                    ? 'Remove from Common App Top 10'
                    : 'Add to Common App Top 10'
                }
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isStarred
                    ? 'bg-[#14233C] border-[#14233C] text-white'
                    : 'bg-white border-[#E6E1D8] text-[#5A6478] hover:bg-[#FAF8F4]'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isStarred ? 'fill-[#E5C168] text-[#E5C168]' : ''
                  }`}
                />
                <span>{isStarred ? 'Top 10' : 'Star'}</span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(activity)}
                title="Edit Activity"
                className="p-1.5 rounded-lg border border-[#E6E1D8] bg-white text-[#5A6478] hover:text-[#14233C] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(activity.id)}
                title="Delete Activity"
                className="p-1.5 rounded-lg border border-[#E6E1D8] bg-white text-[#5A6478] hover:text-[#A13D34] hover:bg-[#B5473D]/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zone 2: Clean Activity Description */}
          <p className="text-sm text-[#14233C] leading-relaxed">
            {activity.description}
          </p>

          {/* Zone 3: 1-5 Growth Impact Score Rating */}
          <ImpactScoreControl
            score={impactScore}
            size="sm"
            onChange={(newScore) => onUpdateImpactScore(activity, newScore)}
          />
        </div>
      </div>

      {/* Zone 4: Compact Bottom Metadata Bar + Expandable Reflections Drawer */}
      <div className="border-t border-[#E6E1D8] bg-[#FAF8F4] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#5A6478]">
            <span className="font-medium text-[#14233C]">
              {gradeSummary}
            </span>
            <span className="text-[#E6E1D8]" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[#5A6478]">
              <Clock className="w-3.5 h-3.5 text-[#5A6478]" />
              <strong className="text-[#14233C] tabular-nums">
                {totalHours.toLocaleString()}h total
              </strong>
              <span className="text-[#5A6478]">({activity.hoursPerWeek}h/wk · {activity.weeksPerYear}w/yr)</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowReflections(!showReflections)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#14233C] hover:underline cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#5A6478]" />
            <span>
              {reflectionCount} {reflectionCount === 1 ? 'Reflection' : 'Reflections'}
            </span>
            {showReflections ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible Reflections Drawer */}
        {showReflections && (
          <div className="mt-3 pt-3 border-t border-[#E6E1D8] space-y-2.5">
            {hasUnsyncedNotes && activity.extendedNotes && (
              <div className="rounded-xl bg-white border border-[#E6E1D8] p-3 text-xs text-[#5A6478] leading-relaxed">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#14233C] mb-0.5">
                  Personal Reflection
                </div>
                <p>“{activity.extendedNotes}”</p>
              </div>
            )}

            {linkedReflections.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl bg-white border border-[#E6E1D8] p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#14233C] truncate">
                    {entry.title}
                  </span>
                  <span className="text-[11px] text-[#5A6478]">
                    {entry.gradeLevel}th Grade · {entry.mood}
                  </span>
                </div>
                <p className="text-[#5A6478] leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}

            <form
              onSubmit={handleQuickReflectionSubmit}
              className="rounded-xl bg-white border border-[#E6E1D8] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-[#5A6478]">
                  Add a new reflection note:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {MOOD_LABELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMood(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                        selectedMood === m
                          ? 'bg-[#14233C] text-white border-[#14233C]'
                          : 'bg-[#FAF8F4] text-[#5A6478] border-[#E6E1D8]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reflectionDraft}
                  onChange={(e) => setReflectionDraft(e.target.value)}
                  placeholder="Write a takeaway or favorite memory..."
                  className="flex-1 rounded-lg bg-[#FAF8F4] border border-[#E6E1D8] px-3 py-1.5 text-xs text-[#14233C] placeholder:text-[#5A6478] focus:outline-none focus:bg-white focus:border-[#14233C]"
                />
                <button
                  type="submit"
                  disabled={!reflectionDraft.trim() || savingReflection}
                  className="px-3 py-1.5 rounded-lg bg-[#14233C] hover:bg-[#1e3252] disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>{savingReflection ? '...' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </article>
  );
};
