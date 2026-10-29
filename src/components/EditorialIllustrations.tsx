import React from 'react';
import { IMPACT_SCORE_LABELS } from '../types';

export const STUDENT_AVATAR_STYLES = [
  { id: 'scholar', label: 'Scholar' },
  { id: 'athlete', label: 'Athlete' },
  { id: 'innovator', label: 'Innovator' },
  { id: 'leader', label: 'Leader' },
] as const;

export const StudentIllustratedAvatar: React.FC<{
  name: string;
  styleIndex?: number;
}> = ({ name }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/35 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs"
      title={name}
    >
      {initials || 'ST'}
    </div>
  );
};

/**
 * Full-bleed Student & Campus Hero Background Picture
 * Uses a rich Royal Collegiate Blue & Golden-Hour Sky palette (zero harsh black!)
 * with an architectural campus library, quad trees, and students collaborating.
 */
export const StudentWebsiteHeroBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-[#14233C]" />
  );
};

/**
 * Dedicated Website Subpage Header Banner for Activities, Reflections, Honors, Milestones & Common App
 * Makes every tab look and feel like an authentic collegiate admissions workstation.
 */
export const SubpageHeroBanner: React.FC<{
  sectionLabel: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  onBackHome: () => void;
}> = ({
  sectionLabel,
  title,
  subtitle,
  stats,
  primaryAction,
  secondaryAction,
  onBackHome,
}) => {
  return (
    <section className="relative w-full bg-[#FAF8F4] text-[#14233C] border-b border-[#E6E1D8] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            {/* Website Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-[#5A6478] font-medium">
              <button
                type="button"
                onClick={onBackHome}
                className="hover:text-[#14233C] transition-colors cursor-pointer"
              >
                Overview
              </button>
              <span className="text-[#E6E1D8]">/</span>
              <span className="text-[#2B4C8C] font-semibold">{sectionLabel}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal tracking-tight text-[#14233C] leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed font-sans max-w-xl">
              {subtitle}
            </p>

            {(primaryAction || secondaryAction) && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {primaryAction && (
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    className="px-4 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
                  >
                    {primaryAction.label}
                  </button>
                )}
                {secondaryAction && (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    className="text-xs sm:text-sm text-[#2B4C8C] hover:text-[#14233C] underline underline-offset-4 font-medium transition-colors cursor-pointer"
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Page KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            {stats.map((st, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#E6E1D8] rounded-xl px-3.5 py-3 min-w-[95px] sm:min-w-[115px]"
              >
                <div className="text-lg sm:text-2xl font-semibold tabular-nums text-[#14233C]">
                  {st.value}
                </div>
                <div className="text-[10px] sm:text-xs text-[#5A6478] mt-0.5">
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const HeroEditorialArtwork: React.FC<{
  totalHours: number;
  avgImpact: string;
  top10Count: number;
}> = ({ totalHours, avgImpact, top10Count }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E6E1D8] p-6 text-[#14233C] space-y-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2B4C8C]">
            Portfolio snapshot
          </p>
          <h3 className="text-lg font-serif font-normal text-[#14233C] mt-0.5">
            Grades 6–12 record
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#B8913A]/15 border border-[#B8913A]/35 text-xs font-semibold text-[#7A5B1C] tabular-nums">
          ★ {top10Count}/10 Common App
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#FAF8F4] rounded-xl p-3.5 border border-[#E6E1D8]">
          <div className="text-2xl font-semibold tabular-nums text-[#14233C]">
            {totalHours.toLocaleString()}
            <span className="text-xs font-normal text-[#5A6478] ml-1">hrs</span>
          </div>
          <div className="text-xs text-[#5A6478] mt-0.5">Total logged</div>
        </div>
        <div className="bg-[#FAF8F4] rounded-xl p-3.5 border border-[#E6E1D8]">
          <div className="text-2xl font-semibold tabular-nums text-[#14233C]">
            {avgImpact}
            <span className="text-sm text-[#5A6478]">/5</span>
          </div>
          <div className="text-xs text-[#5A6478] mt-0.5">Avg impact</div>
        </div>
        <div className="bg-[#FAF8F4] rounded-xl p-3.5 border border-[#E6E1D8]">
          <div className="text-2xl font-semibold tabular-nums text-[#7A5B1C]">
            {top10Count}
            <span className="text-sm text-[#5A6478]">/10</span>
          </div>
          <div className="text-xs text-[#5A6478] mt-0.5">Top 10 slots</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Clean Academic Card Header using Paper (#FAF8F4), Stone (#E6E1D8), Ink Navy (#14233C),
 * and Laurel Gold (#B8913A) reserved strictly for Common App Top 10 achievements.
 */
export const ActivityCategoryBanner: React.FC<{
  activityType: string;
  position: string;
  organization: string;
  commonAppSlot: number;
}> = ({ activityType, position, organization, commonAppSlot }) => {
  const isStarred = commonAppSlot >= 1 && commonAppSlot <= 10;
  const combined = `${activityType} ${position} ${organization}`.toLowerCase();

  let domainLabel = 'Extracurricular Activity';
  let iconType: 'athletics' | 'stem' | 'music' | 'service' | 'writing' = 'stem';

  if (
    combined.includes('basketball') ||
    combined.includes('track') ||
    combined.includes('soccer') ||
    activityType.includes('Athletics')
  ) {
    domainLabel = 'Athletics & Team Sports';
    iconType = 'athletics';
  } else if (
    combined.includes('robot') ||
    combined.includes('code') ||
    combined.includes('science') ||
    combined.includes('math') ||
    activityType.includes('Robotics') ||
    activityType.includes('Computer')
  ) {
    domainLabel = 'STEM & Engineering';
    iconType = 'stem';
  } else if (
    combined.includes('music') ||
    combined.includes('cello') ||
    combined.includes('violin') ||
    combined.includes('art') ||
    activityType.includes('Music') ||
    activityType.includes('Art')
  ) {
    domainLabel = 'Performing & Visual Arts';
    iconType = 'music';
  } else if (
    combined.includes('volunteer') ||
    combined.includes('service') ||
    combined.includes('tutor') ||
    activityType.includes('Community Service')
  ) {
    domainLabel = 'Community Service & Leadership';
    iconType = 'service';
  } else if (
    combined.includes('journal') ||
    combined.includes('debate') ||
    combined.includes('newspaper') ||
    activityType.includes('Journalism')
  ) {
    domainLabel = 'Publications & Speech';
    iconType = 'writing';
  }

  return (
    <div className="relative px-5 py-3 bg-[#FAF8F4] border-b border-[#E6E1D8] flex items-center justify-between gap-3 overflow-hidden">
      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-white border border-[#E6E1D8] text-[#14233C] flex items-center justify-center shrink-0">
          {iconType === 'athletics' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8M3 12h18" />
            </svg>
          )}
          {iconType === 'stem' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          )}
          {iconType === 'music' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          )}
          {iconType === 'service' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z" />
            </svg>
          )}
          {iconType === 'writing' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#14233C] tracking-tight truncate">
            {activityType}
          </div>
          <div className="text-[10px] text-[#5A6478] truncate">{domainLabel}</div>
        </div>
      </div>

      {isStarred && (
        <span className="relative z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#B8913A]/15 text-[#7A5B1C] border border-[#B8913A]/35 shrink-0 tabular-nums">
          <span>★ Top 10 (#{commonAppSlot})</span>
        </span>
      )}
    </div>
  );
};

/**
 * Sleek, Cohesive 1-5 Growth Impact Score Rating Bar
 */
export const ImpactScoreControl: React.FC<{
  score: number;
  onChange?: (newScore: number) => void;
  size?: 'sm' | 'md';
}> = ({ score, onChange, size = 'sm' }) => {
  const safeScore = Math.min(5, Math.max(1, Math.round(score || 3)));
  const meta = IMPACT_SCORE_LABELS[safeScore] || IMPACT_SCORE_LABELS[3];

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3.5 rounded-xl bg-[#FAF8F4] border border-[#E6E1D8]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#5A6478]">
          Growth Impact
        </span>
        <div
          className="flex items-center gap-0.5"
          role="group"
          aria-label="Growth Impact Score (1 to 5 scale)"
        >
          {[1, 2, 3, 4, 5].map((val) => {
            const filled = val <= safeScore;
            return (
              <button
                key={val}
                type="button"
                disabled={!onChange}
                onClick={() => onChange && onChange(val)}
                title={`Rate ${val}/5 — ${IMPACT_SCORE_LABELS[val].label}: ${IMPACT_SCORE_LABELS[val].desc}`}
                className={`${
                  size === 'md' ? 'w-6 h-6' : 'w-5 h-5'
                } rounded-md flex items-center justify-center transition-colors ${
                  onChange ? 'hover:bg-[#E6E1D8]/50 cursor-pointer' : 'cursor-default'
                } ${filled ? 'text-[#B8913A]' : 'text-[#E6E1D8]'}`}
              >
                <svg
                  className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs flex items-center gap-1.5">
        <span className="tabular-nums font-semibold text-[#2B4C8C]">
          {safeScore}.0
        </span>
        <span className="text-[#E6E1D8]" aria-hidden="true">
          ·
        </span>
        <span className="font-medium text-[#5A6478]">{meta.label}</span>
      </div>
    </div>
  );
};
