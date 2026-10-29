# PathToAdmit — Product & Production Review (v2)

**Date:** 2026-10-27
**Code reviewed:** `main` @ `17bf3c6` (after PRs #1 and #2), plus one new fix on branch `claude/jolly-thompson-t7gkjx`
**Method:**
- Code review of the deployed code
- Local production and dev-mode server tests
- Playwright UX run at 1440×900 and 390×844, with axe-core accessibility scans
- Web research on competitors, Gemini pricing and AI provider terms

**Not covered:** the live site. `pathtoadmit.com` could not be resolved from the review environment, so every finding below comes from the code and local runs, not production. Google sign-in, Firestore sync and live Gemini output were not exercised.

Companion document: `docs/PRODUCTION_READINESS_REPORT.md` (v1, with the original detailed findings and IDs such as C1, H3, S1).

---

## 1. Scorecard

| Area | Status | One-line verdict |
|---|---|---|
| Security: API & auth | 🟡 Improved | Header spoofing, data leaks and admin takeover are fixed. A new dev-mode file exposure is fixed on the branch but not yet merged |
| Legal & compliance | 🔴 Blocker | The Gemini API terms prohibit apps for under-18s. The privacy page doesn't match the code. There is no COPPA consent or deletion flow |
| Reliability & scale | 🔴 Not ready | Quotas, approvals and family sync live in files that reset on every deploy and differ per instance |
| Tech stack | 🟢 Modern | React 19, Vite 8, TS 7, Firebase. Solid choices, but bleeding-edge versions need lockfiles (now added) |
| Maintainability | 🔴 Weak | An 8.5k-line `App.tsx`, a 3k-line `server.ts`, 0 tests, no CI, no lint for TS/React |
| Website & UX | 🟡 Good look, rough edges | A strong desktop landing page. Inaccessible modals, a 1.7 MB bundle, and confusing first-run states |
| Business readiness | 🟡 Promising | A real gap in the market (family-owned record from grade 6). Pricing, terms and support pages are missing |

---

## 2. Status of earlier fixes

| Item (v1 ID) | Status |
|---|---|
| C1/C2 Family data leak and overwrite via share codes | ✅ Fixed in #1. Sign-in plus ownership or a linked verified email is required. Old guessable codes are replaced automatically (#2) |
| C3 Admin takeover via header | ✅ Fixed in #1. Uses the verified token email |
| C4 AI quota bypass / unmetered search endpoint | ✅ Mostly fixed in #1. Quota is keyed to the verified uid; competition search is gated. ⚠ No IP rate limiting yet |
| H1 No server auth | ✅ Fixed in #1. Firebase ID token verification |
| H5 Demo cleanup deleting real data | ✅ Fixed in #1 |
| H6 Public QA PDFs | ✅ Removed in #1 |
| H8 Vulnerable deps | ✅ Highs fixed. One moderate `uuid` advisory (transitive, not reachable) |
| npm install broken by the Vite 8.3.5 release | ✅ Fixed in #2. `package-lock.json` added |
| **NEW: dev-server fallback serves family data files** | ✅ Fixed on the branch (commit `eae320e`). **Needs a PR and merge** (see 3.2) |
| H2 Security headers / CSP | 🟡 Partial. Basic headers added; no CSP yet |
| H3 Input validation, prompt-size limits, college cache poisoning | ❌ Open |
| H4 PII in localStorage | ❌ Open |
| H7 Account deletion / retention / export | 🟡 Export exists (CSV/JSON). Deletion and server-side purge are open |
| S1 Server state on local disk | ❌ Open, and the top scaling blocker |
| M2 App Check / API key restrictions | ❌ Open. Needs action in the Google Cloud console |

---

## 3. Critical items now

### 3.1 🔴 Google's Gemini API terms don't allow this product (legal)
- **Current terms:** the Gemini API Additional Terms (Dec 2025 version, and every earlier version found) require API users to be **18+**. They also forbid using the Services in any site or app *"directed towards or likely to be accessed by individuals under the age of 18."* PathToAdmit targets grades 6–12.
- **Vertex AI:** Google Cloud's 2023 generative-AI preview terms had the same clause, plus a ban on inputting personal data of people under 18. The current Vertex AI wording could not be confirmed.
- **Anthropic's policy, by contrast,** explicitly allows organizations to build products for minors. It requires safeguards: age assurance, content moderation, a child-safety system prompt, monitoring, and public COPPA compliance disclosure.
- **Recommendation:**
  1. Get counsel to confirm.
  2. Plan to move the AI features to a provider whose terms allow teen-facing products, e.g. the Claude API under Anthropic's minors guidelines, or obtain written clearance from Google.
  3. Until then, keep AI behind the parent account and the invite-only beta, and don't charge for AI.

### 3.2 🔴 Dev-mode fallback exposed family data (fixed on branch, needs merge)
- **Cause:** after AI Studio's change to `server.ts`, the server falls back to the Vite **development** server whenever `dist/index.html` is missing, even with `NODE_ENV=production`.
- **Verified locally:** in that mode, `GET /.family-portfolios.json` returned every synced family portfolio, and `/.beta-access.json` returned the invite code and approved emails. `server.ts`, `package.json` and `firebase-blueprint.json` were also served.
- **Fix (commit `eae320e`):** the stores now live in `DATA_DIR` (outside the project), existing files are moved there on start, Vite denies dot-JSON files and `server.ts`, and the server logs a warning when the dev server runs on Cloud Run.
- **Action:**
  - Merge the fix.
  - Make sure AI Studio deploys run `npm run build` before `npm start`.
  - If production ever ran without a build, assume those files were exposed.

### 3.3 🔴 The privacy page doesn't match the code (FTC / COPPA risk)
`src/components/PrivacyPage.tsx` promises things the code doesn't do:

| Claim | Reality |
|---|---|
| Only "your selected activity description, reflection excerpt, or essay draft" goes to Gemini | The AI coach sends all activities, honors, the 6 most recent journals, GPA, curriculum, majors and dream colleges (`AICoachAndEssayView.tsx:180`, `server.ts` admissions-coach) |
| "Opt-in only… unless you actively click" | The Colleges panel calls `/api/ai/college-admissions-insights` automatically on load (`DreamCollegeAdmissionsPanel.tsx:192`), sending GPA, SAT and major |
| "Isolated in Google Cloud Firestore" | Family sync also stores full portfolios in a server JSON file |
| "Permanently delete" / "immediate deletion" | In-app delete is a 30-day archive, there is no self-serve account deletion, and purging runs only in the browser |
| "Never used to train… paid enterprise terms" | True only if the Gemini project has billing enabled (paid tier). Free-tier data may be used by Google and reviewed by humans |

**Fix:** either make the code match the promises, or rewrite the page to say exactly what happens. Do this before any public launch.

### 3.4 🔴 No real COPPA parental-consent or deletion flow
- **What's missing:**
  - Parent-first account creation is described in text only. There is no consent step, no consent record, and no way for a parent to review or delete a child's data in the app.
  - The amended COPPA Rule, with compliance due April 22, 2026, also requires separate consent for non-integral third-party disclosures, a written security program, and a data-retention policy.
- **Needed:**
  - A parent consent checkpoint with a stored record.
  - Self-serve deletion, with a Cloud Function cascade across all collections.
  - A server-side retention purge.
  - A written retention policy.

### 3.5 🔴 Server state resets on every deploy (S1)
- **What's affected:** quotas, approved users, the invite code (set from the admin panel) and family-sync bundles live in JSON files on the container's disk.
- **Consequences:**
  - On Cloud Run they reset on every deploy and restart, and each instance has its own copy, so the daily caps multiply with instance count.
  - Family sync silently "forgets" families.
- **Fix:** move these into Firestore, using transactions for quota counters, and replace family sync with Firestore-native sharing (see the Features section).

---

## 4. Security — remaining work (prioritized)

1. **Merge the dev-fallback fix** (3.2).
2. **Set `BETA_INVITE_CODE`** in AI Studio secrets. `ADMIT2026` is public knowledge and remains the fallback.
3. **Firebase App Check:**
   - Enable it for Firestore and enforce it on `/api/*`.
   - Restrict the Web API key to your domains and the APIs actually used.
4. **Input validation** on every API route (zod), with caps on array lengths and text sizes. Lower the body limit for AI routes from 2 MB to about 64 KB. Today one request can push about 2 MB of text into a prompt.
5. **College insights cache poisoning:** user-supplied `collegeName` reaches an AI prompt whose output is cached for every user for 30 days. Cache only federal Scorecard data or allow-listed names.
6. **Rate limiting** per IP and route (e.g. `express-rate-limit`), plus a Google Cloud budget alert on the AI project.
7. **CSP** (a strict `script-src`; allow Firebase, Google APIs and Fonts).
8. **Clear localStorage on sign-out**, or rely on Firestore's offline cache instead of mirroring essays and journals into plaintext localStorage.
9. **Remove third-party emails from source:** the test-family email is hardcoded in `server.ts`. Move it to env.
10. **Firestore rules gaps:**
    - `grades` validates only element 0.
    - `studentId` is not checked against the owner's students.
    - Dates are stored as free-form strings.
    - Write emulator tests with `@firebase/rules-unit-testing`.
11. **Auth domain fragility:** `src/firebase.ts` defaults `authDomain` to `pathtoadmit.com`. Google sign-in only works if that domain serves this app's `/__/auth/*` proxy. If the app is reached on another host, sign-in breaks. Set `VITE_FIREBASE_AUTH_DOMAIN` explicitly per environment.

---

## 5. Production readiness & scale

| Need | Current | Recommendation |
|---|---|---|
| Stateless server | ❌ File stores | Firestore for quotas, approvals and sharing |
| Build/deploy | AI Studio, manual | Keep AI Studio for now. Add GitHub Actions: install → typecheck → build → (tests) on every PR. Later, deploy to Cloud Run with Workload Identity |
| Environments | One Firebase project | Add a **staging** project and Cloud Run service |
| Rollback | Cloud Run revisions (implicit) | Document "route traffic to previous revision" |
| Backups | None | Firestore PITR plus scheduled exports to GCS |
| Monitoring | `console.log` | Cloud Error Reporting or Sentry (front + back), uptime check on `/healthz`, AI spend dashboard and budget alerts |
| Health & shutdown | None | `/healthz`, SIGTERM handling |
| AI resilience | Sequential 3-model fallback, timeouts don't cancel | `AbortController`, an overall deadline, model IDs in env |
| Performance | 1.74 MB JS, no compression, `max-age=0` on hashed assets | `compression`, `Cache-Control: immutable` for `/assets`, lazy-load tabs, Recharts and Firebase |
| Cost control | Global 100/day cap (resets on deploy) | Firestore-backed caps per family, a monthly budget, spend alerts |

---

## 6. Tech stack & maintainability

**Stack verdict:** the choices are good for a small team.
- React 19, Vite 8, Tailwind 4, TypeScript 7, Firebase Auth + Firestore, Express on Cloud Run.
- Keep it. Don't migrate frameworks; the problems are structural, not about the stack.

| Issue | Evidence | Recommendation |
|---|---|---|
| Monolith component | `App.tsx` is 8,555 lines with 63 `useState`, 18 `useEffect` and 59 `localStorage` references | Split into feature folders (`features/activities`, `journal`, `essays`, `colleges`, `family`), with one data hook per collection. Add a router (deep links, back button, per-page canonical URLs) |
| Monolith server | `server.ts` is 3,014 lines: routes, prompts and fallback generators together | `server/routes/*`, `server/services/ai.ts`, `server/prompts/*`, `server/fallbacks/*` |
| No tests | 0 test files | Vitest for the text utilities (`trimToWordBoundary`, polish builders), Supertest for API auth and ownership, rules emulator tests, and one Playwright smoke test |
| No CI | No `.github/` | A GitHub Actions PR check (would have caught the npm break) |
| Lint | ESLint only for rules; a custom regex hooks checker | `typescript-eslint` + `react-hooks` + `jsx-a11y` + Prettier |
| TS strictness | No `strict` | Enable it gradually, starting with `server.ts` |
| Two sources of truth | localStorage and Firestore merged with ad-hoc logic; QA reports show lost children and mixed data | Make Firestore the single source; use its offline cache |
| Bleeding-edge majors | TS 7, Vite 8, ESLint 10, Firebase 13 | Fine, now that lockfiles exist. Add Renovate or Dependabot with CI |
| AI Studio editing alongside GitHub | AI Studio's "downgrade" commit reverted the lockfile | One editor at a time; GitHub is the source of truth |

---

## 7. Website & UX review

**What works:**
- The desktop landing page has a clear serif headline, sensible CTAs and a good sample-portfolio showcase.
- WebP screenshots in separate mobile and desktop versions.
- Full meta, OG and JSON-LD tags.
- CSV/JSON export.
- An honest "sample students are fictional" note.

**Top problems (from the Playwright + axe run):**
1. **Sample AI output looks real.** Demo and guest users get canned analysis ("95/100 Readiness") with no label. Nothing in `src/` reads `isSampleFallback`. Show a "Sample analysis, not live AI" banner.
2. **Accessibility:**
   - No modal has `role="dialog"`, a focus trap or Escape-to-close. Tab escapes behind the Sign-in, Add activity and Reflection modals.
   - The closed mobile drawer is `aria-hidden` but still focusable.
   - Gold `#B8913A` text on cream is 2.76:1 (needs 4.5:1). This includes the H1 accent.
   - Unlabelled `<select>` elements and inputs in the Add-activity modal.
   - The landing and privacy pages have no `<main>` landmark.
3. **Mobile:**
   - 29 of 43 tap targets are under 44px.
   - The logo is cut off ("PathToA…").
   - The step tabs in Add activity are cut off.
   - The Honors grade chips overflow the screen.
   - The persistent toast covers content.
4. **First-run confusion:**
   - New guests see the toast "Portfolio archived to 30-Day Trash".
   - Activities with no data says "No matching activities — clear filters", and the search box is pre-filled with "math olympiad".
   - Colleges shows "GPA: On Track" with no data entered.
   - The progress bar is partly filled at 0%.
   - The "Colleges" tab opens the "AI Coach & Essay Lab".
   - App tabs show on the landing page for visitors who haven't signed in.
5. **Performance:**
   - On a throttled mobile connection (Fast-3G-like, 4× CPU), the first paint takes about 9.7 s, loading 1.9 MB over 22 requests.
   - All 12 showcase screenshots are preloaded on landing.
   - The page is blank without JS.
6. **SEO:**
   - No `robots.txt`, `sitemap.xml`, `favicon.ico`, apple-touch-icon or manifest.
   - Every unknown URL returns 200 (a soft 404).
   - One canonical URL for all pages.
7. **Trust & content gaps:**
   - Missing pages: Terms of Service, About/Team (real names), Contact/Support, Pricing, a fuller FAQ, cookie/storage notice, accessibility statement.
   - The only testimonial is from "The PathToAdmit Family Team". Replace it with real beta families, with their consent.
   - College stats labelled "Official CDS" need a source and year.

**Quick wins (a day or two):**
- Add the sample-output banner.
- Fix the toast and the empty states.
- Hide the app tabs on the landing page.
- Add `compression` and immutable caching.
- Add `robots.txt`, `sitemap.xml` and icons.
- Darken the gold text to about `#7A5B1C`.
- Make the closed drawer `inert`.
- Add a `<main>` landmark.
- Make tap targets 44px.

**Larger work:**
- One accessible `Modal` component, used everywhere.
- Route-based code splitting and a pre-rendered landing page.
- The legal and trust pages.
- An honest privacy page.
- Self-serve deletion.

Screenshots from the run are in the scratchpad `ux/` folder of the review session, e.g. `landing-desktop.png`, `landing-mobile.png`, `modal-add-activity-mobile.png`, `guest-honors-mobile.png`.

---

## 8. Feature suggestions (prioritized)

**Now: core value and retention**
1. **Firestore-native family sharing** (replaces the server file sync).
   - `families/{id}` with members and roles (parent: edit; student: edit own; counselor: read-only).
   - Email invites, accepted after Google sign-in.
   - Fixes security, persistence and the multi-device problems from the QA reports at once.
2. **Brag sheet / activity resume PDF.**
   - A one-click PDF for teachers and counselors who write recommendations, and for summer program applications.
   - High value, low cost, and uses data the app already has.
3. **Reminders.**
   - Deadline emails.
   - A weekly "log this week" nudge to parents.
   - An `.ics` calendar export for college deadlines.
4. **Service and activity hours with verification.**
   - A supervisor confirms hours by email link.
   - Feeds NHS, PVSA and school service-hour requirements.
5. **Parent progress report.** A monthly email summary per child: hours logged, new honors, upcoming deadlines.

**Next: deepen the "grade 6 → application" story**
6. **Four-year course plan and GPA tracker**, with AP/IB rigor shown against target colleges.
7. **Summer programs and scholarships tracker**, with deadlines and status, tied to activities. Going Merry reportedly shut down, which leaves a gap.
8. **Supplemental essay tracker per college:** prompts, drafts, word counts, and reuse of essay seeds from journals.
9. **Essay version history and diff;** comments from a parent or counselor.
10. **Installable mobile app (PWA) for quick logging:** snap a photo of a certificate and attach it to an honor (needs Firebase Storage with rules).

**Later: B2B and AI**
11. **Counselor portal:** view-only access to many students, comments, and a brag-sheet export. This is the path to school and independent-counselor revenue.
12. **AI, after the provider decision in 3.1:**
    - A grade-appropriate "what to try this summer" plan.
    - Interview practice.
    - Every sample or fallback response clearly labelled.
    - The child-safety system prompt and moderation required for minors.

---

## 9. Pricing & business model

**Market** (verify current prices before publishing; several come from third parties):

| Segment | Examples | Price |
|---|---|---|
| Free platforms | Common App, Scoir (families), CollegeVine (Sage AI) | $0 |
| School platforms | Naviance, MaiaLearning, Scoir, Cialfo | Bought by schools. About $5–7 per student per year, as claimed by Scoir |
| Cheap AI tools | Ace AI ($5.99/mo; writes 150-char activity descriptions), Arzo ($29/mo), Kollegio (free / undisclosed) | $0–$29/mo |
| Human counseling | Prompt (~$75/mo essays), CollegeAdvisor ($3.5k–$9k), Empowerly ($10k–$32k), Crimson ($25k–$65k+) | $$$ |

**The gap PathToAdmit fills:**
- A **family-owned record from grade 6** that follows the student across schools (school platforms don't follow a student who changes schools).
- One parent account for **several children**.
- Years of activities, honors and reflections, turned into Common App-ready output.
- None of the cheap AI tools keep a multi-year record.

**AI cost per active student per month:**

| Provider and model | Cost | Notes |
|---|---|---|
| Gemini Flash-Lite | about $0.13 | Unverified aggregator prices |
| Gemini 3.8 Flash, intro price | about $0.35 | Unverified aggregator prices |
| Gemini, conservative planning figure | about $1.05 | Includes search grounding (~$14 per 1,000 searches after 5,000 free per month) |
| Claude Haiku 5.5 ($0.10 / $0.50 per M tokens) | about $0.05 | Same usage profile, before any web-search charges |
| Claude Sonnet 5.5 ($2 / $10 per M tokens) | about $0.93 | Same usage profile, before any web-search charges |
| Claude Opus 5.5 ($4 / $20 per M tokens) | about $1.87 | Same usage profile, before any web-search charges |

Usage profile assumed: 20 coach, 10 essay critique and 40 polish calls per month. AI cost is small next to any subscription price.

**Recommended model:**

| Plan | Price | What's included | Gross margin (est.) |
|---|---|---|---|
| **Free** | $0 | Logging, journal, deadlines, Common App export for one student, a small monthly AI allowance on the cheapest model | n/a (acquisition) |
| **Family Plus** (main) | **$12/mo or $99/yr** | Up to 4 students, brag-sheet PDF, reminders, parent reports, fair-use AI | ~73% |
| **Application Season Pass** | **$89 one-time, Aug–Jan** | One rising senior, higher essay and coach limits; add-on to either plan | ~72% |
| **Counselor** (later) | $59/mo for 25 students | Read-only portal, comments, exports | ~68% |
| **Schools** (later) | about $6 per student per year, $1,500 minimum | Requires FERPA DPAs and state privacy agreements | ~65% before sales costs |

- **Billing:** use Stripe on the web, and avoid in-app purchases (Apple and Google take 15–30%).
- **Before charging for AI:** resolve 3.1, ship 3.3 and 3.4, and publish Terms, refund and cancellation policies.

---

## 10. Suggested 30 / 60 / 90 days

**Next 2 weeks (launch blockers)**
- [ ] Merge the dev-fallback fix and confirm AI Studio deploys run `npm run build`
- [ ] Set `BETA_INVITE_CODE`; set a Google Cloud budget alert; confirm Gemini billing is enabled (paid tier)
- [ ] Get a legal opinion on the Gemini under-18 terms. Decide on the AI provider
- [ ] Rewrite the privacy page to match reality, or change the code to match it
- [ ] Add the sample-AI banner, fix first-run toasts and empty states, add the accessible modal and the contrast fix

**30 days**
- [ ] Firestore-native family sharing with roles; remove the file-based family sync
- [ ] Move quotas and approvals to Firestore
- [ ] Parent consent checkpoint, self-serve deletion with a Cloud Function cascade, scheduled trash purge
- [ ] App Check, input validation, rate limiting, CSP
- [ ] CI (typecheck + build + first tests), staging project, error monitoring

**60 days**
- [ ] Brag-sheet PDF, reminders, `.ics` export, parent monthly report
- [ ] Code-split by route; add a router; begin breaking up `App.tsx`
- [ ] Terms, Pricing, About, Contact, FAQ pages; real testimonials
- [ ] Stripe billing for Family Plus (if 3.1 is resolved)

**90 days**
- [ ] Hours verification, course planner, summer program and scholarship tracker
- [ ] Counselor portal pilot with 2–3 independent counselors

---

## Sources
- Gemini API Additional Terms: https://ai.google.dev/gemini-api/terms ; archive: https://ai.google.dev/gemini-api/terms-archive/terms_05_14_24
- Google Cloud GenAI preview terms (2023 archive): https://cloud.google.com/archive/terms/genai-preview-products-20230925
- Google AI forum thread on age restrictions: https://discuss.ai.google.dev/t/age-restrictions-in-gemini-api-terms-general-audience-app-rated-3-with-an-adult-only-ai-feature/179916
- Anthropic, guidelines for organizations serving minors: https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors ; child safety guidance: https://support.claude.com/en/articles/15591275-child-safety-guidance-for-developers
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing ; search grounding: https://ai.google.dev/gemini-api/docs/google-search ; aggregators: https://openrouter.ai/google/gemini-3.8-flash , https://www.morphllm.com/gemini-api-pricing
- Amended COPPA Rule: https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect , https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule
- Competitors: https://www.collegevine.com/sage , https://www.scoir.com/high-schools/scoir-vs-naviance , https://www.capterra.com/p/237257/Naviance/ , https://start.empowerly.com/empowerly-pricing , https://www.collegeadvisor.com/pricing/ , https://en.wikipedia.org/wiki/Crimson_Education , https://meritplaybook.com/guides/what-happened-to-going-merry , https://chromeboard.com/extension/ace-ai-dhnmelgednpjnllinomlmjikebkfgebg , https://www.capterra.com/p/10043653/Arzo/ , https://icp.stevens.edu/?p=5608
- Apple Small Business Program: https://www.businesswire.com/news/home/20201118005376/en/Apple-Announces-App-Store-Small-Business-Program
