import { ActivityItem, HonorAwardItem, JournalEntryItem, UserProfile } from './types';

export interface AchievementBadge {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  xpReward: number;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  unitLabel: string;
  emblemType:
    | 'spark'
    | 'chronicle'
    | 'bridge'
    | 'wordsmith'
    | 'century'
    | 'compass'
    | 'renaissance'
    | 'essay'
    | 'laureate'
    | 'commonapp';
  accentHex: string;
}

export function calculateActivityTotalHours(activity: ActivityItem): number {
  const yearsCount = Math.max(1, activity.grades.length);
  return Math.round(activity.hoursPerWeek * activity.weeksPerYear * yearsCount);
}

export function calculateStudentLevel(
  xp: number,
  currentGrade?: number
): {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const gradePrefix =
    typeof currentGrade === 'number' && currentGrade >= 6 && currentGrade <= 12
      ? `${currentGrade}th Grade`
      : 'Portfolio';
  const trailblazerPrefix =
    typeof currentGrade === 'number' && currentGrade >= 9
      ? 'High School'
      : typeof currentGrade === 'number' && currentGrade <= 8
        ? 'Middle School'
        : 'Portfolio';

  const levels = [
    { level: 1, title: `${gradePrefix} Explorer`, minXp: 0 },
    { level: 2, title: 'Curiosity Pathfinder', minXp: 250 },
    { level: 3, title: 'Club Apprentice', minXp: 600 },
    { level: 4, title: `${trailblazerPrefix} Trailblazer`, minXp: 1000 },
    { level: 5, title: 'Varsity Builder', minXp: 1450 },
    { level: 6, title: 'Community Catalyst', minXp: 2000 },
    { level: 7, title: 'Impact Architect', minXp: 2700 },
    { level: 8, title: 'Common App Scholar', minXp: 3500 },
  ];

  let current = levels[0];
  let next = levels[1];

  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].minXp) {
      current = levels[i];
      next = levels[i + 1] || { level: levels[i].level + 1, title: 'Distinguished Fellow', minXp: levels[i].minXp + 1000 };
    }
  }

  const span = Math.max(1, next.minXp - current.minXp);
  const intoLevel = Math.max(0, xp - current.minXp);
  const progressPercent = Math.min(100, Math.round((intoLevel / span) * 100));

  return {
    level: current.level,
    title: current.title,
    currentLevelXp: intoLevel,
    nextLevelXp: span,
    progressPercent,
  };
}

