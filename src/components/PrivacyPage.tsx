import React from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  ArrowLeft,
  Check,
  Users,
  Trash2,
  Mail,
  Sparkles,
  Database,
} from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
  onStartPortfolio: () => void;
  isSignedIn: boolean;
}

const PrivacyEmail: React.FC<{ className?: string }> = ({ className }) => (
  <a
    href="mailto:privacy@pathtoadmit.com"
    className={className || 'text-[#2B4C8C] underline'}
  >
    privacy@pathtoadmit.com
  </a>
);

const Item: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <li className="flex items-start gap-2">
    <Check className="w-4 h-4 text-[#276B4E] shrink-0 mt-0.5" />
    <span>
      <strong className="text-[#14233C]">{title}</strong> {children}
    </span>
  </li>
);

// Keep every statement on this page in step with what the code actually does
// (server.ts AI routes, server/store.ts, the Firestore rules and the client storage).
export const PrivacyPage: React.FC<PrivacyPageProps> = ({
  onBack,
  onStartPortfolio,
  isSignedIn,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#14233C] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        {/* Breadcrumb / Back Link */}
        <div>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to PathToAdmit</span>
          </a>
        </div>

        {/* Header */}
        <header className="space-y-4 border-b border-[#E6E1D8] pb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#276B4E]">
            <ShieldCheck className="w-4 h-4" />
            <span>Family Privacy &amp; Data Ownership Pledge</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#14233C] tracking-tight leading-tight">
            Your child&rsquo;s academic and extracurricular record belongs to your family.
          </h1>
          <p className="text-sm sm:text-base text-[#5A6478] leading-relaxed max-w-2xl">
            PathToAdmit was built by parents for families. We don&rsquo;t sell student profiles,
            build recruiting lists or show ads. This page explains, in plain language, what we
            store, who can see it, what is sent to outside services and how to delete it.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A6478] pt-1">
            <span>Last updated: October 28, 2026</span>
            <span aria-hidden="true">·</span>
            <span>
              Privacy contact: <PrivacyEmail className="text-[#2B4C8C] font-semibold hover:underline" />
            </span>
          </div>
        </header>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-[#E6E1D8] p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#14233C]">
              <ShieldCheck className="w-4 h-4 text-[#276B4E]" />
              <h2>1. No data brokers or ad networks</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              We never sell, rent, or share student names, email addresses, GPAs, test scores,
              reflections, or target college lists with marketers, data brokers, or college
              recruiting services.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E1D8] p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#14233C]">
              <Lock className="w-4 h-4 text-[#2B4C8C]" />
              <h2>2. Who can see your portfolio</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              Your portfolio is stored in Google Cloud Firestore and protected by Google sign-in.
              Only the account that created it can open it, plus the family members whose Google
              email address you add as a linked parent or student email. Other families never see it.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E1D8] p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#14233C]">
              <Download className="w-4 h-4 text-[#2B4C8C]" />
              <h2>3. Export whenever you like</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              You own your entries. From the Application tab you can export your activities as a
              spreadsheet (CSV), download a complete JSON backup, or print a summary sheet.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E1D8] p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#14233C]">
              <Trash2 className="w-4 h-4 text-[#A13D34]" />
              <h2>4. Deleting your data</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              When you delete an activity, reflection, honor or the whole portfolio, it first goes
              to a 30-day trash so it can be restored. After 30 days it is permanently deleted the
              next time a family member opens PathToAdmit. To delete your account and every record
              right away, email <PrivacyEmail />.
            </p>
          </div>
        </section>

        {/* Detailed Policy Sections */}
        <section className="bg-white rounded-2xl border border-[#E6E1D8] p-6 sm:p-8 space-y-6">
          {/* Children Under 13 & COPPA Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-normal text-[#14233C] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#276B4E]" />
              <span>Children under 13 &amp; parent-created accounts (grades 6–8)</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              Families often start logging activities in 6th grade (around age 11), so PathToAdmit
              is designed for parents to set up and manage accounts, in line with U.S.
              children&rsquo;s privacy law (COPPA):
            </p>
            <ul className="space-y-2 pt-1 text-xs sm:text-sm text-[#5A6478]">
              <Item title="A parent creates the account:">
                For a student under 13, a parent or legal guardian should create the account with the
                parent&rsquo;s own Google account and manage the child&rsquo;s portfolio. If we learn
                that a child under 13 created an account without a parent, we will delete it.
              </Item>
              <Item title="The parent decides on student access:">
                A parent can manage the portfolio alone, or add their student&rsquo;s email address
                to give the student shared access.
              </Item>
              <Item title="Parental review, export &amp; deletion:">
                Parents can see, edit and export (CSV/JSON) everything in the portfolio, remove a
                linked student email, and delete records as described above. For full and immediate
                deletion, email <PrivacyEmail />.
              </Item>
            </ul>
          </div>

          {/* What Information PathToAdmit Stores */}
          <div className="space-y-2 pt-5 border-t border-[#E6E1D8]">
            <h2 className="text-xl font-serif font-normal text-[#14233C] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2B4C8C]" />
              <span>What information PathToAdmit stores</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              We store what you and your linked family members enter, plus what is needed to run
              the service:
            </p>
            <ul className="space-y-2 pt-1 text-xs sm:text-sm text-[#5A6478]">
              <Item title="Google account:">
                Your name and email address from Google sign-in (Firebase Authentication).
              </Item>
              <Item title="Student &amp; school details:">
                Student name, grade (6–12), graduation year, school, GPA, optional test scores,
                curriculum, intended majors and target colleges.
              </Item>
              <Item title="Family details you choose to add:">
                Parent or guardian names, relationship, education and occupation, household
                structure, first-generation and fee-waiver answers, siblings, languages at home and
                home ZIP code. All of these are optional.
              </Item>
              <Item title="Activities, honors &amp; writing:">
                Activities and their Common App descriptions, honors, reflection journal entries,
                essay drafts and college deadlines.
              </Item>
              <Item title="Shared family copy:">
                When you link family emails, we keep a copy of the portfolio on our server (in Google
                Cloud Firestore) so linked parents and students can load it on their own devices.
                Only the account that created it and the linked, signed-in Google accounts can load it.
              </Item>
              <Item title="AI usage counts:">
                How many AI requests each account made per day, to enforce daily limits. No content
                is stored with these counts, and they are deleted after 30 days.
              </Item>
              <Item title="A copy in your browser:">
                The app keeps a working copy of your portfolio in this browser&rsquo;s local
                storage. Guests who don&rsquo;t sign in are saved only there. Signing out removes
                this copy from the browser.
              </Item>
            </ul>
          </div>

          {/* Where AI Coaching Sends Data */}
          <div className="space-y-2 pt-5 border-t border-[#E6E1D8]">
            <h2 className="text-xl font-serif font-normal text-[#14233C] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7A5B1C]" />
              <span>What the AI features send to Google Gemini</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              AI feedback comes from the Google Gemini API. Data is sent only when you are signed
              in with Google and click an AI button. In demo or guest mode nothing is sent, and you
              see built-in sample guidance labelled &ldquo;Sample analysis, not live AI&rdquo;.
            </p>
            <ul className="space-y-2 pt-1 text-xs sm:text-sm text-[#5A6478]">
              <Item title="AI Admissions Coach:">
                your activities (category, role, organization, description, grades, hours and weeks,
                Common App slot and impact rating), your honors (title, grade, level and notes), up to
                6 of your journal entries (title and text), the student&rsquo;s grade, graduation
                year, target colleges, curriculum, GPA, intended majors, and any question you type.
              </Item>
              <Item title="AI Essay Critique:">
                your essay draft and its prompt, the student&rsquo;s grade, intended majors, target
                colleges, and a one-line summary of up to 5 activities.
              </Item>
              <Item title="Activity description polish:">
                that activity&rsquo;s category, role, organization, draft description, and hours
                and weeks.
              </Item>
              <Item title="Never sent to the AI:">
                parent and guardian details, household and fee-waiver answers, siblings, home ZIP
                code and linked email addresses. We also remove email addresses and phone numbers
                from any text before sending it. Names or places you write inside essays or journals
                are sent as written.
              </Item>
              <Item title="Not used for training:">
                PathToAdmit uses Google&rsquo;s paid Gemini API. Under Google&rsquo;s terms for
                paid use, Google does not use these prompts or responses to improve its products,
                though it may keep them for a limited time to detect abuse. AI results are shown
                only to your family.
              </Item>
            </ul>
          </div>

          {/* College Data Lookups */}
          <div className="space-y-2 pt-5 border-t border-[#E6E1D8]">
            <h2 className="text-xl font-serif font-normal text-[#14233C]">
              College data lookups
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              When you open the Colleges tab or add a college, PathToAdmit looks up that
              college&rsquo;s published admissions statistics automatically. Only the college name
              is sent: first to the U.S. Department of Education&rsquo;s College Scorecard, and, if
              the college isn&rsquo;t found there, to the Google Gemini API with Google Search. No
              student information is included. The results are general college data, so we cache
              them and reuse them for other families. Comparisons with your student&rsquo;s GPA and
              scores are calculated in your browser.
            </p>
          </div>

          {/* Service Providers */}
          <div className="space-y-2 pt-5 border-t border-[#E6E1D8]">
            <h2 className="text-xl font-serif font-normal text-[#14233C]">
              Service providers we use
            </h2>
            <ul className="space-y-2 pt-1 text-xs sm:text-sm text-[#5A6478]">
              <Item title="Google Cloud &amp; Firebase:">
                hosting, Google sign-in (Firebase Authentication), data storage (Cloud Firestore)
                and the Gemini API.
              </Item>
              <Item title="U.S. Department of Education College Scorecard:">
                receives college names only.
              </Item>
              <Item title="Google Fonts:">
                our fonts load from Google&rsquo;s servers, which see your device&rsquo;s IP address
                when they do.
              </Item>
            </ul>
          </div>

          {/* Privacy Contact Section */}
          <div className="space-y-2 pt-5 border-t border-[#E6E1D8]">
            <h2 className="text-xl font-serif font-normal text-[#14233C] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#2B4C8C]" />
              <span>Privacy contact &amp; deletion requests</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6478] leading-relaxed">
              For questions about this page, parental consent, data exports, or deleting your
              account, email our family privacy team at{' '}
              <PrivacyEmail className="font-semibold text-[#2B4C8C] hover:underline" />. We respond
              to family privacy and deletion requests within 2 business days.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="bg-[#14233C] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-serif font-normal">
              Ready to build your child&rsquo;s grades 6–12 record?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Start with a clean, private workspace for your family.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartPortfolio}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F4] text-[#14233C] font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {isSignedIn ? 'Open your portfolio' : 'Start your blank portfolio'}
            </button>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Return home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
