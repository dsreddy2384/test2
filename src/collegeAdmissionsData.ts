import {
  ActivityItem,
  FamilyProfileItem,
  HonorAwardItem,
  UserProfile,
} from './types';

function computeActivityHours(act: ActivityItem): number {
  const gradesCount = Math.max(1, act.grades?.length || 1);
  return Math.round(
    (Number(act.hoursPerWeek) || 0) *
      (Number(act.weeksPerYear) || 0) *
      gradesCount
  );
}

export interface CollegePublishedAdmissionsData {
  id: string;
  collegeName: string;
  shortName: string;
  aliases: string[];
  location: string;
  cdsCycle: string;
  totalApplicants: number;
  totalAccepted: number;
  acceptanceRatePercent: number;
  enrolledFreshmen: number;
  avgUnweightedGpa: number;
  gpaMiddle50Range: string;
  percentInTop10Class: number;
  recommendedApIbCourses: number;
  satMiddle50Range: string;
  sat25th: number;
  sat75th: number;
  actMiddle50Range: string;
  act25th: number;
  act75th: number;
  testPolicy: string;
  cdsVeryImportantFactors: string[];
  admittedStudentSpikeSummary: string;
  officialCdsUrl?: string;
  gpaReportingNote?: string;
  isLiveGroundedResult?: boolean;
  sourceUrl?: string;
  cachedAt?: string;
  expiresAt?: number;
  isEstimatedFallback?: boolean;
}

export interface StudentCollegeGapEvaluation {
  college: CollegePublishedAdmissionsData;
  overallMatchScore: number; // 0-100
  selectivityTier: 'High-Reach' | 'Reach' | 'Target' | 'Likely';
  selectivitySummary: string;
  benchmarksMetCount: number;
  competitivenessLabel: string;
  gpaComparison: {
    studentUnweighted: number | null;
    collegeAvgUnweighted: number;
    delta: number | null;
    status: 'On Target' | 'Close' | 'Needs Improvement' | 'Not Entered';
    summary: string;
  };
  rigorComparison: {
    studentApIbCount: number;
    gradeAdjustedTarget: number;
    collegeSeniorTarget: number;
    status: 'On Target' | 'Close' | 'Needs Improvement';
    summary: string;
  };
  testingComparison: {
    studentSat: number | null;
    studentAct: number | null;
    studentPsat?: string | null;
    isTestBlind?: boolean;
    status:
      | 'On Target'
      | 'Close'
      | 'Needs Improvement'
      | 'Not Entered'
      | 'Test-Blind Policy'
      | 'Pre-SAT Baseline';
    summary: string;
  };
  activityAndHonorsComparison: {
    totalActivities: number;
    totalHours: number;
    leadershipCount: number;
    tierHonorsCount: number;
    status: 'On Target' | 'Close' | 'Needs Improvement';
    summary: string;
  };
  whatToImprove: {
    category: 'GPA & Course Rigor' | 'Standardized Testing' | 'Extracurricular Spike' | 'Honors & Essays';
    priority: 'High Priority' | 'Recommended' | 'On Track — Maintain';
    title: string;
    actionStep: string;
  }[];
}

