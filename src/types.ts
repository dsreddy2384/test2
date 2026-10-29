export type GradeLevel = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const ALL_GRADES: GradeLevel[] = [6, 7, 8, 9, 10, 11, 12];

export function getDefaultGradYearForGrade(grade: GradeLevel): number {
  // 2026–2027 school year: 12th=2027, 11th=2028, 10th=2029, 9th=2030, 8th=2031, 7th=2032, 6th=2033
  return 2027 + (12 - grade);
}

export const GRADE_LABELS: Record<GradeLevel, { title: string; era: string; focus: string }> = {
  6: {
    title: '6th Grade',
    era: 'Middle School Discovery',
    focus: 'Try clubs, instruments, sports, and curiosity projects without pressure.',
  },
  7: {
    title: '7th Grade',
    era: 'Middle School Exploration',
    focus: 'Build consistent weekly habits and discover which activities energize you.',
  },
  8: {
    title: '8th Grade',
    era: 'High School Bridge',
    focus: 'Step into peer mentorship and select core passions to carry into 9th grade.',
  },
  9: {
    title: '9th Grade',
    era: 'Common App Window Opens',
    focus: 'Official Common App tracking begins. Join high school teams and clubs.',
  },
  10: {
    title: '10th Grade',
    era: 'Depth & Initiative',
    focus: 'Take on committee roles, summer projects, and community service milestones.',
  },
  11: {
    title: '11th Grade',
    era: 'Leadership & Impact',
    focus: 'Lead organizations, quantify measurable impact, and bookmark essay seeds.',
  },
  12: {
    title: '12th Grade',
    era: 'College Application Launch',
    focus: 'Finalize your Top 10 Common App Activities, 5 Honors, and Personal Statement.',
  },
};

export const COMMON_APP_CATEGORIES = [
  'Academic',
  'Art',
  'Athletics: Club',
  'Athletics: JV/Varsity',
  'Career Oriented',
  'Community Service (Volunteer)',
  'Computer/Technology',
  'Cultural',
  'Dance',
  'Debate/Speech',
  'Environmental',
  'Family Responsibilities',
  'Foreign Exchange',
  'Internship',
  'Journalism/Publication',
  'Junior R.O.T.C.',
  'LGBT',
  'Music: Instrumental',
  'Music: Vocal',
  'Religious',
  'Research',
  'Robotics',
  'School Spirit',
  'Science/Math',
  'Social Justice',
  'Student Govt./Politics',
  'Theater/Drama',
  'Work (Paid)',
  'Other Club/Activity',
] as const;

export type ParticipationTiming = 'School Year' | 'School Break' | 'All Year';

export type JournalMood = 'Energized' | 'Proud' | 'Curious' | 'Challenged' | 'Grateful';

export type RecognitionLevel = 'School' | 'State/Regional' | 'National' | 'International';

export const IMPACT_SCORE_LABELS: Record<
  number,
  { label: string; desc: string; colorClass: string }
> = {
  1: {
    label: 'Exploring',
    desc: 'Tried something new & curious',
    colorClass: 'text-[#5A6478]',
  },
  2: {
    label: 'Developing',
    desc: 'Built steady weekly habits',
    colorClass: 'text-[#14233C]',
  },
  3: {
    label: 'Meaningful',
    desc: 'Valuable part of my school year',
    colorClass: 'text-[#14233C]',
  },
  4: {
    label: 'Core Passion',
    desc: 'Shaped my skills & confidence',
    colorClass: 'text-[#8A6820]',
  },
  5: {
    label: 'Transformative',
    desc: 'Defining milestone of my growth',
    colorClass: 'text-[#2F7A5A]',
  },
};

export interface StudentChildProfile {
  id: string;
  name: string;
  grade: GradeLevel;
  gradYear: number;
  schoolName: string;
  cityState: string;
  studentEmail?: string;
  curriculumType?: CurriculumType;
  unweightedGpa?: string;
  weightedGpa?: string;
  classRank?: string;
  satActScore?: string;
  intendedMajors?: string;
  careerInterests?: string;
  dreamColleges?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  currentGrade: GradeLevel;
  gradYear: number;
  dreamColleges: string;
  streakDays: number;
  xp: number;
  lastCheckInDate: string;
}

