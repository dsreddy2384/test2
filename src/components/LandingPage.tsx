import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Compass,
  Lock,
  HeartHandshake,
  Download,
  Maximize2,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onStartBlankPortfolio?: () => void;
  onOpenSignIn: () => void;
  onExploreDemo?: () => void;
  onOpenPrivacyPage?: () => void;
  isSignedIn: boolean;
  userEmail?: string | null;
}

type ShowcaseScreenKey = 'timeline' | 'commonapp' | 'essays' | 'colleges';

interface ShowcaseScreenItem {
  key: ShowcaseScreenKey;
  title: string;
  shortLabel: string;
  caption: string;
  browserUrl: string;
  imageSrc: string;
  mobileImageSrc: string;
  alt: string;
}

interface StudentShowcaseProfile {
  id: 'maya' | 'jordan' | 'aarav';
  pillLabel: string;
  firstName: string;
  gradeText: string;
  studentSummary: string;
  screens: ShowcaseScreenItem[];
}

const STUDENT_SHOWCASES: StudentShowcaseProfile[] = [
  {
    id: 'maya',
    pillLabel: 'Maya · 12th',
    firstName: 'Maya',
    gradeText: '12th grade',
    studentSummary: 'Public high school in Texas · 3.96 GPA · 1520 SAT · varsity robotics captain & Title I STEM mentor',
    screens: [
      {
        key: 'timeline',
        title: 'Seven-year timeline',
        shortLabel: 'Timeline',
        caption: 'Every activity from 6th grade on, organized in one multi-year view.',
        browserUrl: 'pathtoadmit.com/portfolio/timeline',
        imageSrc: '/assets/portfolio-screens/maya-timeline.webp',
        mobileImageSrc: '/assets/portfolio-screens/maya-timeline-mobile.webp',
        alt: 'Maya 12th grade seven-year activity timeline screenshot from 6th to 12th grade',
      },
      {
        key: 'commonapp',
        title: 'Common App Top 10',
        shortLabel: 'Common App Top 10',
        caption: 'Ten activity slots ranked and trimmed to the strict 150-character limit.',
        browserUrl: 'pathtoadmit.com/portfolio/common-app',
        imageSrc: '/assets/portfolio-screens/maya-commonapp.webp',
        mobileImageSrc: '/assets/portfolio-screens/maya-commonapp-mobile.webp',
        alt: 'Maya 12th grade Common App Top 10 activities screenshot with 150-character descriptions',
      },
      {
        key: 'essays',
        title: 'Essay seeds',
        shortLabel: 'Essay seeds',
        caption: 'Short reflections from 10th and 11th grade saved for senior essays.',
        browserUrl: 'pathtoadmit.com/portfolio/essay-seeds',
        imageSrc: '/assets/portfolio-screens/maya-essays.webp',
        mobileImageSrc: '/assets/portfolio-screens/maya-essays-mobile.webp',
        alt: 'Maya 12th grade bookmarked reflection essay seeds screenshot',
      },
      {
        key: 'colleges',
        title: 'College tracker',
        shortLabel: 'College tracker',
        caption: 'Reach, target, and safety schools compared with published GPA & SAT data.',
        browserUrl: 'pathtoadmit.com/portfolio/colleges',
        imageSrc: '/assets/portfolio-screens/maya-colleges.webp',
        mobileImageSrc: '/assets/portfolio-screens/maya-colleges-mobile.webp',
        alt: 'Maya 12th grade college tracker and Common Data Set benchmarks screenshot',
      },
    ],
  },
  {
    id: 'jordan',
    pillLabel: 'Jordan · 10th',
    firstName: 'Jordan',
    gradeText: '10th grade',
    studentSummary: 'Public high school in Ohio · 3.4 GPA · bakery job, sibling care & auditorium sound tech',
    screens: [
      {
        key: 'timeline',
        title: 'Seven-year timeline',
        shortLabel: 'Timeline',
        caption: 'Part-time work, family care, and live audio tracked across grades 6–10.',
        browserUrl: 'pathtoadmit.com/portfolio/timeline',
        imageSrc: '/assets/portfolio-screens/jordan-timeline.webp',
        mobileImageSrc: '/assets/portfolio-screens/jordan-timeline-mobile.webp',
        alt: 'Jordan 10th grade activity timeline screenshot showing bakery job, sibling care, and guitar',
      },
      {
        key: 'commonapp',
        title: 'Common App Top 10',
        shortLabel: 'Common App Top 10',
        caption: 'Shows how paid work and family responsibilities count on the Common App.',
        browserUrl: 'pathtoadmit.com/portfolio/common-app',
        imageSrc: '/assets/portfolio-screens/jordan-commonapp.webp',
        mobileImageSrc: '/assets/portfolio-screens/jordan-commonapp-mobile.webp',
        alt: 'Jordan 10th grade Common App Top 10 screenshot highlighting part-time job and sibling care',
      },
      {
        key: 'essays',
        title: 'Essay seeds',
        shortLabel: 'Essay seeds',
        caption: 'Real moments from the bakery and helping a younger brother with homework.',
        browserUrl: 'pathtoadmit.com/portfolio/essay-seeds',
        imageSrc: '/assets/portfolio-screens/jordan-essays.webp',
        mobileImageSrc: '/assets/portfolio-screens/jordan-essays-mobile.webp',
        alt: 'Jordan 10th grade essay seeds screenshot with grounded personal stories',
      },
      {
        key: 'colleges',
        title: 'College tracker',
        shortLabel: 'College tracker',
        caption: 'Realistic Midwest public and co-op universities matched to a 3.4 GPA.',
        browserUrl: 'pathtoadmit.com/portfolio/colleges',
        imageSrc: '/assets/portfolio-screens/jordan-colleges.webp',
        mobileImageSrc: '/assets/portfolio-screens/jordan-colleges-mobile.webp',
        alt: 'Jordan 10th grade college tracker screenshot with 3.4 GPA benchmarks',
      },
    ],
  },
  {
    id: 'aarav',
    pillLabel: 'Aarav · 7th',
    firstName: 'Aarav',
    gradeText: '7th grade',
    studentSummary: 'Public middle school in California · 7th grade · Science Olympiad, rec swim & library book drive',
    screens: [
      {
        key: 'timeline',
        title: 'Seven-year timeline',
        shortLabel: 'Timeline',
        caption: 'Tracks 6th–7th grade interests so his strongest middle school commitment can carry forward into high school.',
        browserUrl: 'pathtoadmit.com/portfolio/timeline',
        imageSrc: '/assets/portfolio-screens/aarav-timeline.webp',
        mobileImageSrc: '/assets/portfolio-screens/aarav-timeline-mobile.webp',
        alt: 'Aarav 7th grade timeline screenshot showing strongest middle school commitment carrying forward into high school',
      },
      {
        key: 'commonapp',
        title: 'Carry-forward commitments',
        shortLabel: 'Carry-forward commitments',
        caption: 'Strongest middle school commitment logged early so it can carry forward when 9th-grade Common App tracking begins.',
        browserUrl: 'pathtoadmit.com/portfolio/common-app',
        imageSrc: '/assets/portfolio-screens/aarav-commonapp.webp',
        mobileImageSrc: '/assets/portfolio-screens/aarav-commonapp-mobile.webp',
        alt: 'Aarav 7th grade strongest middle school commitment card ready to carry forward into high school',
      },
      {
        key: 'essays',
        title: 'Essay seeds',
        shortLabel: 'Essay seeds',
        caption: 'Quick curiosity notes after science club and swim meets, saved for later.',
        browserUrl: 'pathtoadmit.com/portfolio/essay-seeds',
        imageSrc: '/assets/portfolio-screens/aarav-essays.webp',
        mobileImageSrc: '/assets/portfolio-screens/aarav-essays-mobile.webp',
        alt: 'Aarav 7th grade early curiosity journal notes screenshot',
      },
      {
        key: 'colleges',
        title: 'College tracker',
        shortLabel: 'College tracker',
        caption: 'Low-pressure 8th-to-9th grade course readiness and high school planning.',
        browserUrl: 'pathtoadmit.com/portfolio/colleges',
        imageSrc: '/assets/portfolio-screens/aarav-colleges.webp',
        mobileImageSrc: '/assets/portfolio-screens/aarav-colleges-mobile.webp',
        alt: 'Aarav 7th grade high school course planning and exploration screenshot',
      },
    ],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onStartBlankPortfolio,
  onOpenSignIn,
  onOpenPrivacyPage,
  isSignedIn,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedStudentId, setSelectedStudentId] = useState<'maya' | 'jordan' | 'aarav'>('maya');
  const [selectedScreenKey, setSelectedScreenKey] = useState<ShowcaseScreenKey>('timeline');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Preload only the current device's image set: active student immediately, and the other two after the page settles
  useEffect(() => {
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches;

    const preloadStudentScreens = (studentId: 'maya' | 'jordan' | 'aarav') => {
      const student = STUDENT_SHOWCASES.find((s) => s.id === studentId);
      if (!student) return;
      student.screens.forEach((scr) => {
        const img = new Image();
        img.src = isDesktop ? scr.imageSrc : scr.mobileImageSrc;
      });
    };

    // 1. Load active student's remaining views right away for the current device
    preloadStudentScreens('maya');

    // 2. Load the other two students after the page settles
    const timer = window.setTimeout(() => {
      preloadStudentScreens('jordan');
      preloadStudentScreens('aarav');
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  // Close lightbox or privacy modal on Escape key
  useEffect(() => {
    if (!isLightboxOpen && !showPrivacyModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setShowPrivacyModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, showPrivacyModal]);

  const activeStudent =
    STUDENT_SHOWCASES.find((s) => s.id === selectedStudentId) || STUDENT_SHOWCASES[0];
  const activeScreenIndex = Math.max(
    0,
    activeStudent.screens.findIndex((s) => s.key === selectedScreenKey)
  );
  const activeScreen = activeStudent.screens[activeScreenIndex] || activeStudent.screens[0];

  const handleSelectStudent = (studentId: 'maya' | 'jordan' | 'aarav') => {
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    setSelectedStudentId(studentId);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - savedScrollY) > 1) {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
        }
      });
    }
  };

  const handleSelectScreen = (screenKey: ShowcaseScreenKey) => {
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    setSelectedScreenKey(screenKey);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - savedScrollY) > 1) {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
        }
      });
    }
  };

  const scrollToCompletedScreens = () => {
    const el = document.getElementById('completed-profile-screens');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrimaryStart = () => {
    if (isSignedIn) {
      onEnterApp();
    } else if (onStartBlankPortfolio) {
      onStartBlankPortfolio();
    } else {
      onOpenSignIn();
    }
  };

  const handleStepScreen = (dir: -1 | 1) => {
    const total = activeStudent.screens.length;
    const nextIndex = (activeScreenIndex + dir + total) % total;
    handleSelectScreen(activeStudent.screens[nextIndex].key);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) > 40) {
      handleStepScreen(deltaX < 0 ? 1 : -1);
    }
  };

  const faqs = [
    {
      q: 'When should a student begin building their PathToAdmit portfolio?',
      a: 'Students can start as early as 6th grade to build reflection habits and track middle school activities, or in 9th grade when official high school Common App tracking begins. For students under age 13 (grades 6–7), a parent or guardian creates the family account first and invites the student.',
    },
    {
      q: 'How does multi-parent and student shared access work?',
      a: 'Parents create the family portfolio with their Google account and can link a co-parent or invite their student. Linked family emails automatically share and sync the same student portfolio, activities, and reflection journal in real time.',
    },
    {
      q: 'Is PathToAdmit formatted to match the Common Application?',
      a: 'Yes. PathToAdmit enforces the official 50-character position, 100-character organization, and 150-character activity description limits used by the Common App, plus 5 academic honors and the 7 personal statement prompts.',
    },
    {
      q: 'How is our family and student data kept private?',
      a: 'Your child’s records are private to your linked family accounts. We never sell student data, display advertisements, or share records with third-party marketers or college list brokers. You can export your portfolio as CSV or JSON or delete your records at any time.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#14233C] font-sans">
      {/* Calm Hero Section on Paper (#FAF8F4) */}
      <section className="relative pt-8 pb-10 md:pt-14 md:pb-16 border-b border-[#E6E1D8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            {/* Quiet Editorial Kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5A6478]">
              <span>Grades 6–12 Admissions Portfolio</span>
              <span aria-hidden="true">·</span>
              <span>Built by Parents for Families</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#276B4E] font-medium">Private by Default</span>
            </div>

            {/* Instrument Serif Headline — Laurel Gold marks ONE phrase only */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal tracking-tight text-[#14233C] leading-[1.1] text-balance">
              Turn grades 6–12 passions into an{' '}
              <span className="italic text-[#7A5B1C]">unforgettable Common App.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#5A6478] leading-relaxed max-w-2xl mx-auto font-normal">
              A calm, private workspace for parents and students to log extracurricular activities, capture reflection essay seeds, and prepare Common App Top 10 descriptions from middle school through senior year.
            </p>

            {/* Primary Action + Secondary Scroll Action in Sentence Case */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePrimaryStart}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>
                  {isSignedIn ? 'Open your portfolio' : 'Start your blank portfolio'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={scrollToCompletedScreens}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] font-semibold text-sm border border-[#E6E1D8] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-[#2B4C8C]" />
                <span>See completed portfolio examples</span>
              </button>
            </div>

            {!isSignedIn && (
              <div>
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="text-xs font-medium text-[#2B4C8C] hover:underline cursor-pointer"
                >
                  Already have a family account or share code? Sign in →
                </button>
              </div>
            )}

            {/* Quiet Unboxed Trust Line */}
            <div className="pt-2 flex items-center justify-center gap-4 text-xs text-[#5A6478] flex-wrap">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#276B4E]" /> Blank workspace for your child
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#276B4E]" /> Parent &amp; student shared sync
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#276B4E]" /> Official 150-character Common App format
              </span>
            </div>
          </div>

          {/* COMPLETED STUDENT PORTFOLIO SCREENS */}
          <div
            id="completed-profile-screens"
            style={{ overflowAnchor: 'none' }}
            className="mt-10 sm:mt-12 scroll-mt-20"
          >
            <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-4 sm:p-7">
              {/* Heading + Standalone Fictional Note + Student Pills + One-Line Student Summary Under Pills */}
              <div className="space-y-3 pb-4 border-b border-[#E6E1D8]">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-normal text-[#14233C]">
                    What a completed portfolio looks like
                  </h2>
                  <p className="text-xs text-[#5A6478] mt-0.5">
                    Sample students, details are fictional
                  </p>
                </div>

                {/* Simple 1-line Pill Switcher right under the heading (All 3 fit cleanly at 375px wide, no visible scrollbar) */}
                <div
                  role="tablist"
                  aria-label="Sample students"
                  className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar"
                >
                  {STUDENT_SHOWCASES.map((student) => {
                    const isSelected = student.id === activeStudent.id;
                    return (
                      <button
                        key={student.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border shrink-0 ${
                          isSelected
                            ? 'bg-[#14233C] text-white border-[#14233C]'
                            : 'bg-[#FAF8F4] hover:bg-[#E6E1D8]/50 text-[#14233C] border-[#E6E1D8]'
                        }`}
                      >
                        {student.pillLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Concise one-line student summary directly under the pills */}
                <p className="text-xs text-[#5A6478] min-h-[1.25rem]">
                  {activeStudent.studentSummary}
                </p>
              </div>

              {/* UNIFIED RESPONSIVE SNAPSHOT LAYOUT (Single <picture> element so each device downloads only its own set) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 pt-4 md:pt-5 items-center">
                {/* Left 4 Cols on Desktop / Top Controls on Mobile */}
                <div className="md:col-span-4">
                  {/* Desktop: 4 Stacked Feature Caption Controls */}
                  <div
                    className="hidden md:flex md:flex-col gap-2.5"
                    role="tablist"
                    aria-label="Portfolio screen views"
                  >
                    {activeStudent.screens.map((scr) => {
                      const isActive = scr.key === activeScreen.key;
                      return (
                        <button
                          key={scr.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectScreen(scr.key)}
                          className={`w-full min-h-[92px] flex flex-col justify-center text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#FAF8F4] border-[#2B4C8C] ring-1 ring-[#2B4C8C]/25 shadow-2xs'
                              : 'bg-white hover:bg-[#FAF8F4]/70 border-[#E6E1D8]'
                          }`}
                        >
                          <div className="text-sm font-semibold text-[#14233C]">
                            {scr.title}
                          </div>
                          <p className="text-xs text-[#5A6478] mt-1 leading-relaxed">
                            {scr.caption}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile: Sideways-scrolling feature pill tabs (no scrollbar) + active caption card */}
                  <div className="md:hidden space-y-3">
                    <div className="relative">
                      <div
                        role="tablist"
                        aria-label="Portfolio screen views"
                        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-8"
                      >
                        {activeStudent.screens.map((scr) => {
                          const isActive = scr.key === activeScreen.key;
                          return (
                            <button
                              key={scr.key}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectScreen(scr.key)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                                isActive
                                  ? 'bg-[#2B4C8C] text-white border-[#2B4C8C] font-semibold'
                                  : 'bg-white text-[#14233C] border-[#E6E1D8]'
                              }`}
                            >
                              {scr.title}
                            </button>
                          );
                        })}
                      </div>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent"
                      />
                    </div>

                    <div className="bg-[#FAF8F4] rounded-xl border border-[#E6E1D8] p-3">
                      <div className="text-xs font-semibold text-[#14233C]">
                        {activeScreen.title}
                      </div>
                      <p className="text-xs text-[#5A6478] mt-0.5 leading-relaxed">
                        {activeScreen.caption}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right 8 Cols: Single Responsive Frame with <picture> Media Queries */}
                <div className="md:col-span-8">
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="rounded-2xl md:rounded-xl border-2 md:border border-[#14233C] md:border-[#E6E1D8] bg-white md:bg-[#FAF8F4] overflow-hidden shadow-xs md:shadow-2xs"
                  >
                    {/* Browser / Phone Header Bar */}
                    <div className="px-3 md:px-3.5 py-2 bg-[#14233C] text-white flex items-center justify-between text-[11px]">
                      <div className="hidden md:flex items-center gap-1.5" aria-hidden="true">
                        <span className="w-2 h-2 rounded-full bg-white/30" />
                        <span className="w-2 h-2 rounded-full bg-white/30" />
                        <span className="w-2 h-2 rounded-full bg-white/30" />
                      </div>

                      <span className="text-slate-200 font-normal truncate md:px-3 md:py-0.5 md:rounded md:bg-white/10 text-[11px]">
                        {activeScreen.browserUrl}
                      </span>

                      {/* Desktop Enlarge Button */}
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-200 hover:text-white cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Enlarge</span>
                      </button>

                      {/* Mobile 1/4 Stepper Arrows */}
                      <div className="flex md:hidden items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStepScreen(-1)}
                          aria-label="Previous screen"
                          className="p-1 rounded hover:bg-white/15 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="tabular-nums text-[10px] text-slate-300">
                          {activeScreenIndex + 1}/4
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStepScreen(1)}
                          aria-label="Next screen"
                          className="p-1 rounded hover:bg-white/15 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Single <picture> element: desktop gets 1360x760 WebP, mobile gets 800x540 zoomed WebP */}
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      aria-label={`Enlarge ${activeScreen.alt}`}
                      className="relative bg-white aspect-[800/540] md:aspect-[16/9] w-full block overflow-hidden cursor-zoom-in"
                    >
                      <picture className="block w-full h-full">
                        <source
                          media="(min-width: 768px)"
                          srcSet={activeScreen.imageSrc}
                          type="image/webp"
                        />
                        <img
                          src={activeScreen.mobileImageSrc}
                          alt={activeScreen.alt}
                          width={1360}
                          height={760}
                          loading="eager"
                          decoding="sync"
                          fetchPriority="high"
                          className="w-full h-full object-contain bg-white"
                        />
                      </picture>
                    </button>

                    {/* Mobile Footer Hint Bar */}
                    <div className="md:hidden px-3 py-1.5 bg-[#FAF8F4] border-t border-[#E6E1D8] flex items-center justify-between text-[11px] text-[#5A6478]">
                      <span>Swipe to switch views</span>
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="inline-flex items-center gap-1 font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Tap to enlarge</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Call to Action Footer Bar inside the Card */}
              <div className="mt-5 pt-4 border-t border-[#E6E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-[#5A6478]">
                  Your own workspace starts blank
                </span>
                <button
                  type="button"
                  onClick={handlePrimaryStart}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <span>
                    {isSignedIn ? 'Open your portfolio' : 'Start your blank portfolio'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Pillars */}
      <section className="py-12 sm:py-16 bg-white border-b border-[#E6E1D8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-12">
            <p className="text-xs font-semibold text-[#2B4C8C] uppercase tracking-wider">
              How PathToAdmit Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#14233C]">
              A calm, credible record from 6th grade to college applications.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#2B4C8C] tabular-nums">
                01. Grades 6–12 Continuity
              </span>
              <h3 className="text-base font-semibold text-[#14233C]">
                Longitudinal Activity Log
              </h3>
              <p className="text-xs text-[#5A6478] leading-relaxed">
                Start in middle school to discover genuine interests, then carry your strongest commitments forward into high school (grades 9–12) for the Common App.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#2B4C8C] tabular-nums">
                02. 150-Character Precision
              </span>
              <h3 className="text-base font-semibold text-[#14233C]">
                Common App Top 10
              </h3>
              <p className="text-xs text-[#5A6478] leading-relaxed">
                Draft, rank, and refine your 10 activity slots with live character counters and impact verbs calibrated for university admissions readers.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#2B4C8C] tabular-nums">
                03. Parent-Led Family Access
              </span>
              <h3 className="text-base font-semibold text-[#14233C]">
                Parent &amp; Student Views
              </h3>
              <p className="text-xs text-[#5A6478] leading-relaxed">
                Parents create the family account and invite their student when ready—giving parents a calm readiness overview and students a supportive workspace.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#2B4C8C] tabular-nums">
                04. Published Benchmarks
              </span>
              <h3 className="text-base font-semibold text-[#14233C]">
                College Data &amp; Essay Lab
              </h3>
              <p className="text-xs text-[#5A6478] leading-relaxed">
                Compare GPA and testing against official Common Data Set (CDS) benchmarks and turn early journal moments into authentic personal statements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-12 sm:py-16 bg-[#FAF8F4] border-b border-[#E6E1D8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B4C8C]">
                <BookOpen className="w-4 h-4" /> Reflection Journal &amp; Essay Seeds
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-normal text-[#14233C]">
                Never ask &ldquo;What should I write my essay about?&rdquo; in 12th grade.
              </h3>
              <p className="text-sm text-[#5A6478] leading-relaxed">
                When something meaningful happens—a tough robotics tournament, a part-time work shift, or helping a younger sibling—capture a 2-minute reflection. Bookmark key moments as Essay Seeds so your senior personal statement grows from real stories.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E6E1D8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#5A6478]">
                <span>10th Grade · Grounded</span>
                <span className="text-[#7A5B1C] font-semibold">★ Bookmarked Essay Seed</span>
              </div>
              <h4 className="text-sm font-semibold text-[#14233C]">
                Teaching 3rd-grade fractions with sourdough dough balls
              </h4>
              <p className="text-xs text-[#5A6478] leading-relaxed italic">
                &ldquo;Between my parents&rsquo; hospital shifts, I watch my nine-year-old brother every afternoon. When math worksheets frustrated him, I used what I learned at my weekend bakery job—dividing dough into quarters and eighths until he grinned.&rdquo;
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-white p-6 rounded-2xl border border-[#E6E1D8] space-y-4 md:order-1 order-2">
              <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
                <span className="text-xs font-semibold text-[#14233C]">
                  Target College Deadlines &amp; Status
                </span>
                <span className="text-[11px] font-medium text-[#2B4C8C]">
                  EA / ED / RD
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F4] border border-[#E6E1D8]">
                  <span className="font-semibold text-[#14233C]">Georgia Tech (Reach)</span>
                  <span className="px-2 py-0.5 rounded bg-[#B8913A]/15 text-[#7A5B1C] font-medium tabular-nums">
                    Nov 1 · In progress
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F4] border border-[#E6E1D8]">
                  <span className="font-semibold text-[#14233C]">UT Austin (Target)</span>
                  <span className="px-2 py-0.5 rounded bg-[#2F7A5A]/12 text-[#276B4E] font-medium tabular-nums">
                    Oct 15 · Ready
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F4] border border-[#E6E1D8]">
                  <span className="font-semibold text-[#14233C]">Purdue University (Safety)</span>
                  <span className="px-2 py-0.5 rounded bg-[#2F7A5A]/12 text-[#276B4E] font-medium tabular-nums">
                    Nov 1 · Submitted
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:order-2 order-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B4C8C]">
                <Calendar className="w-4 h-4" /> College Benchmarks &amp; Application Tracker
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-normal text-[#14233C]">
                Grounded in published university admissions data.
              </h3>
              <p className="text-sm text-[#5A6478] leading-relaxed">
                Organize Reach, Target, and Safety colleges with Early Action, Early Decision, and Regular Decision deadlines. Compare your student&rsquo;s GPA and course rigor against published Common Data Set figures without guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS: "Your Family's Data is Private" & "Built by Parents" Note */}
      <section className="py-12 sm:py-16 bg-white border-b border-[#E6E1D8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left 7 Cols: Your Data is Private */}
            <div className="lg:col-span-7 bg-[#FAF8F4] rounded-2xl border border-[#E6E1D8] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#276B4E]">
                  <Lock className="w-4 h-4" />
                  <span>Your Family&rsquo;s Data is Private</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[#14233C]">
                  A private family record—never sold, shared, or used for ads.
                </h2>
                <p className="text-sm text-[#5A6478] leading-relaxed">
                  Your child&rsquo;s academic record, reflections, and extracurricular history belong strictly to your family. For students under 13 (grades 6–7), parents create and control the family account directly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-white border border-[#E6E1D8]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#14233C]">
                    <ShieldCheck className="w-4 h-4 text-[#276B4E]" />
                    <span>Zero Data Brokers</span>
                  </div>
                  <p className="text-[11px] text-[#5A6478] mt-1 leading-relaxed">
                    We never sell or rent student names, emails, GPAs, or college lists to third parties.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E6E1D8]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#14233C]">
                    <Lock className="w-4 h-4 text-[#2B4C8C]" />
                    <span>Parent-Controlled</span>
                  </div>
                  <p className="text-[11px] text-[#5A6478] mt-1 leading-relaxed">
                    Protected by Google Authentication; parents create the account and choose when to invite their student.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E6E1D8]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#14233C]">
                    <Download className="w-4 h-4 text-[#2B4C8C]" />
                    <span>1-Click Export</span>
                  </div>
                  <p className="text-[11px] text-[#5A6478] mt-1 leading-relaxed">
                    Download your complete portfolio as CSV or JSON backup, or print a clean counselor summary at any time.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <a
                  href="/privacy"
                  onClick={(e) => {
                    if (onOpenPrivacyPage) {
                      e.preventDefault();
                      onOpenPrivacyPage();
                    }
                  }}
                  className="text-xs font-semibold text-[#2B4C8C] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Read our family privacy &amp; data ownership pledge →</span>
                </a>
                <a
                  href="mailto:privacy@pathtoadmit.com"
                  className="text-xs text-[#5A6478] hover:text-[#14233C] hover:underline"
                >
                  Questions? privacy@pathtoadmit.com
                </a>
              </div>
            </div>

            {/* Right 5 Cols: Built by Parents Note */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E1D8] p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#7A5B1C]">
                  <HeartHandshake className="w-4 h-4" />
                  <span>Why We Built PathToAdmit</span>
                </div>
                <h3 className="text-2xl font-serif font-normal text-[#14233C]">
                  Built by parents to replace senior-year panic with calm preparation.
                </h3>
                <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
                  &ldquo;When our own children started middle and high school, we realized how quickly meaningful moments—science fair projects, part-time jobs, coach feedback, and personal breakthroughs—get lost across scattered docs and text threads.&rdquo;
                </p>
                <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
                  &ldquo;We designed PathToAdmit so families can capture those stories calmly over grades 6–12. When 12th grade arrives, your child isn&rsquo;t staring at a blank Common App screen trying to reconstruct four years of their life from memory.&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-[#E6E1D8] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#14233C]">The PathToAdmit Family Team</div>
                  <div className="text-[#5A6478]">Parents, educators &amp; admissions mentors</div>
                </div>
                <span className="text-[11px] font-medium text-[#5A6478]">
                  Grades 6–12
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-12 sm:py-16 bg-[#FAF8F4] border-b border-[#E6E1D8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-2 mb-10">
            <p className="text-xs font-semibold text-[#2B4C8C] uppercase tracking-wider">
              Frequently Asked Questions
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[#14233C]">
              Clear answers for students and parents.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E6E1D8] overflow-hidden transition-colors bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 font-semibold text-sm sm:text-base text-[#14233C] flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F4]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#5A6478] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#2B4C8C]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[#5A6478] leading-relaxed border-t border-[#E6E1D8] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Footer Section in Flat Ink Navy (#14233C) */}
      <section className="py-12 sm:py-16 bg-[#14233C] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight">
            Ready to start your child&rsquo;s{' '}
            <span className="italic text-[#B8913A]">grades 6–12 portfolio?</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto font-normal">
            Start with a clean, blank portfolio for your student, or browse the sample portfolio snapshots above for inspiration.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handlePrimaryStart}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] font-semibold text-sm transition-colors cursor-pointer shadow-xs"
            >
              {isSignedIn ? 'Open your portfolio' : 'Start your blank portfolio'}
            </button>
            <button
              type="button"
              onClick={scrollToCompletedScreens}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-sm transition-colors cursor-pointer"
            >
              See completed portfolio examples ↑
            </button>
          </div>
          <div className="pt-8 text-xs text-slate-300 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              &copy; {new Date().getFullYear()} PathToAdmit (pathtoadmit.com). Built by parents for families.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="/privacy"
                onClick={(e) => {
                  if (onOpenPrivacyPage) {
                    e.preventDefault();
                    onOpenPrivacyPage();
                  }
                }}
                className="text-white hover:underline cursor-pointer"
              >
                Privacy &amp; data ownership
              </a>
              <span aria-hidden="true">·</span>
              <a
                href="mailto:privacy@pathtoadmit.com"
                className="text-slate-300 hover:text-white hover:underline"
              >
                privacy@pathtoadmit.com
              </a>
              <span aria-hidden="true">·</span>
              <span>Grades 6–12</span>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Data Ownership Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E6E1D8] max-w-lg w-full p-6 shadow-xl space-y-4 text-[#14233C]">
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#276B4E]" />
                <h3 className="text-base font-semibold">
                  Family Privacy &amp; Data Ownership Pledge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-lg text-[#5A6478] hover:text-[#14233C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              <p>
                <strong className="text-[#14233C]">1. Private by Default &amp; Under-13 Protection:</strong> For students in grades 6–8 (or under age 13), a parent or guardian creates the account and controls student access.
              </p>
              <p>
                <strong className="text-[#14233C]">2. AI Coaching Provider (Google Gemini API):</strong> Optional coaching requests are sent over encrypted HTTPS to the Google Gemini API solely to generate feedback and are not used to train public AI models.
              </p>
              <p>
                <strong className="text-[#14233C]">3. Contact &amp; Deletion:</strong> Export or delete your data with one click in settings, or email <a href="mailto:privacy@pathtoadmit.com" className="text-[#2B4C8C] underline">privacy@pathtoadmit.com</a>.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 rounded-xl bg-[#14233C] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Resolution Screenshot Lightbox Modal (Tap to Enlarge) */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E6E1D8] max-w-5xl w-full overflow-hidden shadow-2xl text-[#14233C]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#14233C] text-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold truncate">
                  {activeStudent.pillLabel} · {activeScreen.title}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {activeScreen.caption}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepScreen(-1)}
                  aria-label="Previous screen"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs tabular-nums text-slate-200 px-1">
                  {activeScreenIndex + 1}/4
                </span>
                <button
                  type="button"
                  onClick={() => handleStepScreen(1)}
                  aria-label="Next screen"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  aria-label="Close enlarged preview"
                  className="ml-1 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-[#FAF8F4] p-2 sm:p-4 overflow-x-auto max-h-[80vh]">
              <img
                src={activeScreen.imageSrc}
                alt={activeScreen.alt}
                width={1360}
                height={760}
                className="w-full min-w-[640px] sm:min-w-0 h-auto rounded-xl border border-[#E6E1D8] bg-white mx-auto"
              />
            </div>

            <div className="px-4 py-2.5 bg-white border-t border-[#E6E1D8] flex items-center justify-between text-xs text-[#5A6478]">
              <span>Sample student preview · {activeScreen.browserUrl}</span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#14233C] text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