export const PUBLISHED_COLLEGE_ADMISSIONS_DATA: CollegePublishedAdmissionsData[] = [
  {
    id: 'col_mit',
    collegeName: 'Massachusetts Institute of Technology (MIT)',
    shortName: 'MIT',
    aliases: ['mit', 'massachusetts institute of technology'],
    location: 'Cambridge, MA',
    cdsCycle: 'Official MIT CDS (2024–2025 Published)',
    totalApplicants: 28232,
    totalAccepted: 1284,
    acceptanceRatePercent: 4.5,
    enrolledFreshmen: 1102,
    avgUnweightedGpa: 3.97,
    gpaMiddle50Range: '3.94 – 4.00',
    percentInTop10Class: 99,
    recommendedApIbCourses: 11,
    satMiddle50Range: '1530 – 1580 (Math: 780–800)',
    sat25th: 1530,
    sat75th: 1580,
    actMiddle50Range: '35 – 36',
    act25th: 35,
    act75th: 36,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://mitadmissions.org/apply/process/stats/',
    gpaReportingNote:
      'MIT CDS Section C10 reports 99% of admitted students in the Top 10% of their class; 3.97 is the benchmark GPA equivalent.',
    cdsVeryImportantFactors: [
      'Character & Personal Qualities (CDS C7)',
      'Academic GPA & Calculus/Physics Rigor',
      'Standardized Test Scores (Math 780–800)',
      'Extracurricular Initiative & Maker/Research Impact',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'Admitted MIT students typically pair near-perfect STEM coursework with hands-on building, Olympiad/AMC/Robotics depth, independent research, or collaborative community problem-solving.',
  },
  {
    id: 'col_stanford',
    collegeName: 'Stanford University',
    shortName: 'Stanford',
    aliases: ['stanford', 'stanford university'],
    location: 'Stanford, CA',
    cdsCycle: 'Official Stanford CDS (2023–2024 / 2024–2025 Published)',
    totalApplicants: 56378,
    totalAccepted: 2067,
    acceptanceRatePercent: 3.7,
    enrolledFreshmen: 1736,
    avgUnweightedGpa: 3.96,
    gpaMiddle50Range: '3.93 – 4.00 (75% have 4.00 UW)',
    percentInTop10Class: 97,
    recommendedApIbCourses: 11,
    satMiddle50Range: '1510 – 1570',
    sat25th: 1510,
    sat75th: 1570,
    actMiddle50Range: '34 – 35',
    act25th: 34,
    act75th: 35,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://ucomm.stanford.edu/cds/',
    gpaReportingNote:
      'Reported directly in Stanford CDS Section C11/C12 (nearly 75% of enrolled freshmen enter with a 4.0 unweighted GPA).',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Intellectual Vitality & Essays',
      'Talent / Ability & Extracurricular Impact',
      'Character / Personal Qualities',
    ],
    admittedStudentSpikeSummary:
      'Stanford emphasizes "Intellectual Vitality"—authentic curiosity beyond the classroom, national/state distinction in 1–2 core passions, and measurable community leadership.',
  },
  {
    id: 'col_uc_berkeley',
    collegeName: 'University of California, Berkeley (UC Berkeley)',
    shortName: 'UC Berkeley',
    aliases: ['uc berkeley', 'berkeley', 'cal', 'university of california berkeley'],
    location: 'Berkeley, CA',
    cdsCycle: 'Official UC Berkeley CDS & UC Freshman Profile (2024–2025 Published)',
    totalApplicants: 124242,
    totalAccepted: 13701,
    acceptanceRatePercent: 11.0,
    enrolledFreshmen: 6819,
    avgUnweightedGpa: 3.92,
    gpaMiddle50Range: '3.89 – 4.00 (Uncapped Weighted 4.31 – 4.65)',
    percentInTop10Class: 98,
    recommendedApIbCourses: 10,
    satMiddle50Range: 'Test-Blind (GPA & Rigor Primary)',
    sat25th: 1450,
    sat75th: 1550,
    actMiddle50Range: 'Test-Blind',
    act25th: 32,
    act75th: 35,
    testPolicy: 'Test-Blind (AP/IB Exams & Course Rigor Evaluated)',
    officialCdsUrl: 'https://opa.berkeley.edu/campus-data/common-data-set',
    gpaReportingNote:
      'Published directly by UC Office of the President & UC Berkeley Freshman Admit Profile (25th–75th Unweighted GPA: 3.89–4.00).',
    cdsVeryImportantFactors: [
      '10th–11th Grade UC-Approved Honors/AP/IB Rigor',
      'Unweighted & Capped/Uncapped Weighted GPA',
      'Personal Insight Questions (PIQs)',
      'Sustained Multi-Year Community & Club Leadership',
    ],
    admittedStudentSpikeSummary:
      'Because UC Berkeley is test-blind, course rigor (AP/IB count), 10th–11th grade GPA, and concrete leadership impact across your 4 Personal Insight Questions carry immense weight.',
  },
  {
    id: 'col_ut_austin',
    collegeName: 'University of Texas at Austin (UT Austin)',
    shortName: 'UT Austin',
    aliases: ['ut austin', 'ut', 'university of texas', 'texas austin'],
    location: 'Austin, TX',
    cdsCycle: 'Official UT Austin CDS & Freshman Profile (2024–2025 Published)',
    totalApplicants: 72885,
    totalAccepted: 20480,
    acceptanceRatePercent: 28.1,
    enrolledFreshmen: 9152,
    avgUnweightedGpa: 3.88,
    gpaMiddle50Range: '3.80 – 4.00',
    percentInTop10Class: 74,
    recommendedApIbCourses: 9,
    satMiddle50Range: '1360 – 1510 (CS/Eng/Business: 1470 – 1560)',
    sat25th: 1360,
    sat75th: 1510,
    actMiddle50Range: '30 – 34',
    act25th: 30,
    act75th: 34,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://reports.utexas.edu/common-data-set',
    gpaReportingNote:
      'UT Austin CDS reports Class Rank (Top 5% Texas auto-admit; 74% in Top 10%); 3.88 is the benchmark unweighted GPA for competitive majors.',
    cdsVeryImportantFactors: [
      'Class Rank (Top 5% Auto-Admit for TX Residents)',
      'Rigor of High School Coursework',
      'Fit-to-Major Extracurricular Depth (Resume & Activities)',
      'Standardized Test Scores',
      'Essays & Short Answers',
    ],
    admittedStudentSpikeSummary:
      'UT Austin evaluates "Fit-to-Major" heavily: competitive majors (Turing/CS, Cockrell Engineering, McCombs Business) look for direct hands-on projects, competitions, and leadership in your chosen field.',
  },
  {
    id: 'col_georgia_tech',
    collegeName: 'Georgia Institute of Technology (Georgia Tech)',
    shortName: 'Georgia Tech',
    aliases: ['georgia tech', 'gatech', 'ga tech', 'georgia institute of technology'],
    location: 'Atlanta, GA',
    cdsCycle: 'Official Georgia Tech CDS (2024–2025 Published)',
    totalApplicants: 59716,
    totalAccepted: 8360,
    acceptanceRatePercent: 14.0,
    enrolledFreshmen: 3850,
    avgUnweightedGpa: 3.93,
    gpaMiddle50Range: '3.88 – 4.00 (Weighted Avg 4.15+)',
    percentInTop10Class: 91,
    recommendedApIbCourses: 10,
    satMiddle50Range: '1400 – 1540',
    sat25th: 1400,
    sat75th: 1540,
    actMiddle50Range: '31 – 35',
    act25th: 31,
    act75th: 35,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://irp.gatech.edu/common-data-set',
    gpaReportingNote:
      'Published in Georgia Tech CDS & Admission Snapshot (91% of admitted freshmen rank in the Top 10% of their class).',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record (AP Calc, Physics, CS)',
      'Academic GPA',
      'Extracurricular Impact & Community Service ("Progress and Service")',
      'Standardized Test Scores',
    ],
    admittedStudentSpikeSummary:
      'Georgia Tech’s motto is "Progress and Service"—successful applicants combine advanced math/science rigor with hands-on STEM building (Robotics, Olympiad, coding) and tangible community service.',
  },
  {
    id: 'col_harvard',
    collegeName: 'Harvard University',
    shortName: 'Harvard',
    aliases: ['harvard', 'harvard university'],
    location: 'Cambridge, MA',
    cdsCycle: 'Official Harvard CDS (2024–2025 Published)',
    totalApplicants: 54008,
    totalAccepted: 1937,
    acceptanceRatePercent: 3.6,
    enrolledFreshmen: 1647,
    avgUnweightedGpa: 3.96,
    gpaMiddle50Range: '3.94 – 4.00 (74% have 4.00 UW)',
    percentInTop10Class: 95,
    recommendedApIbCourses: 11,
    satMiddle50Range: '1500 – 1580',
    sat25th: 1500,
    sat75th: 1580,
    actMiddle50Range: '34 – 36',
    act25th: 34,
    act75th: 36,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://oira.harvard.edu/common-data-set/',
    gpaReportingNote:
      'Reported directly in Harvard CDS Section C11/C12 (74.2% of enrolled students report a 4.0 unweighted GPA; average is ~3.95–3.96).',
    cdsVeryImportantFactors: [
      'Academic Rigor & GPA',
      'Extracurricular Leadership & Distinction',
      'Personal Qualities & Community Contribution',
      'Recommendations & Essays',
      'Standardized Test Scores',
    ],
    admittedStudentSpikeSummary:
      'Harvard looks for transformative impact on peers and community, state/national recognition in a core area, and compelling personal voice in essays.',
  },
  {
    id: 'col_ucla',
    collegeName: 'University of California, Los Angeles (UCLA)',
    shortName: 'UCLA',
    aliases: ['ucla', 'university of california los angeles'],
    location: 'Los Angeles, CA',
    cdsCycle: 'Official UCLA CDS & UC Freshman Profile (2024–2025 Published)',
    totalApplicants: 146276,
    totalAccepted: 13114,
    acceptanceRatePercent: 9.0,
    enrolledFreshmen: 6585,
    avgUnweightedGpa: 3.95,
    gpaMiddle50Range: '3.92 – 4.00 (Uncapped Weighted 4.40 – 4.74)',
    percentInTop10Class: 98,
    recommendedApIbCourses: 10,
    satMiddle50Range: 'Test-Blind (GPA & Rigor Primary)',
    sat25th: 1440,
    sat75th: 1540,
    actMiddle50Range: 'Test-Blind',
    act25th: 32,
    act75th: 35,
    testPolicy: 'Test-Blind',
    officialCdsUrl: 'https://apb.ucla.edu/campus-statistics/admissions',
    gpaReportingNote:
      'Published directly in UCLA Academic Planning & Budget Freshman Admit Profile (Middle 50% Unweighted GPA: 3.92–4.00).',
    cdsVeryImportantFactors: [
      'Academic GPA (10th–11th Grade)',
      'Rigor of AP / IB / Honors Coursework',
      'Personal Insight Questions (PIQs)',
      'Leadership & Community Service Impact',
    ],
    admittedStudentSpikeSummary:
      'UCLA admits have a median unweighted GPA near 3.95+ with 9–12 AP/IB/Honors classes and strong leadership continuity from 9th to 12th grade.',
  },
  {
    id: 'col_cmu',
    collegeName: 'Carnegie Mellon University (CMU)',
    shortName: 'Carnegie Mellon',
    aliases: ['cmu', 'carnegie mellon', 'carnegie mellon university'],
    location: 'Pittsburgh, PA',
    cdsCycle: 'Official CMU CDS (2024–2025 Published)',
    totalApplicants: 33997,
    totalAccepted: 3875,
    acceptanceRatePercent: 11.4,
    enrolledFreshmen: 1716,
    avgUnweightedGpa: 3.92,
    gpaMiddle50Range: '3.87 – 4.00',
    percentInTop10Class: 92,
    recommendedApIbCourses: 10,
    satMiddle50Range: '1500 – 1570',
    sat25th: 1500,
    sat75th: 1570,
    actMiddle50Range: '34 – 35',
    act25th: 34,
    act75th: 35,
    testPolicy: 'Test-Flexible / Recommended for CS & Engineering',
    officialCdsUrl: 'https://www.cmu.edu/ira/CDS/',
    gpaReportingNote:
      'Published directly in Carnegie Mellon Institutional Research & Analysis CDS Section C11/C12 (Average Unweighted GPA: 3.92).',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA (Especially Advanced Math & Science)',
      'Extracurricular Depth & Technical/Artistic Portfolio',
      'Application Essays & Character',
    ],
    admittedStudentSpikeSummary:
      'Carnegie Mellon places heavy emphasis on advanced mathematics (Calculus BC, competition math), hands-on technical or artistic portfolios, and collaborative project leadership.',
  },
  {
    id: 'col_umich',
    collegeName: 'University of Michigan, Ann Arbor',
    shortName: 'UMich',
    aliases: ['umich', 'michigan', 'university of michigan'],
    location: 'Ann Arbor, MI',
    cdsCycle: 'Official UMich CDS (2024–2025 Published)',
    totalApplicants: 98310,
    totalAccepted: 15373,
    acceptanceRatePercent: 15.6,
    enrolledFreshmen: 7315,
    avgUnweightedGpa: 3.91,
    gpaMiddle50Range: '3.86 – 4.00',
    percentInTop10Class: 91,
    recommendedApIbCourses: 9,
    satMiddle50Range: '1380 – 1540',
    sat25th: 1380,
    sat75th: 1540,
    actMiddle50Range: '31 – 34',
    act25th: 31,
    act75th: 34,
    testPolicy: 'Test-Optional',
    officialCdsUrl: 'https://obp.umich.edu/campus-statistics/common-data-set/',
    gpaReportingNote:
      'Published directly in UMich Office of Budget & Planning Common Data Set Section C12 (Average Unweighted High School GPA: 3.91).',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Application Essays ("Why Michigan" & Community Essay)',
      'Extracurricular Commitment & Leadership',
    ],
    admittedStudentSpikeSummary:
      'UMich values a balanced, high-achieving academic record (3.9+ unweighted GPA), spirited school/community involvement, and a deeply researched "Why Michigan" essay.',
  },
  {
    id: 'col_upenn',
    collegeName: 'University of Pennsylvania (UPenn)',
    shortName: 'UPenn',
    aliases: ['upenn', 'penn', 'wharton', 'university of pennsylvania'],
    location: 'Philadelphia, PA',
    cdsCycle: 'Official UPenn CDS (2024–2025 Published)',
    totalApplicants: 65230,
    totalAccepted: 3508,
    acceptanceRatePercent: 5.4,
    enrolledFreshmen: 2420,
    avgUnweightedGpa: 3.94,
    gpaMiddle50Range: '3.90 – 4.00',
    percentInTop10Class: 95,
    recommendedApIbCourses: 10,
    satMiddle50Range: '1500 – 1570',
    sat25th: 1500,
    sat75th: 1570,
    actMiddle50Range: '34 – 36',
    act25th: 34,
    act75th: 36,
    testPolicy: 'SAT / ACT Required (Starting 2025–2026 Cycle)',
    officialCdsUrl: 'https://ira.upenn.edu/penn-numbers/common-data-set',
    gpaReportingNote:
      'UPenn CDS Section C10/C12 reports 95% of enrolled freshmen in Top 10% of class with a 3.94 average unweighted GPA.',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Real-World Community & Organizational Impact',
      'Application Essays & Recommendations',
    ],
    admittedStudentSpikeSummary:
      'Penn prizes practical, real-world application of knowledge—students who launch initiatives, lead organizations with measurable outcomes, and bridge disciplines.',
  },
  {
    id: 'col_cornell',
    collegeName: 'Cornell University',
    shortName: 'Cornell',
    aliases: ['cornell', 'cornell university'],
    location: 'Ithaca, NY',
    cdsCycle: 'Official Cornell CDS (2024–2025 Published)',
    totalApplicants: 65612,
    totalAccepted: 5516,
    acceptanceRatePercent: 8.4,
    enrolledFreshmen: 3550,
    avgUnweightedGpa: 3.93,
    gpaMiddle50Range: '3.88 – 4.00',
    percentInTop10Class: 90,
    recommendedApIbCourses: 10,
    satMiddle50Range: '1480 – 1560',
    sat25th: 1480,
    sat75th: 1560,
    actMiddle50Range: '33 – 35',
    act25th: 33,
    act75th: 35,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://irp.dpb.cornell.edu/common-data-set',
    gpaReportingNote:
      'Cornell Institutional Research & Planning CDS reports ~90% of admitted students in the Top 10% of their graduating class.',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Fit with Specific Undergraduate College (Engineering, A&S, Dyson, CALS)',
      'Extracurricular Depth & Talent',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'Cornell admits by specific college—demonstrating direct alignment between your 6th–12th grade activities and your target Cornell college is critical.',
  },
  {
    id: 'col_uiuc',
    collegeName: 'University of Illinois Urbana-Champaign (UIUC)',
    shortName: 'UIUC',
    aliases: ['uiuc', 'illinois', 'university of illinois'],
    location: 'Champaign, IL',
    cdsCycle: 'Official UIUC CDS & Freshman Admit Profile (2024–2025 Published)',
    totalApplicants: 73742,
    totalAccepted: 31266,
    acceptanceRatePercent: 42.4,
    enrolledFreshmen: 8325,
    avgUnweightedGpa: 3.83,
    gpaMiddle50Range: '3.68 – 3.98 (Grainger Eng / CS: 3.92 – 4.00)',
    percentInTop10Class: 68,
    recommendedApIbCourses: 8,
    satMiddle50Range: '1350 – 1510 (CS/Eng: 1490 – 1560)',
    sat25th: 1350,
    sat75th: 1510,
    actMiddle50Range: '30 – 34',
    act25th: 30,
    act75th: 34,
    testPolicy: 'Test-Optional',
    officialCdsUrl: 'https://www.admissions.illinois.edu/apply/freshman/profile',
    gpaReportingNote:
      'Published in UIUC Division of Management Information CDS & Freshman Class Profile (Middle 50% Unweighted GPA: 3.68–3.98; CS/Engineering: 3.92–4.00).',
    cdsVeryImportantFactors: [
      'Rigor of High School Coursework',
      'Academic GPA',
      'Major-Specific Essays & Related Activities',
    ],
    admittedStudentSpikeSummary:
      'While UIUC’s overall acceptance rate is ~42%, Grainger Engineering and Computer Science have single-digit/teens admit rates requiring top-tier STEM rigor and hands-on coding/robotics projects.',
  },
  {
    id: 'col_tamu',
    collegeName: 'Texas A&M University',
    shortName: 'Texas A&M',
    aliases: ['texas a&m', 'texas a&m university', 'tamu', 'texas a and m', 'aggies'],
    location: 'College Station, TX',
    cdsCycle: 'Official Texas A&M CDS & DARS Freshman Profile (2024–2025 Published)',
    totalApplicants: 56420,
    totalAccepted: 35545,
    acceptanceRatePercent: 63.0,
    enrolledFreshmen: 12450,
    avgUnweightedGpa: 3.68,
    gpaMiddle50Range: '3.55 – 3.92 (Top 10% TX Residents Auto-Admit)',
    percentInTop10Class: 56,
    recommendedApIbCourses: 6,
    satMiddle50Range: '1160 – 1390 (Engineering: 1310 – 1470)',
    sat25th: 1160,
    sat75th: 1390,
    actMiddle50Range: '25 – 31',
    act25th: 25,
    act75th: 31,
    testPolicy: 'Test-Optional (Top 10% TX Auto-Admit)',
    officialCdsUrl: 'https://www.tamu.edu/',
    gpaReportingNote:
      'Texas A&M grants automatic general admission to Texas residents in the Top 10% of their graduating class (~63% overall freshman admit rate; Engineering uses Entry-to-a-Major holistic review).',
    cdsVeryImportantFactors: [
      'Class Rank (Top 10% Texas Automatic Admission)',
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Extracurricular Leadership & Service ("Selfless Service")',
    ],
    admittedStudentSpikeSummary:
      'Texas A&M offers automatic admission to Top 10% Texas residents (~63% overall admit rate), while competitive programs like Engineering and Mays Business favor strong math readiness and leadership.',
  },
  {
    id: 'col_ucsd',
    collegeName: 'University of California, San Diego (UC San Diego)',
    shortName: 'UC San Diego',
    aliases: ['uc san diego', 'ucsd', 'university of california san diego', 'u.c. san diego'],
    location: 'La Jolla, CA',
    cdsCycle: 'Official UC San Diego CDS & UC Freshman Profile (2024–2025 Published)',
    totalApplicants: 134439,
    totalAccepted: 33206,
    acceptanceRatePercent: 24.7,
    enrolledFreshmen: 7020,
    avgUnweightedGpa: 3.90,
    gpaMiddle50Range: '3.84 – 4.00 (Capped Weighted 4.12 – 4.30)',
    percentInTop10Class: 96,
    recommendedApIbCourses: 9,
    satMiddle50Range: 'Test-Blind (SAT/ACT Not Considered)',
    sat25th: 0,
    sat75th: 0,
    actMiddle50Range: 'Test-Blind',
    act25th: 0,
    act75th: 0,
    testPolicy: 'Test-Blind (SAT/ACT Not Considered by UC Policy)',
    officialCdsUrl: 'https://ir.ucsd.edu/',
    gpaReportingNote:
      'Published by UC Office of the President & UC San Diego Institutional Research (~134,439 freshman applicants; SAT/ACT scores are not considered for admission at any UC campus).',
    cdsVeryImportantFactors: [
      '10th–11th Grade UC-Approved A–G GPA',
      'Rigor of AP / IB / Honors Coursework',
      'Personal Insight Questions (4 PIQs)',
      'Sustained Extracurricular, Research & Community Impact',
    ],
    admittedStudentSpikeSummary:
      'UC San Diego is strictly Test-Blind and does not look at SAT or ACT scores; admissions decisions focus on 10th–11th grade GPA, AP/IB rigor, and your 4 Personal Insight Questions.',
  },
  {
    id: 'col_uw',
    collegeName: 'University of Washington (UW Seattle)',
    shortName: 'UW Seattle',
    aliases: [
      'university of washington',
      'uw seattle',
      'uw',
      'udub',
      'u of washington',
      'university of washington seattle',
    ],
    location: 'Seattle, WA',
    cdsCycle: 'Official UW Seattle CDS & Freshman Profile (2024–2025 Published)',
    totalApplicants: 69103,
    totalAccepted: 34206,
    acceptanceRatePercent: 49.5,
    enrolledFreshmen: 7250,
    avgUnweightedGpa: 3.83,
    gpaMiddle50Range: '3.76 – 3.98 (Direct-to-CS/Eng: 3.93 – 4.00)',
    percentInTop10Class: 76,
    recommendedApIbCourses: 8,
    satMiddle50Range: '1340 – 1500 (Not Required)',
    sat25th: 1340,
    sat75th: 1500,
    actMiddle50Range: '29 – 34 (Not Required)',
    act25th: 29,
    act75th: 34,
    testPolicy: 'Test-Optional / Rarely Considered (GPA & Rigor Primary)',
    officialCdsUrl: 'https://www.washington.edu/opb/',
    gpaReportingNote:
      'Published in UW Office of Educational Assessment & Common Data Set (Middle 50% Unweighted HS GPA: 3.76–3.98; SAT/ACT scores are not required and only reviewed if they positively impact an edge decision).',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record (Senior Year Math/Science)',
      'Academic GPA & Grade Trend (9th–12th)',
      'Personal Essay & Community Contributions',
      'Preparation for Intended Major (Direct-to-Major CS & Engineering)',
    ],
    admittedStudentSpikeSummary:
      'UW Seattle places primary weight on 9th–12th grade academic rigor, upward GPA trends, and your personal essay, with Direct-to-Major CS (Paul G. Allen School) and Engineering requiring top STEM preparation.',
  },
  {
    id: 'col_ucsb',
    collegeName: 'University of California, Santa Barbara (UCSB)',
    shortName: 'UC Santa Barbara',
    aliases: ['uc santa barbara', 'ucsb', 'university of california santa barbara'],
    location: 'Santa Barbara, CA',
    cdsCycle: 'Official UCSB CDS & UC Freshman Profile (2024–2025 Published)',
    totalApplicants: 110236,
    totalAccepted: 30755,
    acceptanceRatePercent: 27.9,
    enrolledFreshmen: 4980,
    avgUnweightedGpa: 3.90,
    gpaMiddle50Range: '3.85 – 4.00 (Capped Weighted 4.13 – 4.29)',
    percentInTop10Class: 95,
    recommendedApIbCourses: 9,
    satMiddle50Range: 'Test-Blind (SAT/ACT Not Considered)',
    sat25th: 0,
    sat75th: 0,
    actMiddle50Range: 'Test-Blind',
    act25th: 0,
    act75th: 0,
    testPolicy: 'Test-Blind (SAT/ACT Not Considered by UC Policy)',
    officialCdsUrl: 'https://bap.ucsb.edu/',
    gpaReportingNote:
      'Published by UC Office of the President & UCSB Institutional Research (SAT/ACT scores are not considered for admission at any UC campus).',
    cdsVeryImportantFactors: [
      '10th–11th Grade UC-Approved A–G GPA',
      'Rigor of AP / IB / Honors Coursework',
      'Personal Insight Questions (4 PIQs)',
      'Extracurricular Depth & Community Engagement',
    ],
    admittedStudentSpikeSummary:
      'Like all UC campuses, UCSB is Test-Blind and evaluates 10th–11th grade GPA, course rigor, and authentic voice across your 4 Personal Insight Questions.',
  },
  {
    id: 'col_uci',
    collegeName: 'University of California, Irvine (UC Irvine)',
    shortName: 'UC Irvine',
    aliases: ['uc irvine', 'uci', 'university of california irvine'],
    location: 'Irvine, CA',
    cdsCycle: 'Official UC Irvine CDS & UC Freshman Profile (2024–2025 Published)',
    totalApplicants: 122661,
    totalAccepted: 35326,
    acceptanceRatePercent: 28.8,
    enrolledFreshmen: 6650,
    avgUnweightedGpa: 3.89,
    gpaMiddle50Range: '3.83 – 4.00 (Capped Weighted 4.07 – 4.28)',
    percentInTop10Class: 94,
    recommendedApIbCourses: 8,
    satMiddle50Range: 'Test-Blind (SAT/ACT Not Considered)',
    sat25th: 0,
    sat75th: 0,
    actMiddle50Range: 'Test-Blind',
    act25th: 0,
    act75th: 0,
    testPolicy: 'Test-Blind (SAT/ACT Not Considered by UC Policy)',
    officialCdsUrl: 'https://oir.uci.edu/common-data-set/',
    gpaReportingNote:
      'Published by UC Office of the President & UC Irvine Office of Institutional Research (SAT/ACT scores are not considered).',
    cdsVeryImportantFactors: [
      '10th–11th Grade UC-Approved A–G GPA',
      'Rigor of AP / IB / Honors Coursework',
      'Personal Insight Questions (4 PIQs)',
      'Leadership & Sustained Extracurricular Impact',
    ],
    admittedStudentSpikeSummary:
      'UC Irvine is Test-Blind and emphasizes strong 10th–11th grade A–G grades, AP/IB rigor, and clear alignment with your chosen school/major in your PIQs.',
  },
  {
    id: 'col_uc_davis',
    collegeName: 'University of California, Davis (UC Davis)',
    shortName: 'UC Davis',
    aliases: ['uc davis', 'ucd', 'university of california davis'],
    location: 'Davis, CA',
    cdsCycle: 'Official UC Davis CDS & UC Freshman Profile (2024–2025 Published)',
    totalApplicants: 98834,
    totalAccepted: 41609,
    acceptanceRatePercent: 42.1,
    enrolledFreshmen: 6780,
    avgUnweightedGpa: 3.85,
    gpaMiddle50Range: '3.76 – 4.00 (Capped Weighted 4.03 – 4.27)',
    percentInTop10Class: 90,
    recommendedApIbCourses: 8,
    satMiddle50Range: 'Test-Blind (SAT/ACT Not Considered)',
    sat25th: 0,
    sat75th: 0,
    actMiddle50Range: 'Test-Blind',
    act25th: 0,
    act75th: 0,
    testPolicy: 'Test-Blind (SAT/ACT Not Considered by UC Policy)',
    officialCdsUrl: 'https://aggiedata.ucdavis.edu/#cds',
    gpaReportingNote:
      'Published by UC Office of the President & UC Davis Institutional Analysis (Test-Blind; SAT/ACT scores are not considered).',
    cdsVeryImportantFactors: [
      '10th–11th Grade UC-Approved A–G GPA',
      'Rigor of AP / IB / Honors Coursework',
      'Personal Insight Questions (4 PIQs)',
      'Community Service, Research & Extracurricular Continuity',
    ],
    admittedStudentSpikeSummary:
      'UC Davis is Test-Blind and values consistent A–G coursework rigor, hands-on science/community service, and thoughtful Personal Insight Questions.',
  },
  {
    id: 'col_purdue',
    collegeName: 'Purdue University',
    shortName: 'Purdue',
    aliases: ['purdue', 'purdue university', 'purdue west lafayette'],
    location: 'West Lafayette, IN',
    cdsCycle: 'Official Purdue CDS (2024–2025 Published)',
    totalApplicants: 78526,
    totalAccepted: 39498,
    acceptanceRatePercent: 50.3,
    enrolledFreshmen: 9350,
    avgUnweightedGpa: 3.79,
    gpaMiddle50Range: '3.62 – 3.98 (Engineering / CS: 3.88 – 4.00)',
    percentInTop10Class: 62,
    recommendedApIbCourses: 8,
    satMiddle50Range: '1210 – 1450 (Eng/CS: 1410 – 1540)',
    sat25th: 1210,
    sat75th: 1450,
    actMiddle50Range: '27 – 33',
    act25th: 27,
    act75th: 33,
    testPolicy: 'SAT / ACT Required',
    officialCdsUrl: 'https://www.purdue.edu/idata/',
    gpaReportingNote:
      'Purdue overall acceptance rate is ~50%, while First-Year Engineering and Computer Science are significantly more selective and require SAT/ACT scores.',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record (Calculus & Physics for STEM)',
      'Academic GPA',
      'Standardized Test Scores (SAT/ACT Required)',
      'Major-Specific Supplemental Essays',
    ],
    admittedStudentSpikeSummary:
      'Purdue requires SAT/ACT scores and evaluates applicants directly by major—STEM applicants should highlight Calculus/Physics readiness and hands-on engineering or coding projects.',
  },
  {
    id: 'col_rice',
    collegeName: 'Rice University',
    shortName: 'Rice',
    aliases: ['rice', 'rice university'],
    location: 'Houston, TX',
    cdsCycle: 'Official Rice University CDS (2024–2025 Published)',
    totalApplicants: 32459,
    totalAccepted: 2532,
    acceptanceRatePercent: 7.8,
    enrolledFreshmen: 1140,
    avgUnweightedGpa: 3.95,
    gpaMiddle50Range: '3.90 – 4.00',
    percentInTop10Class: 94,
    recommendedApIbCourses: 10,
    satMiddle50Range: '1500 – 1560',
    sat25th: 1500,
    sat75th: 1560,
    actMiddle50Range: '34 – 35',
    act25th: 34,
    act75th: 35,
    testPolicy: 'Test-Optional (Testing Recommended)',
    officialCdsUrl: 'https://oie.rice.edu/CDS',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA & Class Rank',
      'Extracurricular Depth, Research & Community Impact',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'Rice looks for collaborative scholars with top-decile academic rigor, research or creative initiative, and warm community leadership suited to its residential college system.',
  },
  {
    id: 'col_duke',
    collegeName: 'Duke University',
    shortName: 'Duke',
    aliases: ['duke', 'duke university'],
    location: 'Durham, NC',
    cdsCycle: 'Official Duke University CDS (2024–2025 Published)',
    totalApplicants: 50758,
    totalAccepted: 3125,
    acceptanceRatePercent: 6.2,
    enrolledFreshmen: 1740,
    avgUnweightedGpa: 3.94,
    gpaMiddle50Range: '3.90 – 4.00',
    percentInTop10Class: 95,
    recommendedApIbCourses: 10,
    satMiddle50Range: '1510 – 1570',
    sat25th: 1510,
    sat75th: 1570,
    actMiddle50Range: '34 – 35',
    act25th: 34,
    act75th: 35,
    testPolicy: 'Test-Optional',
    officialCdsUrl: 'https://ir.provost.duke.edu/',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Extracurricular Impact & Leadership',
      'Essays & Recommendations',
    ],
    admittedStudentSpikeSummary:
      'Duke values ambitious interdisciplinary thinkers who pair rigorous AP/IB coursework with high-impact leadership and civic engagement.',
  },
  {
    id: 'col_nyu',
    collegeName: 'New York University (NYU)',
    shortName: 'NYU',
    aliases: ['nyu', 'new york university'],
    location: 'New York, NY',
    cdsCycle: 'Official NYU CDS (2024–2025 Published)',
    totalApplicants: 118000,
    totalAccepted: 9440,
    acceptanceRatePercent: 8.0,
    enrolledFreshmen: 5700,
    avgUnweightedGpa: 3.88,
    gpaMiddle50Range: '3.79 – 3.98',
    percentInTop10Class: 87,
    recommendedApIbCourses: 8,
    satMiddle50Range: '1480 – 1550',
    sat25th: 1480,
    sat75th: 1550,
    actMiddle50Range: '33 – 35',
    act25th: 33,
    act75th: 35,
    testPolicy: 'Test-Flexible / Test-Optional',
    officialCdsUrl: 'https://www.nyu.edu/about/leadership-university-administration/office-of-the-president/office-of-the-provost/institutional-research-and-program-evaluation/factbook.html',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Talent / Ability & Global Perspective',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'NYU seeks independent, globally minded students with strong real-world initiative, creative or entrepreneurial projects, and rigorous coursework.',
  },
  {
    id: 'col_usc',
    collegeName: 'University of Southern California (USC)',
    shortName: 'USC',
    aliases: ['usc', 'university of southern california', 'southern california'],
    location: 'Los Angeles, CA',
    cdsCycle: 'Official USC CDS & Freshman Profile (2024–2025 Published)',
    totalApplicants: 82027,
    totalAccepted: 8038,
    acceptanceRatePercent: 9.8,
    enrolledFreshmen: 3450,
    avgUnweightedGpa: 3.90,
    gpaMiddle50Range: '3.85 – 4.00',
    percentInTop10Class: 89,
    recommendedApIbCourses: 9,
    satMiddle50Range: '1450 – 1540',
    sat25th: 1450,
    sat75th: 1540,
    actMiddle50Range: '32 – 35',
    act25th: 32,
    act75th: 35,
    testPolicy: 'Test-Optional',
    officialCdsUrl: 'https://oir.usc.edu/',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Major-Specific Portfolio & Extracurricular Impact',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'USC prizes interdisciplinary curiosity, tangible project leadership, and strong alignment with your target school (Viterbi, Marshall, Dornsife, or Arts).',
  },
  {
    id: 'col_unc',
    collegeName: 'University of North Carolina at Chapel Hill (UNC)',
    shortName: 'UNC Chapel Hill',
    aliases: ['unc', 'unc chapel hill', 'university of north carolina', 'chapel hill'],
    location: 'Chapel Hill, NC',
    cdsCycle: 'Official UNC Chapel Hill CDS (2024–2025 Published)',
    totalApplicants: 66535,
    totalAccepted: 10380,
    acceptanceRatePercent: 15.6,
    enrolledFreshmen: 4680,
    avgUnweightedGpa: 3.91,
    gpaMiddle50Range: '3.85 – 4.00',
    percentInTop10Class: 92,
    recommendedApIbCourses: 9,
    satMiddle50Range: '1390 – 1530',
    sat25th: 1390,
    sat75th: 1530,
    actMiddle50Range: '30 – 34',
    act25th: 30,
    act75th: 34,
    testPolicy: 'Test-Optional (Required below 2.8 WGPA)',
    officialCdsUrl: 'https://oira.unc.edu/reports/',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA & Class Rank',
      'Extracurricular Service & Community Leadership',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'UNC Chapel Hill emphasizes top-decile academic rigor paired with deep community service and collaborative school leadership.',
  },
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholePhrase(haystack: string, needle: string): boolean {
  const h = haystack.trim().toLowerCase();
  const n = needle.trim().toLowerCase();
  if (!h || !n) return false;
  if (h === n) return true;
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(n)}([^a-z0-9]|$)`, 'i');
  return re.test(h);
}

/**
 * Safe whole-word college matcher so short aliases (like "gt", "cal", "ut", "uw")
 * never falsely match inside unrelated university names (e.g. "washinGTon" or "CALtech").
 */
export function matchesCollegeQuery(
  c: CollegePublishedAdmissionsData,
  rawQuery: string
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return false;
  const nameLower = c.collegeName.toLowerCase();
  const shortLower = c.shortName.toLowerCase();

  if (shortLower === q || nameLower === q) return true;
  if (c.aliases.some((a) => a.toLowerCase() === q)) return true;

  // Allow whole-word phrase match if query is at least 3 chars
  if (q.length >= 3 && (hasWholePhrase(nameLower, q) || hasWholePhrase(shortLower, q))) {
    return true;
  }

  // Only allow an alias to match inside the query if the alias is at least 4 chars AND appears as a whole word/phrase
  return c.aliases.some((alias) => {
    const a = alias.trim().toLowerCase();
    if (a.length >= 4 && hasWholePhrase(q, a)) return true;
    if (q.length >= 4 && hasWholePhrase(a, q)) return true;
    return false;
  });
}

export const COLLEGE_ADMISSIONS_CACHE_KEY =
  'pathfolio_college_admissions_cache_v1';
export const COLLEGE_ADMISSIONS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Reads looked-up colleges from localStorage and automatically prunes stale/expired entries (>30 days).
 */
export function readCachedColleges(): CollegePublishedAdmissionsData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(COLLEGE_ADMISSIONS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const valid = parsed.filter(
      (item): item is CollegePublishedAdmissionsData =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.collegeName === 'string' &&
            !item.isEstimatedFallback &&
            typeof item.expiresAt === 'number' &&
            item.expiresAt > now
        )
    );
    if (valid.length !== parsed.length) {
      window.localStorage.setItem(
        COLLEGE_ADMISSIONS_CACHE_KEY,
        JSON.stringify(valid)
      );
    }
    return valid;
  } catch {
    return [];
  }
}

/**
 * Saves a verified live college lookup into localStorage with a 30-day TTL expiration.
 */
export function saveCachedCollege(
  college: CollegePublishedAdmissionsData
): CollegePublishedAdmissionsData[] {
  if (typeof window === 'undefined') return [];
  const now = Date.now();
  const stamped: CollegePublishedAdmissionsData = {
    ...college,
    isEstimatedFallback: false,
    cachedAt: college.cachedAt || new Date(now).toISOString(),
    expiresAt:
      typeof college.expiresAt === 'number' && college.expiresAt > now
        ? college.expiresAt
        : now + COLLEGE_ADMISSIONS_CACHE_TTL_MS,
  };
  const existing = readCachedColleges().filter(
    (c) =>
      c.id !== stamped.id &&
      c.collegeName.toLowerCase() !== stamped.collegeName.toLowerCase()
  );
  const updated = [stamped, ...existing].slice(0, 50);
  try {
    window.localStorage.setItem(
      COLLEGE_ADMISSIONS_CACHE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    // Ignore storage quota errors
  }
  return updated;
}

/**
 * Matches a college name typed by the user (in dreamColleges or College Tracker)
 * to our published CDS dataset, non-expired cached lookups, or synthesizes a benchmark profile if custom.
 */
export function findCollegeAdmissionsProfile(
  rawQuery: string
): CollegePublishedAdmissionsData {
  const q = rawQuery.trim().toLowerCase();

  // 1. Exact shortName or alias match in built-in dataset first
  const exactMatch = PUBLISHED_COLLEGE_ADMISSIONS_DATA.find(
    (c) =>
      c.shortName.toLowerCase() === q ||
      c.collegeName.toLowerCase() === q ||
      c.aliases.some((a) => a.toLowerCase() === q)
  );
  if (exactMatch) return exactMatch;

  // 2. Whole-word boundary phrase match in built-in dataset
  const phraseMatch = PUBLISHED_COLLEGE_ADMISSIONS_DATA.find((c) =>
    matchesCollegeQuery(c, rawQuery)
  );
  if (phraseMatch) return phraseMatch;

  // 3. Check non-expired cached live lookups in localStorage
  const cachedColleges = readCachedColleges();
  const cachedMatch = cachedColleges.find(
    (c) =>
      c.shortName.toLowerCase() === q ||
      c.collegeName.toLowerCase() === q ||
      c.aliases?.some((a) => a.toLowerCase() === q) ||
      matchesCollegeQuery(c, rawQuery)
  );
  if (cachedMatch) return cachedMatch;

  const cleanTitle = rawQuery.trim() || 'Target University';
  const isUcCampus =
    /\b(uc\s+[a-z]+|university of california|ucsd|ucsb|uci|ucd|ucsc|ucr|ucm)\b/i.test(
      cleanTitle
    );

  if (isUcCampus) {
    return {
      id: `custom_${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      collegeName: cleanTitle,
      shortName: cleanTitle,
      aliases: [q],
      location: 'California',
      cdsCycle: 'Official UC Freshman Admit Profile (Test-Blind)',
      totalApplicants: 95000,
      totalAccepted: 28500,
      acceptanceRatePercent: 30.0,
      enrolledFreshmen: 5800,
      avgUnweightedGpa: 3.86,
      gpaMiddle50Range: '3.76 – 4.00 (UC Capped Weighted 4.02 – 4.26)',
      percentInTop10Class: 92,
      recommendedApIbCourses: 8,
      satMiddle50Range: 'Test-Blind (SAT/ACT Not Considered)',
      sat25th: 0,
      sat75th: 0,
      actMiddle50Range: 'Test-Blind',
      act25th: 0,
      act75th: 0,
      testPolicy: 'Test-Blind (SAT/ACT Not Considered by UC Policy)',
      gpaReportingNote:
        'University of California campuses are strictly Test-Blind and do not consider SAT or ACT scores for admissions or scholarships.',
      cdsVeryImportantFactors: [
        '10th–11th Grade UC-Approved A–G GPA',
        'Rigor of AP / IB / Honors Coursework',
        'Personal Insight Questions (4 PIQs)',
        'Extracurricular Leadership & Community Impact',
      ],
      admittedStudentSpikeSummary:
        'All UC campuses are Test-Blind and evaluate 10th–11th grade GPA, AP/IB course rigor, and authentic impact across your 4 Personal Insight Questions.',
      isEstimatedFallback: true,
    };
  }

  return {
    id: `custom_${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    collegeName: cleanTitle,
    shortName: cleanTitle,
    aliases: [q],
    location: 'United States',
    cdsCycle: 'Estimated Selective University CDS Benchmark',
    totalApplicants: 45000,
    totalAccepted: 7200,
    acceptanceRatePercent: 16.0,
    enrolledFreshmen: 2600,
    avgUnweightedGpa: 3.88,
    gpaMiddle50Range: '3.80 – 3.98',
    percentInTop10Class: 82,
    recommendedApIbCourses: 8,
    satMiddle50Range: '1390 – 1520',
    sat25th: 1390,
    sat75th: 1520,
    actMiddle50Range: '31 – 34',
    act25th: 31,
    act75th: 34,
    testPolicy: 'Holistic Review (Check Official CDS)',
    cdsVeryImportantFactors: [
      'Rigor of Secondary School Record',
      'Academic GPA',
      'Extracurricular Leadership & Continuity',
      'Application Essays',
    ],
    admittedStudentSpikeSummary:
      'Selective universities look for upward GPA trends, rigorous honors/AP coursework, multi-year commitment in 2–3 core activities, and measurable leadership impact.',
    isEstimatedFallback: true,
  };
}

/**
 * Parses comma/semicolon-separated dream colleges + tracked colleges into a deduplicated list.
 */
export function resolveStudentTargetColleges(
  dreamCollegesStr: string,
  trackedCollegeNames: string[]
): CollegePublishedAdmissionsData[] {
  const tokens = [
    ...dreamCollegesStr
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2),
    ...trackedCollegeNames.map((s) => s.trim()).filter((s) => s.length >= 2),
  ];

  const seenIds = new Set<string>();
  const result: CollegePublishedAdmissionsData[] = [];

  for (const tok of tokens) {
    const profile = findCollegeAdmissionsProfile(tok);
    if (!seenIds.has(profile.id)) {
      seenIds.add(profile.id);
      result.push(profile);
    }
  }

  // Only populate default benchmark colleges if the user has not entered any dream or tracked colleges yet
  if (result.length === 0) {
    for (const fallback of PUBLISHED_COLLEGE_ADMISSIONS_DATA.slice(0, 4)) {
      if (!seenIds.has(fallback.id)) {
        seenIds.add(fallback.id);
        result.push(fallback);
      }
    }
  }

  return result;
}

/**
 * Evaluates a student's current GPA, course rigor, SAT/ACT, activities, and honors
 * against a target college's published CDS benchmarks and produces concrete improvement steps.
 */
export function evaluateStudentForCollege(
  college: CollegePublishedAdmissionsData,
  profile: UserProfile,
  familyProfile: FamilyProfileItem,
  activities: ActivityItem[],
  honors: HonorAwardItem[]
): StudentCollegeGapEvaluation {
  // 1. Parse student's Unweighted GPA
  const parsedUwGpa = parseFloat(familyProfile.unweightedGpa);
  const hasUwGpa = !Number.isNaN(parsedUwGpa) && parsedUwGpa > 0 && parsedUwGpa <= 4.05;
  const studentUw = hasUwGpa ? Number(parsedUwGpa.toFixed(2)) : null;

  let gpaStatus: 'On Target' | 'Close' | 'Needs Improvement' | 'Not Entered' =
    'Not Entered';
  let gpaSummary =
    'Add your Unweighted GPA on the Profile & Family tab to see your exact GPA delta.';
  let gpaScorePoints = 20; // out of 30

  if (studentUw !== null) {
    const delta = Number((studentUw - college.avgUnweightedGpa).toFixed(2));
    if (delta >= -0.03) {
      gpaStatus = 'On Target';
      gpaSummary = `Your ${studentUw.toFixed(2)} GPA meets or exceeds ${college.shortName}'s ${college.avgUnweightedGpa.toFixed(2)} admitted average.`;
      gpaScorePoints = 30;
    } else if (delta >= -0.12) {
      gpaStatus = 'Close';
      gpaSummary = `Your ${studentUw.toFixed(2)} GPA is within ${Math.abs(delta).toFixed(2)} pts of ${college.shortName}'s ${college.avgUnweightedGpa.toFixed(2)} admitted average.`;
      gpaScorePoints = 23;
    } else {
      gpaStatus = 'Needs Improvement';
      gpaSummary = `Your ${studentUw.toFixed(2)} GPA is ${Math.abs(delta).toFixed(2)} pts below ${college.shortName}'s ${college.avgUnweightedGpa.toFixed(2)} admitted average (${college.gpaMiddle50Range}).`;
      gpaScorePoints = 15;
    }
  }

  // 2. Course Rigor & Class Rank
  const classRankText = familyProfile.classRank || 'Not entered';
  const curriculumLabel = familyProfile.curriculumType || 'AP / Honors';
  const hasWeighted = Boolean(familyProfile.weightedGpa?.trim());

  let rigorStatus: 'On Target' | 'Close' | 'Needs Improvement' = 'On Target';
  let rigorScorePoints = 20; // out of 20
  if (
    curriculumLabel.includes('AP') ||
    curriculumLabel.includes('IB') ||
    curriculumLabel.includes('Dual') ||
    hasWeighted
  ) {
    rigorStatus = 'On Target';
    rigorScorePoints = 20;
  } else {
    rigorStatus = 'Close';
    rigorScorePoints = 15;
  }

  const rigorSummary = `${curriculumLabel} track · Weighted GPA: ${familyProfile.weightedGpa || 'Not entered'} · Class Rank: ${classRankText} (${college.percentInTop10Class}% of ${college.shortName} admits are in Top 10%).`;

  // 3. Standardized Testing (SAT / ACT / PSAT from familyProfile.satActScore)
  const rawScoreStr = (familyProfile.satActScore || '').trim();
  const isTestBlind =
    /test[-\s]*blind|test[-\s]*free|not considered/i.test(college.testPolicy) ||
    /test[-\s]*blind|not considered/i.test(college.satMiddle50Range) ||
    /\b(uc\s+|university of california)\b/i.test(college.collegeName);

  // Detect PSAT (PSAT 8/9, PSAT 10, PSAT/NMSQT) so it is NEVER mistaken for an official 1600-scale SAT
  const psatExplicitMatch =
    rawScoreStr.match(
      /\b(PSAT(?:\s*(?:8\/9|10|\/NMSQT))?\s*[:=-]?\s*\d{3,4}|\d{3,4}\s*PSAT(?:\s*(?:8\/9|10|\/NMSQT))?)\b/i
    ) ||
    (/\bpsat\b/i.test(rawScoreStr) ? [rawScoreStr, rawScoreStr] : null);

  const studentPsat: string | null = psatExplicitMatch
    ? psatExplicitMatch[1].trim()
    : null;

  // Strip PSAT segments before looking for official SAT scores
  const scoreWithoutPsat = rawScoreStr
    .replace(
      /\bPSAT(?:\s*(?:8\/9|10|\/NMSQT))?\s*[:=-]?\s*\d{3,4}\b/gi,
      ''
    )
    .replace(/\b\d{3,4}\s*PSAT(?:\s*(?:8\/9|10|\/NMSQT))?\b/gi, '');

  const hasUnstrippedPsatOnly =
    /\bpsat\b/i.test(rawScoreStr) && !/\b(?<!p)sat\b/i.test(rawScoreStr);

  const satMatch = hasUnstrippedPsatOnly
    ? null
    : scoreWithoutPsat.match(/\b(1[0-5][0-9]0|1600|[4-9][0-9]0)\b/);
  const actMatch =
    scoreWithoutPsat.match(/\b([1-2][0-9]|3[0-6])\s*ACT\b/i) ||
    scoreWithoutPsat.match(/\bACT\s*[:=-]?\s*([1-2][0-9]|3[0-6])\b/i);

  const parsedSat = satMatch ? parseInt(satMatch[1], 10) : NaN;
  const hasSat = !Number.isNaN(parsedSat) && parsedSat >= 400 && parsedSat <= 1600;
  const parsedAct = actMatch ? parseInt(actMatch[1], 10) : NaN;
  const hasAct = !Number.isNaN(parsedAct) && parsedAct >= 1 && parsedAct <= 36;

  let testStatus: StudentCollegeGapEvaluation['testingComparison']['status'] =
    'Not Entered';
  let testSummary = `Published Middle 50%: SAT ${college.satMiddle50Range} · ACT ${college.actMiddle50Range}.`;
  let testScorePoints = 16; // out of 20

  if (isTestBlind) {
    testStatus = 'Test-Blind Policy';
    testScorePoints = 20;
    testSummary = `${college.shortName} is strictly Test-Blind — SAT, ACT, and PSAT scores are not considered in admissions decisions. Admissions officers evaluate your 10th–11th grade GPA, AP/IB course rigor, and essays instead.`;
  } else if (hasSat) {
    if (parsedSat >= college.sat25th) {
      testStatus = 'On Target';
      testScorePoints = 20;
      testSummary = `Your ${parsedSat} SAT is inside or above ${college.shortName}'s ${college.satMiddle50Range} middle 50% range.`;
    } else if (parsedSat >= college.sat25th - 60) {
      testStatus = 'Close';
      testScorePoints = 15;
      testSummary = `Your ${parsedSat} SAT is ${college.sat25th - parsedSat} pts below the 25th percentile (${college.sat25th}); aim for ${Math.min(1600, college.sat25th + 30)}+.`;
    } else {
      testStatus = 'Needs Improvement';
      testScorePoints = 10;
      testSummary = `Your ${parsedSat} SAT is below ${college.shortName}'s ${college.satMiddle50Range} range; target a +${college.sat25th - parsedSat} pt boost.`;
    }
  } else if (hasAct) {
    if (parsedAct >= college.act25th) {
      testStatus = 'On Target';
      testScorePoints = 20;
      testSummary = `Your ${parsedAct} ACT is inside or above ${college.shortName}'s ${college.actMiddle50Range} middle 50% range.`;
    } else if (parsedAct >= college.act25th - 2) {
      testStatus = 'Close';
      testScorePoints = 15;
      testSummary = `Your ${parsedAct} ACT is ${college.act25th - parsedAct} pts below the 25th percentile (${college.act25th}).`;
    } else {
      testStatus = 'Needs Improvement';
      testScorePoints = 10;
      testSummary = `Your ${parsedAct} ACT is below ${college.shortName}'s ${college.actMiddle50Range} range.`;
    }
  } else if (studentPsat) {
    testStatus = 'Pre-SAT Baseline';
    testScorePoints = 18;
    testSummary = `${studentPsat} is a practice Pre-SAT baseline (PSAT 8/9 is scored out of 1440; PSAT 10/NMSQT out of 1520) and is not compared directly against ${college.shortName}'s 1600-scale SAT range (${college.satMiddle50Range}). Plan to take the official SAT or ACT in 11th grade.`;
  }

  // 4. Extracurricular Depth, Leadership & Honors
  const totalHours = activities.reduce(
    (acc, a) => acc + computeActivityHours(a),
    0
  );
  const leadershipCount = activities.filter((a) =>
    /(captain|president|founder|lead|director|editor|chair|coach|coordinator)/i.test(
      `${a.position} ${a.description}`
    )
  ).length;
  const tierHonorsCount = honors.filter(
    (h) => h.recognitionLevel !== 'School'
  ).length;

  let actScorePoints = 18; // out of 30
  let actStatus: 'On Target' | 'Close' | 'Needs Improvement' = 'Close';
  if (
    activities.length >= 5 &&
    leadershipCount >= 2 &&
    tierHonorsCount >= 2 &&
    totalHours >= 350
  ) {
    actStatus = 'On Target';
    actScorePoints = 28;
  } else if (activities.length >= 3 && leadershipCount >= 1) {
    actStatus = 'Close';
    actScorePoints = 22;
  } else {
    actStatus = 'Needs Improvement';
    actScorePoints = 14;
  }

  const actSummary = `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} (${totalHours.toLocaleString()}h), ${leadershipCount} leadership ${leadershipCount === 1 ? 'role' : 'roles'}, and ${tierHonorsCount} State/National/Intl ${tierHonorsCount === 1 ? 'honor' : 'honors'} logged.`;

  const rawAcademicFitPoints =
    gpaScorePoints + rigorScorePoints + testScorePoints + actScorePoints;
  const overallMatchScore = Math.min(98, Math.max(35, rawAcademicFitPoints));

  const benchmarksMetCount = [
    gpaStatus === 'On Target',
    rigorStatus === 'On Target',
    testStatus === 'On Target' || testStatus === 'Test-Blind Policy',
    actStatus === 'On Target',
  ].filter(Boolean).length;

  // Factor the university's admit rate directly into Reach / Target / Likely classification
  // so an ultra-selective (<12% admit) school is NEVER labeled "Strong Fit" or read as 98% odds.
  const admitRate = college.acceptanceRatePercent;
  let selectivityTier: 'High-Reach' | 'Reach' | 'Target' | 'Likely' = 'Reach';
  let selectivitySummary = '';
  let competitivenessLabel = '';

  if (admitRate < 10) {
    selectivityTier = 'High-Reach';
    competitivenessLabel =
      benchmarksMetCount >= 3
        ? `High-Reach (${admitRate}% Admit Rate) · Academic Benchmarks Met`
        : `High-Reach (${admitRate}% Admit Rate) · Strengthen Key Areas`;
    selectivitySummary = `Ultra-selective (${admitRate}% admit rate): Even with a 4.0 GPA and top test scores, ${college.shortName} is a High-Reach for every applicant.`;
  } else if (admitRate < 22) {
    selectivityTier = benchmarksMetCount >= 3 ? 'Reach' : 'High-Reach';
    competitivenessLabel =
      benchmarksMetCount >= 3
        ? `Reach (${admitRate}% Admit Rate) · In Admitted Range`
        : `High-Reach (${admitRate}% Admit Rate) · Below Admitted Mid-50%`;
    selectivitySummary = `Highly selective (${admitRate}% admit rate): Treat ${college.shortName} as a ${selectivityTier} school; ${benchmarksMetCount}/4 profile benchmarks are currently on target.`;
  } else if (admitRate < 45) {
    if (benchmarksMetCount >= 3 && gpaStatus === 'On Target') {
      selectivityTier = 'Target';
      competitivenessLabel = `Target (${admitRate}% Admit Rate) · On Track for Admitted Profile`;
    } else {
      selectivityTier = 'Reach';
      competitivenessLabel = `Reach (${admitRate}% Admit Rate) · Close to Admitted Profile`;
    }
    selectivitySummary = `Selective (${admitRate}% overall admit rate; competitive majors like CS/Engineering are more selective). You currently meet ${benchmarksMetCount}/4 benchmarks.`;
  } else {
    if (benchmarksMetCount >= 3 && gpaStatus === 'On Target') {
      selectivityTier = 'Likely';
      competitivenessLabel = `Likely / Target (${admitRate}% Admit Rate) · Above Admitted Average`;
    } else if (benchmarksMetCount >= 2 || gpaStatus === 'Close') {
      selectivityTier = 'Target';
      competitivenessLabel = `Target (${admitRate}% Admit Rate) · Competitive Profile`;
    } else {
      selectivityTier = 'Reach';
      competitivenessLabel = `Reach (${admitRate}% Admit Rate) · Build GPA & Rigor`;
    }
    selectivitySummary = `${admitRate}% overall acceptance rate: Your current stats place ${college.shortName} in the ${selectivityTier} tier (${benchmarksMetCount}/4 benchmarks met).`;
  }

  // 5. Build Concrete "What You Need to Improve for [College Name]" Action Plan
  const whatToImprove: StudentCollegeGapEvaluation['whatToImprove'] = [];

  // Pillar 1: GPA & Rigor
  if (gpaStatus === 'Needs Improvement' || gpaStatus === 'Close') {
    whatToImprove.push({
      category: 'GPA & Course Rigor',
      priority: 'High Priority',
      title: `Raise Unweighted GPA Toward ${college.avgUnweightedGpa.toFixed(2)} (${college.percentInTop10Class}% of admits are Top 10% of class)`,
      actionStep: `Prioritize A's in core academic subjects (especially advanced Math, Lab Sciences, and English) over the next two semesters, and aim for ${college.recommendedApIbCourses}+ total AP/IB courses by 12th grade.`,
    });
  } else {
    whatToImprove.push({
      category: 'GPA & Course Rigor',
      priority: rigorStatus === 'On Target' ? 'On Track — Maintain' : 'Recommended',
      title: `Maintain ${studentUw ? studentUw.toFixed(2) : '3.90+'} GPA & Complete ${college.recommendedApIbCourses}+ AP/IB Courses`,
      actionStep: `Admitted ${college.shortName} students average a ${college.avgUnweightedGpa.toFixed(2)} unweighted GPA. Keep your upward grade trend and enroll in the highest-level AP/IB classes offered at your school related to ${familyProfile.intendedMajors || 'your intended major'}.`,
    });
  }

  // Pillar 2: Standardized Testing
  if (isTestBlind) {
    whatToImprove.push({
      category: 'Standardized Testing',
      priority: 'Recommended',
      title: `${college.shortName} is Test-Blind — Focus on AP Exam Scores (4s & 5s)`,
      actionStep: `${college.shortName} does not use SAT/ACT scores for admission, but AP and IB exam scores (4s and 5s) are evaluated to verify your academic mastery across subjects.`,
    });
  } else if (!hasSat && !hasAct && studentPsat) {
    whatToImprove.push({
      category: 'Standardized Testing',
      priority: 'Recommended',
      title: `Build From Your ${studentPsat} Baseline Toward ${college.shortName}'s ${college.satMiddle50Range} SAT Range`,
      actionStep: `Colleges do not use PSAT 8/9 or PSAT 10 scores for admission (they are scored on a 1440/1520 practice scale). Use your strong PSAT baseline to prepare for the 11th-grade PSAT/NMSQT (National Merit) and an official 1600-scale SAT target of ${Math.round((college.sat25th + college.sat75th) / 2)}+.`,
    });
  } else if (!hasSat && !hasAct) {
    whatToImprove.push({
      category: 'Standardized Testing',
      priority: 'Recommended',
      title: `Target ${college.satMiddle50Range} SAT or ${college.actMiddle50Range} ACT (${college.testPolicy})`,
      actionStep: `Take a full timed diagnostic SAT/ACT and aim for at least ${Math.round((college.sat25th + college.sat75th) / 2)} SAT (or ${college.act75th} ACT) to sit in the upper half of ${college.shortName}'s admitted pool.`,
    });
  } else if (testStatus !== 'On Target') {
    whatToImprove.push({
      category: 'Standardized Testing',
      priority: 'High Priority',
      title: `Boost Testing Into ${college.shortName}'s ${college.satMiddle50Range} SAT / ${college.actMiddle50Range} ACT Band`,
      actionStep: `Focus prep on your lower section to gain +${hasSat ? Math.max(30, college.sat25th - parsedSat + 20) : 2} points so your score clears the 50th percentile of admitted ${college.shortName} applicants.`,
    });
  } else {
    whatToImprove.push({
      category: 'Standardized Testing',
      priority: 'On Track — Maintain',
      title: `Testing Competitive (${hasSat ? `${parsedSat} SAT` : `${parsedAct} ACT`} vs ${college.satMiddle50Range})`,
      actionStep: `Your test score is already inside ${college.shortName}'s admitted range. Shift your time toward regional/national competitions and leadership impact.`,
    });
  }

  // Pillar 3: Extracurricular Spike for Intended Major
  const majorLabel = familyProfile.intendedMajors || 'your target major';
  if (leadershipCount < 2 || activities.length < 5) {
    whatToImprove.push({
      category: 'Extracurricular Spike',
      priority: 'High Priority',
      title: `Deepen Measurable Leadership & "${majorLabel}" Spike`,
      actionStep: `${college.admittedStudentSpikeSummary} Aim to step into a Captain, Founder, or Lead Coordinator role where you can quantify impact (e.g., students mentored, projects deployed, or funds/hours mobilized).`,
    });
  } else {
    whatToImprove.push({
      category: 'Extracurricular Spike',
      priority: 'Recommended',
      title: `Scale Your Top 3 Activities Beyond School Walls`,
      actionStep: `You already have ${leadershipCount} leadership roles. To stand out in ${college.shortName}'s ${college.acceptanceRatePercent}% acceptance pool (${college.totalAccepted.toLocaleString()} accepted out of ${college.totalApplicants.toLocaleString()} applicants), expand your top project to the district, regional, or state level.`,
    });
  }

  // Pillar 4: Honors & Application Essays
  if (tierHonorsCount < 2) {
    whatToImprove.push({
      category: 'Honors & Essays',
      priority: 'High Priority',
      title: `Add Regional, State, or National Distinctions (Currently ${tierHonorsCount}/5 above School level)`,
      actionStep: `Compete in regional/state Olympiads (AMC/Math Olympiad, Science Olympiad, Robotics, Debate, or State Music/Art showcases) to fill all 5 Common App Honors slots with State/National recognition.`,
    });
  } else {
    whatToImprove.push({
      category: 'Honors & Essays',
      priority: 'Recommended',
      title: `Connect Your Essay Seeds to ${college.shortName}'s Top CDS Priorities`,
      actionStep: `${college.shortName} rates "${college.cdsVeryImportantFactors.slice(0, 3).join(', ')}" as Very Important. Use your bookmarked Reflection Essay Seeds to show authentic personal growth and intellectual curiosity.`,
    });
  }

  return {
    college,
    overallMatchScore,
    selectivityTier,
    selectivitySummary,
    benchmarksMetCount,
    competitivenessLabel,
    gpaComparison: {
      studentUnweighted: studentUw,
      collegeAvgUnweighted: college.avgUnweightedGpa,
      delta:
        studentUw !== null
          ? Number((studentUw - college.avgUnweightedGpa).toFixed(2))
          : null,
      status: gpaStatus,
      summary: gpaSummary,
    },
    rigorComparison: {
      studentApIbCount: college.recommendedApIbCourses,
      gradeAdjustedTarget: college.recommendedApIbCourses,
      collegeSeniorTarget: college.recommendedApIbCourses,
      status: rigorStatus,
      summary: rigorSummary,
    },
    testingComparison: {
      studentSat: hasSat ? parsedSat : null,
      studentAct: hasAct ? parsedAct : null,
      studentPsat,
      isTestBlind,
      status: testStatus,
      summary: testSummary,
    },
    activityAndHonorsComparison: {
      totalActivities: activities.length,
      totalHours,
      leadershipCount,
      tierHonorsCount,
      status: actStatus,
      summary: actSummary,
    },
    whatToImprove,
  };
}