export function evaluateBadges(
  profile: UserProfile,
  activities: ActivityItem[],
  journals: JournalEntryItem[],
  honors: HonorAwardItem[]
): AchievementBadge[] {
  // 1. First Spark: Log at least 1 activity
  const actCount = activities.length;

  // 2. 7-Day Chronicle: Streak >= 7 or 7+ distinct manual journal reflection entries
  // Exclude auto-synced activity memories (jrn_act_*) so an activity note doesn't inflate the daily reflection streak count
  const manualJournals = journals.filter(
    (j) => !j.id.startsWith('jrn_act_') && j.promptUsed !== 'Activity Reflection'
  );
  const streakCount = Math.max(profile.streakDays || 0, manualJournals.length);

  // 3. Middle-to-High Bridge: An activity spanning at least one Middle School grade (6-8) and one High School grade (9-12)
  const bridgeActivities = activities.filter(
    (a) => a.grades.some((g) => g <= 8) && a.grades.some((g) => g >= 9)
  );

  // 4. 150-Character Wordsmith: Activity with description between 110 and 150 chars and no unreplaced bracketed placeholders (e.g. "[#]")
  const wordsmithActivities = activities.filter((a) => {
    const desc = a.description.trim();
    return (
      desc.length >= 110 &&
      desc.length <= 150 &&
      !/\[[^\]]+\]/.test(desc)
    );
  });

  // 5. Century Club: Total cumulative hours across community service or any single activity >= 100
  const maxSingleActivityHours = activities.reduce(
    (max, a) => Math.max(max, calculateActivityTotalHours(a)),
    0
  );

  // 6. Leadership Compass: Activity with leadership keywords in position
  const leadershipKeywords = ['founder', 'captain', 'president', 'lead', 'chair', 'director', 'editor', 'mentor', 'coordinator'];
  const leadershipCount = activities.filter((a) =>
    leadershipKeywords.some((kw) => a.position.toLowerCase().includes(kw))
  ).length;

  // 7. Renaissance Explorer: Distinct Common App activity categories >= 4
  const distinctCategories = new Set(activities.map((a) => a.activityType)).size;

  // 8. Essay Treasure Hunter: Journal entries bookmarked as Essay Seeds >= 2
  const essaySeedsCount = journals.filter((j) => j.isEssaySeed).length;

  // 9. Honors Laureate: Honors logged >= 2
  const honorsCount = honors.length;

  // 10. Common App Deck Ready: Activities assigned to Common App Top 10 slots (1..10) >= 5
  const slottedActivitiesCount = activities.filter(
    (a) => a.commonAppSlot >= 1 && a.commonAppSlot <= 10
  ).length;

  return [
    {
      id: 'badge_first_spark',
      name: 'First Spark',
      subtitle: '6th–12th Activity Pioneer',
      description: 'Record your first club, sport, art project, or volunteer activity in your portfolio.',
      xpReward: 100,
      unlocked: actCount >= 1,
      progressCurrent: Math.min(1, actCount),
      progressTarget: 1,
      unitLabel: 'activity',
      emblemType: 'spark',
      accentHex: '#D97706',
    },
    {
      id: 'badge_chronicle_7',
      name: '7-Day Chronicle',
      subtitle: 'Consistent Daily Reflector',
      description: 'Maintain a 7-day journal reflection streak or record 7 milestone entries.',
      xpReward: 200,
      unlocked: streakCount >= 7,
      progressCurrent: Math.min(7, streakCount),
      progressTarget: 7,
      unitLabel: 'days',
      emblemType: 'chronicle',
      accentHex: '#0D9488',
    },
    {
      id: 'badge_middle_high_bridge',
      name: '6th-to-High Bridge',
      subtitle: 'Multi-Year Continuity',
      description: 'Sustain a passion that started in Middle School (Grades 6–8) into High School (Grades 9–12).',
      xpReward: 250,
      unlocked: bridgeActivities.length >= 1,
      progressCurrent: Math.min(1, bridgeActivities.length),
      progressTarget: 1,
      unitLabel: 'multi-era activity',
      emblemType: 'bridge',
      accentHex: '#14233C',
    },
    {
      id: 'badge_wordsmith_150',
      name: '150-Char Wordsmith',
      subtitle: 'Common App Impact Master',
      description: 'Craft 3 activity descriptions between 110–150 characters packed with action verbs and numbers.',
      xpReward: 200,
      unlocked: wordsmithActivities.length >= 3,
      progressCurrent: Math.min(3, wordsmithActivities.length),
      progressTarget: 3,
      unitLabel: 'crafted descriptions',
      emblemType: 'wordsmith',
      accentHex: '#2B4C8C',
    },
    {
      id: 'badge_century_hours',
      name: 'Century Milestone',
      subtitle: '100+ Cumulative Hours',
      description: 'Invest 100 or more cumulative hours into a single longitudinal activity across grades.',
      xpReward: 300,
      unlocked: maxSingleActivityHours >= 100,
      progressCurrent: Math.min(100, maxSingleActivityHours),
      progressTarget: 100,
      unitLabel: 'hours',
      emblemType: 'century',
      accentHex: '#16A34A',
    },
    {
      id: 'badge_leadership_compass',
      name: 'Leadership Compass',
      subtitle: 'Initiative & Mentorship',
      description: 'Hold 2+ leadership, founder, captain, mentor, or coordinator roles across your activities.',
      xpReward: 250,
      unlocked: leadershipCount >= 2,
      progressCurrent: Math.min(2, leadershipCount),
      progressTarget: 2,
      unitLabel: 'leadership roles',
      emblemType: 'compass',
      accentHex: '#B45309',
    },
    {
      id: 'badge_renaissance',
      name: 'Renaissance Scholar',
      subtitle: 'Cross-Disciplinary Curiosity',
      description: 'Explore 4 or more distinct Common App categories (e.g., Robotics, Music, Service, Athletics).',
      xpReward: 200,
      unlocked: distinctCategories >= 4,
      progressCurrent: Math.min(4, distinctCategories),
      progressTarget: 4,
      unitLabel: 'categories',
      emblemType: 'renaissance',
      accentHex: '#0F766E',
    },
    {
      id: 'badge_essay_seeds',
      name: 'Essay Seed Collector',
      subtitle: 'Personal Statement Vault',
      description: 'Bookmark at least 2 daily journal memories as future Common App Personal Statement seeds.',
      xpReward: 180,
      unlocked: essaySeedsCount >= 2,
      progressCurrent: Math.min(2, essaySeedsCount),
      progressTarget: 2,
      unitLabel: 'essay seeds',
      emblemType: 'essay',
      accentHex: '#9333EA',
    },
    {
      id: 'badge_honors_laureate',
      name: 'Honors Laureate',
      subtitle: 'Academic & Competition Distinction',
      description: 'Record 2 or more school, regional, state, or national honors in your Common App Honors vault.',
      xpReward: 220,
      unlocked: honorsCount >= 2,
      progressCurrent: Math.min(2, honorsCount),
      progressTarget: 2,
      unitLabel: 'honors',
      emblemType: 'laureate',
      accentHex: '#CA8A04',
    },
    {
      id: 'badge_commonapp_ready',
      name: 'Common App Deck Ready',
      subtitle: 'Official Top-10 Portfolio',
      description: 'Rank at least 5 complete activities into your Official Common App Priority Slots (#1–#10).',
      xpReward: 350,
      unlocked: slottedActivitiesCount >= 5,
      progressCurrent: Math.min(5, slottedActivitiesCount),
      progressTarget: 5,
      unitLabel: 'ranked slots',
      emblemType: 'commonapp',
      accentHex: '#14233C',
    },
  ];
}
