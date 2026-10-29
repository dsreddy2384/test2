import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Check,
  Search,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import {
  ActivityItem,
  COMMON_APP_CATEGORIES,
  GradeLevel,
} from '../types';
import {
  ActivityPresetSuggestion,
  getFilteredPresets,
  POPULAR_ACTIVITY_TOPICS,
} from '../activitySuggestions';

interface RecentSchoolCompetitionsPickerProps {
  schoolName: string;
  districtOrCity?: string;
  defaultZipCode?: string;
  currentGrade: GradeLevel;
  usedSlots: number[];
  onQuickSaveActivity: (
    activityData: Omit<ActivityItem, 'id' | 'ownerId'>
  ) => Promise<void>;
  onPrefillModal: (prefill: {
    activityType: string;
    position: string;
    organization: string;
    description: string;
    extendedNotes: string;
    hoursPerWeek: number;
    weeksPerYear: number;
  }) => void;
}

export const RecentSchoolCompetitionsPicker: React.FC<
  RecentSchoolCompetitionsPickerProps
> = ({
  schoolName,
  currentGrade,
  usedSlots,
  onQuickSaveActivity,
  onPrefillModal,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    POPULAR_ACTIVITY_TOPICS[0].id
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    POPULAR_ACTIVITY_TOPICS[0].category
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    POPULAR_ACTIVITY_TOPICS[0].query
  );

  // Selected template for quick customization before saving
  const [activePreset, setActivePreset] =
    useState<ActivityPresetSuggestion | null>(null);
  const [customRole, setCustomRole] = useState<string>('');
  const [customOrg, setCustomOrg] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [customDescription, setCustomDescription] = useState<string>('');
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(4);
  const [weeksPerYear, setWeeksPerYear] = useState<number>(30);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const matchingTemplates = useMemo(() => {
    return getFilteredPresets(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const handleSelectTopicPill = (topic: (typeof POPULAR_ACTIVITY_TOPICS)[0]) => {
    setSelectedTopicId(topic.id);
    setSelectedCategory(topic.category);
    setSearchQuery(topic.query);
    setActivePreset(null);
  };

  const handleCategoryDropdownChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setSelectedTopicId('');
    setSearchQuery('');
    setActivePreset(null);
  };

  const handleOpenTemplateCustomizer = (preset: ActivityPresetSuggestion) => {
    const cleanSchool =
      schoolName && schoolName.trim() && schoolName !== 'High School'
        ? schoolName.trim()
        : '';
    const personalizedOrg = cleanSchool
      ? preset.organization.replace(/^(School|High School)\s+/i, `${cleanSchool} `)
      : preset.organization;

    setActivePreset(preset);
    setCustomRole(preset.position.slice(0, 50));
    setCustomOrg(personalizedOrg.slice(0, 100));
    setSelectedAddOns([]);
    setCustomDescription(preset.description.slice(0, 150));
    setHoursPerWeek(
      preset.activityType.includes('Athletics') ||
        preset.activityType === 'Robotics'
        ? 8
        : 4
    );
    setWeeksPerYear(30);
  };

  const handleToggleAddOn = (addon: string) => {
    if (!activePreset) return;
    const exists = selectedAddOns.includes(addon);
    const nextAddOns = exists
      ? selectedAddOns.filter((a) => a !== addon)
      : [...selectedAddOns, addon];
    setSelectedAddOns(nextAddOns);

    if (nextAddOns.length === 0) {
      setCustomDescription(activePreset.description.slice(0, 150));
    } else {
      const baseFirstClause = activePreset.description
        .split(';')[0]
        .trim()
        .replace(/[;,.]+$/, '');
      const combined = `${baseFirstClause}; ${nextAddOns.join('; ')}.`;
      setCustomDescription(combined.slice(0, 150));
    }
  };

  const handleQuickAddTemplate = async () => {
    if (!activePreset) return;
    setSavingId(activePreset.id);
    try {
      const nextSlot =
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((s) => !usedSlots.includes(s)) ||
        0;
      await onQuickSaveActivity({
        activityType: activePreset.activityType,
        position: (customRole.trim() || activePreset.position).slice(0, 50),
        organization: (customOrg.trim() || activePreset.organization).slice(
          0,
          100
        ),
        description: (
          customDescription.trim() || activePreset.description
        ).slice(0, 150),
        extendedNotes:
          selectedAddOns.length > 0
            ? `Key Accomplishments & Responsibilities:\n• ${selectedAddOns.join('\n• ')}`
            : `Template Based On: ${activePreset.label}\n• ${activePreset.relatedAddOns.join('\n• ')}`,
        grades: [currentGrade],
        timing: 'School Year',
        hoursPerWeek,
        weeksPerYear,
        continueInCollege: true,
        commonAppSlot: nextSlot,
        impactScore: 5,
      });
      setSavedIds((prev) => ({ ...prev, [activePreset.id]: true }));
      setActivePreset(null);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-[#14233C] text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#E5C168]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dynamic Activity Template Suggestions</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white">
            Pick an Activity (Math Olympiad, Science Olympiad, Basketball, Volunteering &amp; More)
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl">
            Select any activity topic or Common App category below to see tailored role, organization, and 150-character description templates you can customize and add in one click.
          </p>
        </div>
      </div>

      {/* Activity Topic Pills + Category Dropdown + Keyword Search */}
      <div className="p-4 sm:p-5 bg-[#FAF8F4] border-b border-[#E6E1D8] space-y-3.5">
        {/* Popular Activity Pills */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6478] block mb-2">
            1. Choose Popular Activity Topic:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {POPULAR_ACTIVITY_TOPICS.map((topic) => {
              const active = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleSelectTopicPill(topic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#14233C] text-white border-[#14233C] shadow-2xs'
                      : 'bg-white text-[#14233C] border-[#E6E1D8] hover:border-[#14233C]/40'
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Or Filter by Common App Category / Custom Keyword */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A6478] mb-1">
              2. Or Filter by Activity Type (Common App Category):
            </label>
            <select
              aria-label="2. Or Filter by Activity Type (Common App Category)"
              value={selectedCategory}
              onChange={(e) => handleCategoryDropdownChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8] text-xs font-semibold text-[#14233C] focus:outline-none focus:border-[#14233C]"
            >
              {COMMON_APP_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A6478] mb-1">
              3. Search Specific Sport, Club, or Instrument:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5A6478] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedTopicId('');
                }}
                placeholder="Type e.g. math olympiad, science olympiad, basketball, volunteer..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E6E1D8] text-xs text-[#14233C] focus:outline-none focus:border-[#14233C]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Template Cards Grid */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {matchingTemplates.map((preset) => {
            const isSelected = activePreset?.id === preset.id;
            const isAlreadySaved = Boolean(savedIds[preset.id]);

            return (
              <div
                key={preset.id}
                onClick={() => handleOpenTemplateCustomizer(preset)}
                className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#FAF8F4] border-[#14233C] ring-2 ring-[#14233C]/15'
                    : 'bg-white hover:bg-[#FAF8F4]/70 border-[#E6E1D8]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wide">
                      {preset.activityType}
                    </span>
                    {isAlreadySaved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#276B4E] bg-[#2F7A5A]/10 px-2 py-0.5 rounded-md border border-[#2F7A5A]/30">
                        <Check className="w-3 h-3" />
                        Added
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#14233C]">
                        {isSelected ? 'Customizing ↓' : 'Select Template →'}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-[#7A5B1C]">
                      {preset.label}
                    </div>
                    <h4 className="text-sm font-bold text-[#14233C] mt-0.5">
                      {preset.position}
                    </h4>
                    <p className="text-xs text-[#5A6478] truncate">
                      {preset.organization}
                    </p>
                  </div>

                  <p className="text-xs text-[#14233C] bg-[#FAF8F4] p-2.5 rounded-xl border border-[#E6E1D8] leading-relaxed">
                    “{preset.description}”
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E6E1D8] flex items-center justify-between text-[11px] text-[#5A6478]">
                  <span>{preset.relatedAddOns.length} customizable bullets</span>
                  <span className="tabular-nums text-[#5A6478]">
                    {preset.description.length}/150 chars
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Customizer Drawer when a Template Card is clicked */}
        {activePreset && (
          <div className="rounded-2xl bg-[#FAF8F4] border-2 border-[#14233C] p-5 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6E1D8]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A5B1C]">
                  Customize Suggested Template · {activePreset.label}
                </span>
                <h4 className="text-base font-bold text-[#14233C]">
                  Tailor Your Role, Organization &amp; What You Did
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActivePreset(null)}
                className="text-xs font-semibold text-[#5A6478] hover:text-[#14233C] self-start sm:self-auto cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#14233C] mb-1">
                  Your Role / Position (max 50 chars)
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8] text-xs font-semibold text-[#14233C] focus:outline-none focus:border-[#14233C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14233C] mb-1">
                  Club, Team, or Organization Name (max 100 chars)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={customOrg}
                  onChange={(e) => setCustomOrg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D8] text-xs font-semibold text-[#14233C] focus:outline-none focus:border-[#14233C]"
                />
              </div>
            </div>

            {/* Clickable "What I Did" Add-Ons specific to this activity template */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#14233C]">
                Click to include specific accomplishments in your 150-character summary:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {activePreset.relatedAddOns.map((addon) => {
                  const checked = selectedAddOns.includes(addon);
                  return (
                    <button
                      key={addon}
                      type="button"
                      onClick={() => handleToggleAddOn(addon)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                        checked
                          ? 'bg-[#14233C] text-white border-[#14233C]'
                          : 'bg-white text-[#14233C] border-[#E6E1D8] hover:border-[#14233C]/40'
                      }`}
                    >
                      {checked ? (
                        <Check className="w-3.5 h-3.5 text-[#E5C168] shrink-0" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-[#14233C] shrink-0" />
                      )}
                      <span>{addon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live 150-Character Common App Description Preview & Editor */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-[#14233C]">
                  Common App 150-Character Activity Description
                </label>
                <span className="tabular-nums font-semibold text-[#14233C]">
                  {customDescription.length}/150 chars
                </span>
              </div>
              <input
                type="text"
                maxLength={150}
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E1D8] text-xs font-medium text-[#14233C] focus:outline-none focus:border-[#14233C]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E1D8]">
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 font-semibold text-[#14233C]">
                  <span>Hrs/Wk:</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={hoursPerWeek}
                    onChange={(e) =>
                      setHoursPerWeek(Math.max(1, Number(e.target.value) || 4))
                    }
                    className="w-16 px-2 py-1 rounded-lg bg-white border border-[#E6E1D8] tabular-nums text-xs text-[#14233C]"
                  />
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-[#14233C]">
                  <span>Wks/Yr:</span>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={weeksPerYear}
                    onChange={(e) =>
                      setWeeksPerYear(Math.max(1, Number(e.target.value) || 30))
                    }
                    className="w-16 px-2 py-1 rounded-lg bg-white border border-[#E6E1D8] tabular-nums text-xs text-[#14233C]"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onPrefillModal({
                      activityType: activePreset.activityType,
                      position: (
                        customRole.trim() || activePreset.position
                      ).slice(0, 50),
                      organization: (
                        customOrg.trim() || activePreset.organization
                      ).slice(0, 100),
                      description: (
                        customDescription.trim() || activePreset.description
                      ).slice(0, 150),
                      extendedNotes:
                        selectedAddOns.length > 0
                          ? `Key Accomplishments:\n• ${selectedAddOns.join('\n• ')}`
                          : `Key Accomplishments:\n• ${activePreset.relatedAddOns.join('\n• ')}`,
                      hoursPerWeek,
                      weeksPerYear,
                    });
                    setActivePreset(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] border border-[#E6E1D8] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Open in Full Editor</span>
                </button>

                <button
                  type="button"
                  disabled={savingId === activePreset.id}
                  onClick={handleQuickAddTemplate}
                  className="px-4 py-2 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {savingId === activePreset.id
                      ? 'Saving...'
                      : `Add to ${currentGrade}th Grade Portfolio`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