export interface ActivityItem {
  id: string;
  ownerId: string;
  activityType: string;
  position: string; // max 50 chars (Common App)
  organization: string; // max 100 chars (Common App)
  description: string; // max 150 chars (Common App)
  extendedNotes: string; // up to 2000 chars for personal reflection & memories
  grades: GradeLevel[]; // 6-12
  timing: ParticipationTiming;
  hoursPerWeek: number;
  weeksPerYear: number;
  continueInCollege: boolean;
  commonAppSlot: number; // 0 = not in top 10, 1..10 = priority slot
  impactScore: number; // 1..5 rating of how meaningful this activity was to personal growth
  studentId?: string;
  studentName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface JournalEntryItem {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  promptUsed: string;
  gradeLevel: GradeLevel;
  linkedActivityId: string;
  linkedActivityTitle: string;
  mood: JournalMood;
  hoursLogged: number;
  isEssaySeed: boolean;
  entryDate: string; // YYYY-MM-DD
  studentId?: string;
  studentName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface HonorAwardItem {
  id: string;
  ownerId: string;
  title: string; // max 100 chars (Common App)
  gradeLevel: GradeLevel;
  recognitionLevel: RecognitionLevel;
  commonAppRank: number; // 0 = unslotted, 1..5 = Common App Top 5 Honors
  notes: string;
  awardDate: string;
  studentId?: string;
  studentName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export const JOURNAL_PROMPTS: { label: string; prompt: string; category: string }[] = [
  {
    label: 'Breakthrough Moment',
    prompt: 'What was something hard you figured out today at practice, club, or class?',
    category: 'Growth',
  },
  {
    label: 'Helping Someone',
    prompt: 'Describe a specific moment today when you encouraged, taught, or helped a teammate or neighbor.',
    category: 'Leadership',
  },
  {
    label: 'Curiosity Spark',
    prompt: 'What question or topic made you lose track of time this week, and what did you build or read?',
    category: 'Intellectual Vitality',
  },
  {
    label: 'Mistake -> Lesson',
    prompt: 'What didn’t go according to plan recently, and how did you adapt or fix it?',
    category: 'Resilience',
  },
  {
    label: 'Behind the Scenes',
    prompt: 'What is a small detail about your favorite activity that nobody sees from the outside?',
    category: 'Essay Seed',
  },
];

export const ACTION_VERBS_BY_ROLE: Record<string, string[]> = {
  Leadership: ['Founded', 'Spearheaded', 'Chaired', 'Directed', 'Coordinated', 'Mobilized', 'Mentored'],
  STEM_Creation: ['Engineered', 'Programmed', 'Prototyped', 'Analyzed', 'Automated', 'Researched', 'Designed'],
  Service_Community: ['Organized', 'Advocated', 'Tutored', 'Raised', 'Distributed', 'Partnered', 'Cultivated'],
  Arts_Athletics: ['Performed', 'Choreographed', 'Composed', 'Competed', 'Captained', 'Trained', 'Curated'],
};

export const INITIAL_DEMO_PROFILE: UserProfile = {
  uid: 'demo_student',
  displayName: 'Jordan',
  currentGrade: 10,
  gradYear: 2029,
  dreamColleges: 'MIT, Stanford, UC Berkeley, Georgia Tech',
  streakDays: 12,
  xp: 1480,
  lastCheckInDate: new Date().toISOString().slice(0, 10),
};

export const INITIAL_DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act_robotics_1',
    ownerId: 'demo_student',
    activityType: 'Robotics',
    position: 'Lead Autonomous Programmer & Middle School Mentor',
    organization: 'Oakridge VEX & FIRST Robotics Team 4092',
    description: 'Programmed C++ vision-sensor autonomous routines; mentored 18 6th-8th grade rookies; qualified for State Championship 2x.',
    extendedNotes: 'Started in 6th grade Lego League building a solar-powered sorting crane. In 8th grade I learned PID control loops, and by 10th grade I took over leading Saturday coding workshops for younger middle schoolers.',
    grades: [6, 7, 8, 9, 10],
    timing: 'School Year',
    hoursPerWeek: 8,
    weeksPerYear: 34,
    continueInCollege: true,
    commonAppSlot: 1,
    impactScore: 5,
  },
  {
    id: 'act_service_2',
    ownerId: 'demo_student',
    activityType: 'Community Service (Volunteer)',
    position: 'Co-Founder & Weekend STEM Kit Designer',
    organization: 'Kitchen Table Science Kits (Local Library Branch)',
    description: 'Designed 14 low-cost hands-on physics kits; assembled & distributed 640+ kits to Title I elementary students; led monthly demos.',
    extendedNotes: 'Began during 7th grade summer break when my younger cousin wanted science experiments we could do with household items. Our public librarian helped us turn it into a monthly Saturday workshop.',
    grades: [7, 8, 9, 10],
    timing: 'All Year',
    hoursPerWeek: 4,
    weeksPerYear: 40,
    continueInCollege: true,
    commonAppSlot: 2,
    impactScore: 5,
  },
  {
    id: 'act_athletics_3',
    ownerId: 'demo_student',
    activityType: 'Athletics: JV/Varsity',
    position: 'Basketball Team Player & Varsity Track Runner',
    organization: 'Oakridge Basketball & Track Club',
    description: 'Played Guard across 22 winter basketball games & ran spring 1600m track; led summer freshman conditioning; 4.0 Scholar-Athlete.',
    extendedNotes: 'Joined middle school basketball and cross country in 6th grade to build stamina and teamwork. Learning how to communicate on defense and encourage teammates after tough losses taught me resilience.',
    grades: [6, 7, 8, 9, 10],
    timing: 'School Year',
    hoursPerWeek: 10,
    weeksPerYear: 28,
    continueInCollege: true,
    commonAppSlot: 3,
    impactScore: 4,
  },
  {
    id: 'act_music_4',
    ownerId: 'demo_student',
    activityType: 'Music: Instrumental',
    position: 'First Chair Cello & Chamber Quartet Coordinator',
    organization: 'Youth Symphony Orchestra & School Strings',
    description: 'Performed 12 concerts annually; arranged videogame & film scores for string quartet at senior living centers (45+ hrs).',
    extendedNotes: 'Started cello in 6th grade orchestra. My favorite memory was arranging Joe Hisaishi melodies for our quartet to play at Sunrise Senior Living.',
    grades: [6, 7, 8, 9, 10],
    timing: 'School Year',
    hoursPerWeek: 5,
    weeksPerYear: 36,
    continueInCollege: true,
    commonAppSlot: 4,
    impactScore: 4,
  },
  {
    id: 'act_journalism_5',
    ownerId: 'demo_student',
    activityType: 'Journalism/Publication',
    position: 'Data Visualization & Science Columnist',
    organization: 'The Oakridge Chronicle (Student Newspaper)',
    description: 'Published 16 interactive articles on local watershed quality, school lunch composting, and solar microgrids; 2,400+ readers.',
    extendedNotes: 'Joined in 9th grade to combine coding charts with environmental reporting.',
    grades: [9, 10],
    timing: 'School Year',
    hoursPerWeek: 3,
    weeksPerYear: 32,
    continueInCollege: false,
    commonAppSlot: 5,
    impactScore: 3,
  },
];

export const INITIAL_DEMO_JOURNALS: JournalEntryItem[] = [
  {
    id: 'j_demo_1',
    ownerId: 'demo_student',
    title: 'When the 6th-graders fixed the flywheel jam on their own',
    content: 'At Saturday robotics lab, a group of 6th graders kept having their intake gears slip. Instead of grabbing the wrench and fixing it for them like I used to in 8th grade, I drew how gear ratios transfer torque on the whiteboard and asked them what happens when the axle spacing widens. Watching their faces light up when they braced the C-channel themselves made me realize teaching is way more rewarding than building solo.',
    promptUsed: 'Describe a specific moment today when you encouraged, taught, or helped a teammate or neighbor.',
    gradeLevel: 10,
    linkedActivityId: 'act_robotics_1',
    linkedActivityTitle: 'Oakridge VEX & FIRST Robotics Team 4092',
    mood: 'Proud',
    hoursLogged: 3.5,
    isEssaySeed: true,
    entryDate: '2026-10-15',
  },
  {
    id: 'j_demo_2',
    ownerId: 'demo_student',
    title: 'Paper bridge challenge at the Eastside Library',
    content: 'We tested our new Kitchen Table Science kit using only index cards, masking tape, and pennies. One 4th-grade girl folded her index cards into triangular trusses and held 142 pennies before buckling! I wrote down her folding pattern so we can include it in next month’s printed booklet.',
    promptUsed: 'What is a small detail about your favorite activity that nobody sees from the outside?',
    gradeLevel: 9,
    linkedActivityId: 'act_service_2',
    linkedActivityTitle: 'Kitchen Table Science Kits (Local Library Branch)',
    mood: 'Energized',
    hoursLogged: 2.5,
    isEssaySeed: true,
    entryDate: '2025-11-08',
  },
  {
    id: 'j_demo_3',
    ownerId: 'demo_student',
    title: 'First 6th Grade Cello Recital — Dropped My Rosin!',
    content: 'My hands were sweating so much before playing Minuet No. 2 that I dropped my rosin right off the stage steps and it shattered into powder. My orchestra teacher whispered that every cellist breaks at least one cake of rosin a year. I played through the whole piece without rushing the tempo.',
    promptUsed: 'What didn’t go according to plan recently, and how did you adapt or fix it?',
    gradeLevel: 6,
    linkedActivityId: 'act_music_4',
    linkedActivityTitle: 'Youth Symphony Orchestra & School Strings',
    mood: 'Challenged',
    hoursLogged: 2,
    isEssaySeed: false,
    entryDate: '2023-04-19',
  },
  {
    id: 'j_demo_4',
    ownerId: 'demo_student',
    title: 'Comunicating on Defense & Encouraging Teammates After a Tough Loss',
    content: 'Joined middle school basketball and cross country in 6th grade to build stamina and teamwork. Learning how to communicate on defense and encourage teammates after tough losses taught me resilience.',
    promptUsed: 'Activity Reflection',
    gradeLevel: 10,
    linkedActivityId: 'act_athletics_3',
    linkedActivityTitle: 'Oakridge Basketball & Track Club',
    mood: 'Proud',
    hoursLogged: 2,
    isEssaySeed: false,
    entryDate: '2026-02-14',
  },
  {
    id: 'j_demo_5',
    ownerId: 'demo_student',
    title: 'Combining Coding Charts with Local Watershed Reporting',
    content: 'Joined in 9th grade to combine coding charts with environmental reporting for The Oakridge Chronicle.',
    promptUsed: 'Activity Reflection',
    gradeLevel: 9,
    linkedActivityId: 'act_journalism_5',
    linkedActivityTitle: 'The Oakridge Chronicle (Student Newspaper)',
    mood: 'Curious',
    hoursLogged: 1.5,
    isEssaySeed: false,
    entryDate: '2025-09-22',
  },
];

export const INITIAL_DEMO_HONORS: HonorAwardItem[] = [
  {
    id: 'h_demo_1',
    ownerId: 'demo_student',
    title: 'VEX Robotics State Championship — Think Award (Autonomous Coding)',
    gradeLevel: 10,
    recognitionLevel: 'State/Regional',
    commonAppRank: 1,
    notes: 'Awarded to the team with the most consistent, well-documented autonomous sensor programming.',
    awardDate: '2026-03-14',
  },
  {
    id: 'h_demo_2',
    ownerId: 'demo_student',
    title: 'President’s Volunteer Service Award — Gold Medal (100+ Annual Hours)',
    gradeLevel: 9,
    recognitionLevel: 'National',
    commonAppRank: 2,
    notes: 'Recognized for 160 hours building and teaching Kitchen Table Science Kits at public libraries.',
    awardDate: '2025-05-20',
  },
  {
    id: 'h_demo_3',
    ownerId: 'demo_student',
    title: 'AMC 8 & AMC 10 School Honor Roll Distinction',
    gradeLevel: 8,
    recognitionLevel: 'School',
    commonAppRank: 3,
    notes: 'Top scorer in 8th grade math competition; transitioned to High School Math Circle in 9th grade.',
    awardDate: '2024-02-11',
  },
];

export type CurriculumType =
  | 'AP / Honors'
  | 'IB Diploma'
  | 'Dual Enrollment'
  | 'Standard College Prep'
  | 'Magnet / STEM';

export type HouseholdStructureType =
  | 'Both Parents'
  | 'Single Parent'
  | 'Blended Family'
  | 'Legal Guardian'
  | 'Other';

export type Parent1RelationshipType =
  | 'Mother'
  | 'Father'
  | 'Stepmother'
  | 'Stepfather'
  | 'Legal Guardian'
  | 'Other';

export type Parent2RelationshipType =
  | 'Father'
  | 'Mother'
  | 'Stepfather'
  | 'Stepmother'
  | 'Legal Guardian'
  | 'None / N/A'
  | 'Other';

export interface FamilyProfileItem {
  ownerId: string;
  studentFullName: string;
  preferredName: string;
  highSchoolName: string;
  highSchoolCityState: string;
  curriculumType: CurriculumType;
  unweightedGpa: string;
  weightedGpa: string;
  classRank: string;
  satActScore: string;
  intendedMajors: string;
  careerInterests: string;
  householdStructure: HouseholdStructureType;
  firstGenerationCollege: boolean;
  languagesSpokenAtHome: string;
  feeWaiverEligible: boolean;
  parent1Name: string;
  parent1Relationship: Parent1RelationshipType;
  parent1Education: string;
  parent1AlmaMater: string;
  parent1Occupation: string;
  parent2Name: string;
  parent2Relationship: Parent2RelationshipType;
  parent2Education: string;
  parent2AlmaMater: string;
  parent2Occupation: string;
  siblingsCount: number;
  siblingsSummary: string;
  familyResponsibilitiesNotes: string;
  homeZipCode?: string;
  accountRole?: 'Student' | 'Parent / Guardian';
  studentEmail?: string;
  parentEmail?: string;
  parent2Email?: string;
  familyShareCode?: string;
  activeStudentId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const INITIAL_DEMO_FAMILY_PROFILE: FamilyProfileItem = {
  ownerId: 'demo_student',
  studentFullName: 'Jordan Alexander Rivera',
  preferredName: 'Jordan',
  highSchoolName: 'Oakridge Preparatory High School',
  highSchoolCityState: 'Austin, TX',
  curriculumType: 'AP / Honors',
  unweightedGpa: '3.94 / 4.00',
  weightedGpa: '4.42 / 5.00',
  classRank: 'Top 5% (18 of 412)',
  satActScore: '1520 SAT (780 Math / 740 RW)',
  intendedMajors: 'Robotics Engineering, Computer Science',
  careerInterests: 'Autonomous Systems, STEM Education Equity',
  householdStructure: 'Both Parents',
  firstGenerationCollege: false,
  languagesSpokenAtHome: 'English, Spanish',
  feeWaiverEligible: false,
  parent1Name: 'Elena Maria Rivera',
  parent1Relationship: 'Mother',
  parent1Education: 'Masters Degree',
  parent1AlmaMater: 'University of Texas at Austin (M.Ed. 2006)',
  parent1Occupation: 'Public Elementary School Reading Specialist',
  parent2Name: 'David Carlos Rivera',
  parent2Relationship: 'Father',
  parent2Education: 'Bachelors Degree',
  parent2AlmaMater: 'Texas A&M University (B.S. Mechanical Engineering 2004)',
  parent2Occupation: 'Manufacturing Operations Engineer',
  siblingsCount: 1,
  siblingsSummary: 'Maya Rivera (Age 13, 8th Grade at Oakridge Middle School)',
  familyResponsibilitiesNotes:
    'Help younger sister with math/science homework 4 afternoons a week and assist grandparents with bilingual technology setup on weekends.',
  homeZipCode: '78701',
  accountRole: 'Parent / Guardian',
  studentEmail: 'jordan.rivera.student@gmail.com',
  parentEmail: 'elena.rivera.parent@gmail.com',
  parent2Email: 'david.rivera.parent@gmail.com',
  familyShareCode: 'PF-78701-RIVERA',
};

export const COMMON_APP_ESSAY_PROMPTS: string[] = [
  '1. Background, identity, interest, or talent so meaningful your application would be incomplete without it.',
  '2. Lessons we take from obstacles we encounter can be fundamental to later success.',
  '3. Reflect on a time when you questioned or challenged a belief or idea.',
  '4. Reflect on something that someone has done for you that has made you happy or thankful in a surprising way.',
  '5. Discuss an accomplishment, event, or realization that sparked a period of personal growth.',
  '6. Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time.',
  '7. Share an essay on any topic of your choice (or Supplemental Why Major / Community Essay).',
];

export interface EssayDraftItem {
  id: string;
  ownerId: string;
  versionTitle: string;
  promptId: string;
  promptText: string;
  essayText: string;
  wordCount: number;
  overallScore: number;
  takeawaySummary: string;
  savedDate: string;
  studentId?: string;
  studentName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const INITIAL_DEMO_ESSAY_DRAFTS: EssayDraftItem[] = [
  {
    id: 'draft_demo_1',
    ownerId: 'demo_student',
    versionTitle: 'Draft v1 — Stripped Bevel Gear & Teaching 7th Graders',
    promptId: 'prompt_2',
    promptText: COMMON_APP_ESSAY_PROMPTS[1],
    essayText:
      'Twenty minutes before Qualification Match #4, the metallic crunch of a stripped bevel gear echoed across our pit table. In 8th grade, I would have grabbed the wrench myself and shut everyone else out to fix it faster. Instead, I handed the Allen key to our newest 7th-grade builder, pointed to the CAD exploded view on my laptop, and talked her through aligning the replacement shaft collar.\n\nWatching her eyes light up when the intake spun cleanly at 600 RPM taught me something no trophy could: engineering leadership is not about being the only person who knows the answer—it is about designing a workshop where everyone trusts their own hands.',
    wordCount: 112,
    overallScore: 91,
    takeawaySummary:
      'Strong opening scene in the robotics pit with clear personal growth from solo fixer to patient mentor.',
    savedDate: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
  },
];

export type CollegeSelectivityCategory = 'Reach' | 'Target' | 'Safety';

export type CollegeApplicationRound =
  | 'Early Action (EA)'
  | 'Early Decision (ED)'
  | 'Restrictive EA'
  | 'Regular Decision (RD)'
  | 'Rolling';

export type CollegeApplicationStatus =
  | 'Researching'
  | 'Drafting Essays'
  | 'Ready to Submit'
  | 'Submitted';

export interface CollegeDeadlineItem {
  id: string;
  ownerId: string;
  collegeName: string;
  category: CollegeSelectivityCategory;
  appRound: CollegeApplicationRound;
  deadlineDate: string;
  status: CollegeApplicationStatus;
  intendedMajor: string;
  supplementalStatus: string;
  studentId?: string;
  studentName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function futureDemoDate(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * 86400000).toISOString().slice(0, 10);
}

export const INITIAL_DEMO_COLLEGE_DEADLINES: CollegeDeadlineItem[] = [
  {
    id: 'col_demo_1',
    ownerId: 'demo_student',
    collegeName: 'Georgia Institute of Technology',
    category: 'Reach',
    appRound: 'Early Action (EA)',
    deadlineDate: futureDemoDate(28),
    status: 'Drafting Essays',
    intendedMajor: 'Mechanical & Robotics Engineering',
    supplementalStatus: 'Why Georgia Tech (300 words) — Draft 1 complete',
  },
  {
    id: 'col_demo_2',
    ownerId: 'demo_student',
    collegeName: 'University of Texas at Austin',
    category: 'Target',
    appRound: 'Early Action (EA)',
    deadlineDate: futureDemoDate(18),
    status: 'Ready to Submit',
    intendedMajor: 'Electrical & Computer Engineering',
    supplementalStatus: '3 Short Answer Supplements (250w each) — Polished',
  },
  {
    id: 'col_demo_3',
    ownerId: 'demo_student',
    collegeName: 'Purdue University',
    category: 'Target',
    appRound: 'Early Action (EA)',
    deadlineDate: futureDemoDate(35),
    status: 'Drafting Essays',
    intendedMajor: 'First-Year Engineering (FYE)',
    supplementalStatus: 'Why Purdue & Why Major (250w each) — Outlined',
  },
  {
    id: 'col_demo_4',
    ownerId: 'demo_student',
    collegeName: 'Texas A&M University',
    category: 'Safety',
    appRound: 'Rolling',
    deadlineDate: futureDemoDate(52),
    status: 'Submitted',
    intendedMajor: 'General Engineering',
    supplementalStatus: 'Top 10% TX Auto-Admit (~63% Overall Admit Rate) — Engineering Essay submitted',
  },
];

export type CompetitionEventCategory =
  | 'All'
  | 'Chess'
  | 'District Math'
  | 'Robotics'
  | 'Science & STEM'
  | 'Debate & Speech'
  | 'Coding & CS'
  | 'Athletics & Arts';

export interface CompletedSchoolEvent {
  id: string;
  title: string;
  category: Exclude<CompetitionEventCategory, 'All'>;
  activityType: string;
  organizer: string;
  completedDate: string; // YYYY-MM-DD (always within [today - 30 days, today])
  completedDateFormatted: string;
  daysAgo: number;
  locationScope: string;
  status: 'Completed';
  defaultRoles: string[];
  whatIDidPrompts: string[];
  defaultHoursPerWeek: number;
  defaultWeeksPerYear: number;
  isLiveWebResult?: boolean;
  sourceUrl?: string;
  sourceTitle?: string;
}

function formatPastDate(daysAgo: number): { iso: string; formatted: string } {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, Math.min(30, daysAgo)));
  const iso = d.toISOString().slice(0, 10);
  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { iso, formatted };
}

export function getRecentCompletedSchoolEvents(
  schoolName = 'Oakridge Preparatory',
  districtOrCity = 'Austin ISD / Regional District',
  zipCode = '78701'
): CompletedSchoolEvent[] {
  const cleanSchool = schoolName.trim() || 'High School';
  const cleanZip = zipCode.trim();
  const baseDistrict = districtOrCity.trim() || 'School District';
  const cleanDistrict = cleanZip
    ? `${baseDistrict} (ZIP ${cleanZip})`
    : baseDistrict;

  const rawEvents: Array<
    Omit<CompletedSchoolEvent, 'completedDate' | 'completedDateFormatted' | 'status'>
  > = [
    {
      id: 'evt_chess_district_1',
      title: `${cleanDistrict} Scholastic Chess Championship`,
      category: 'Chess',
      activityType: 'Academic',
      organizer: `${cleanDistrict} Scholastic Chess Federation & ${cleanSchool} Chess Club`,
      daysAgo: 2,
      locationScope: 'School District-Wide (Completed)',
      defaultRoles: [
        'Varsity Board 1–4 Player',
        'JV Tournament Competitor',
        'Team Captain & Tactician',
        'Club Representative',
      ],
      whatIDidPrompts: [
        'Competed in 5 Swiss-system rounds (G/25 d5 time control)',
        'Won 4 of 5 matches playing Board 2 for school team',
        'Helped school squad finish Top 3 in District Varsity division',
        'Analyzed post-game PGN notation and endgame tactics with teammates',
        'Mentored younger middle/freshman players between tournament rounds',
      ],
      defaultHoursPerWeek: 4,
      defaultWeeksPerYear: 28,
    },
    {
      id: 'evt_math_district_1',
      title: `${cleanDistrict} Inter-School Math League & AMC Prep Meet`,
      category: 'District Math',
      activityType: 'Science/Math',
      organizer: `${cleanDistrict} Mathematics Council & Mu Alpha Theta`,
      daysAgo: 4,
      locationScope: 'District-Wide Math Competition (Completed)',
      defaultRoles: [
        'Varsity Mathlete',
        'Team Ciphering Specialist',
        'Number Theory & Algebra Lead',
        'Math Circle Competitor',
      ],
      whatIDidPrompts: [
        'Solved individual and 4-person team relay problems under timed pressure',
        'Scored in top 15% of district competitors in Algebra & Combinatorics',
        'Collaborated on 10-question team round to secure school podium finish',
        'Led weekly after-school problem-solving sessions preparing for meet',
        'Presented proof solutions to younger math club members after competition',
      ],
      defaultHoursPerWeek: 3.5,
      defaultWeeksPerYear: 30,
    },
    {
      id: 'evt_robotics_vex_1',
      title: `VEX Robotics ${cleanDistrict} Fall League Qualifier`,
      category: 'Robotics',
      activityType: 'Robotics',
      organizer: `VEX Robotics Competition & ${cleanSchool} Robotics Team`,
      daysAgo: 6,
      locationScope: 'Regional / District Qualifier (Completed)',
      defaultRoles: [
        'Lead Programmer & Autonomous Coder',
        'Mechanical Builder & Drive Team',
        'Scouting & Alliance Strategist',
        'Engineering Notebook Lead',
      ],
      whatIDidPrompts: [
        'Competed in 6 qualification matches and elimination alliance bracket',
        'Programmed 15-second autonomous routine in C++/PROS with PID sensors',
        'Repaired intake gear mechanism in pit area between qualification matches',
        'Presented CAD design iterations to tournament judges for Design Award',
        'Coordinated match strategy with alliance partners across 24 district teams',
      ],
      defaultHoursPerWeek: 7,
      defaultWeeksPerYear: 34,
    },
    {
      id: 'evt_chess_rapid_2',
      title: `Regional High School & Middle School Rapid Chess Open`,
      category: 'Chess',
      activityType: 'Academic',
      organizer: `Regional Scholastic Chess Association`,
      daysAgo: 9,
      locationScope: 'Regional Multi-District Event (Completed)',
      defaultRoles: [
        'Rated Section Competitor',
        'U1600 / Championship Player',
        'Team Board Representative',
      ],
      whatIDidPrompts: [
        'Played 6 rapid rounds against rated players from 18 regional schools',
        'Gained +45 USCF rating points with undefeated afternoon session',
        'Coordinated team pairings and opening preparation notebook',
        'Assisted tournament directors with board setup and clock calibration',
      ],
      defaultHoursPerWeek: 4,
      defaultWeeksPerYear: 26,
    },
    {
      id: 'evt_math_counts_2',
      title: `${cleanDistrict} UIL / MathCounts Countdown & Number Sense Invitational`,
      category: 'District Math',
      activityType: 'Science/Math',
      organizer: `${cleanDistrict} Academic UIL & STEM League`,
      daysAgo: 11,
      locationScope: 'School District-Wide (Completed)',
      defaultRoles: [
        'Countdown Round Finalist',
        'Number Sense & Calculator Competitor',
        'Grade-Level Team Captain',
      ],
      whatIDidPrompts: [
        'Completed 80-question mental math Number Sense test in 10 minutes',
        'Advanced to head-to-head Countdown buzzer round among top 10 students',
        'Earned 2nd place medal in grade-level division for ${cleanSchool}',
        'Created mental math shortcut flashcards shared with 20+ club peers',
      ],
      defaultHoursPerWeek: 3,
      defaultWeeksPerYear: 28,
    },
    {
      id: 'evt_robotics_ftc_2',
      title: `FIRST Tech Challenge (FTC) ${cleanDistrict} Scrimmage & Inspection Meet`,
      category: 'Robotics',
      activityType: 'Robotics',
      organizer: `FIRST Robotics District Hub & ${cleanSchool} STEM Lab`,
      daysAgo: 14,
      locationScope: 'District-Wide Robotics Meet (Completed)',
      defaultRoles: [
        'Driver & Operator',
        'CAD & 3D Printing Lead',
        'Sensor & Vision Telemetry Programmer',
        'Outreach & Pit Lead',
      ],
      whatIDidPrompts: [
        'Passed hardware & software robot inspection on first attempt',
        'Tested AprilTag vision alignment and autonomous specimen scoring',
        'Logged 5 full scrimmage matches and refined tele-op driver controls',
        'Helped rookie middle/high school team troubleshoot Rev Control Hub wiring',
      ],
      defaultHoursPerWeek: 6,
      defaultWeeksPerYear: 32,
    },
    {
      id: 'evt_science_olympiad_1',
      title: `${cleanDistrict} Science Olympiad Fall Invitational`,
      category: 'Science & STEM',
      activityType: 'Science/Math',
      organizer: `${cleanDistrict} Science Olympiad & ${cleanSchool} STEM Society`,
      daysAgo: 17,
      locationScope: 'District & Regional Invitational (Completed)',
      defaultRoles: [
        'Varsity Event Competitor',
        'Build Event Lead Engineer',
        'Lab & Forensics Partner',
      ],
      whatIDidPrompts: [
        'Competed in 3 events: Forensics, Codebusters, and Tower Engineering',
        'Calibrated chemical analysis binder and solved crime-scene polymer lab',
        'Placed 3rd overall out of 32 teams in regional invitational division',
        'Built balsa wood structural tower holding 15kg load at 8.2g mass',
      ],
      defaultHoursPerWeek: 5,
      defaultWeeksPerYear: 30,
    },
    {
      id: 'evt_debate_district_1',
      title: `${cleanDistrict} Speech, Debate & Congress Fall Classic`,
      category: 'Debate & Speech',
      activityType: 'Debate/Speech',
      organizer: `National Speech & Debate District Chapter`,
      daysAgo: 20,
      locationScope: 'School District Tournament (Completed)',
      defaultRoles: [
        'Public Forum Debater',
        'Lincoln-Douglas Speaker',
        'Extemporaneous Speaking Finalist',
        'Student Congress Presiding Officer',
      ],
      whatIDidPrompts: [
        'Debated 4 preliminary rounds and broke to Quarterfinals bracket',
        'Researched and compiled 35-page evidence brief on economic policy',
        'Delivered 7-minute constructive and crossfire rebuttals before lay & flow judges',
        'Earned NSDA Merit points and Top Speaker recognition in chamber',
      ],
      defaultHoursPerWeek: 5,
      defaultWeeksPerYear: 30,
    },
    {
      id: 'evt_coding_district_1',
      title: `${cleanDistrict} High School Computer Science & Algorithms Cup`,
      category: 'Coding & CS',
      activityType: 'Computer/Technology',
      organizer: `${cleanDistrict} CS Teachers Association & Coding Club`,
      daysAgo: 23,
      locationScope: 'District-Wide Coding Contest (Completed)',
      defaultRoles: [
        '3-Person Programming Team Lead',
        'Algorithms & Dynamic Programming Coder',
        'USACO / UIL CS Competitor',
      ],
      whatIDidPrompts: [
        'Solved 9 of 12 algorithmic challenges in Python and Java within 3 hours',
        'Implemented graph traversal (BFS/Dijkstra) and dynamic programming solutions',
        'Debugged edge cases under contest lock-out rules to place Top 5 in District',
        'Hosted post-contest code walkthrough for younger club programmers',
      ],
      defaultHoursPerWeek: 4,
      defaultWeeksPerYear: 30,
    },
    {
      id: 'evt_athletics_district_1',
      title: `${cleanDistrict} JV / Varsity Basketball & Athletics Tip-Off Showcase`,
      category: 'Athletics & Arts',
      activityType: 'Athletics: JV/Varsity',
      organizer: `${cleanDistrict} Athletic League & ${cleanSchool} Athletics`,
      daysAgo: 27,
      locationScope: 'District Athletic Showcase (Completed)',
      defaultRoles: [
        'Point Guard & Team Player',
        'Starting Varsity / JV Athlete',
        'Defensive Captain',
      ],
      whatIDidPrompts: [
        'Competed in 3 full-court district showcase games against rival schools',
        'Led transition defense, recorded 6 assists/game & communicated floor sets',
        'Completed 100% of conditioning sprints and film breakdown sessions',
        'Encouraged younger teammates on the bench and led team warm-ups',
      ],
      defaultHoursPerWeek: 10,
      defaultWeeksPerYear: 24,
    },
  ];

  return rawEvents.map((ev) => {
    const { iso, formatted } = formatPastDate(ev.daysAgo);
    return {
      ...ev,
      completedDate: iso,
      completedDateFormatted: formatted,
      status: 'Completed',
    };
  });
}

export type SoftDeletedRecordType =
  | 'activity'
  | 'journal'
  | 'honor'
  | 'essayDraft'
  | 'collegeDeadline'
  | 'student';

export interface SoftDeletedTrashItem {
  id: string;
  recordType: SoftDeletedRecordType;
  recordId: string;
  title: string;
  subtitle: string;
  studentId?: string;
  studentName: string;
  deletedAt: string; // ISO string
  purgeAfter: string; // ISO string (+30 days)
  recordPayload:
    | ActivityItem
    | JournalEntryItem
    | HonorAwardItem
    | EssayDraftItem
    | CollegeDeadlineItem
    | StudentChildProfile;
}

export interface PortfolioSnapshotItem {
  id: string;
  createdAt: string; // ISO string
  purgeAfter: string; // ISO string (+30 days)
  reason: string; // e.g., 'Pre-Delete: Activity (Oakridge VEX Robotics)' or 'Pre-Overwrite: Family Sync'
  studentName: string;
  recordType?: SoftDeletedRecordType | 'bulk';
  recordTitle?: string;
  singleRecord?:
    | ActivityItem
    | JournalEntryItem
    | HonorAwardItem
    | EssayDraftItem
    | CollegeDeadlineItem
    | StudentChildProfile;
  portfolioState: {
    profile: UserProfile;
    familyProfile: FamilyProfileItem;
    familyStudents: StudentChildProfile[];
    activeStudentId: string;
    activities: ActivityItem[];
    journalEntries: JournalEntryItem[];
    honors: HonorAwardItem[];
    essayDrafts: EssayDraftItem[];
    collegeDeadlines: CollegeDeadlineItem[];
  };
}



