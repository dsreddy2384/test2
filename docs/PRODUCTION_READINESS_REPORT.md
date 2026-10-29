# PathToAdmit — Production Readiness, Security & Scalability Report

**Date:** 2026-10-25
**Scope:** Entire repository at commit `7e077cc` (`server.ts`, `src/**`, `firestore.rules`, build/config files, `public/` assets)
**Method:** Manual code review plus hands-on checks: dependency install, `tsc --noEmit`, `vite build`, `bun audit`, and the Express server run locally with the vulnerable endpoints exercised using `curl`.

---

> **Status update (Phase 0 fixes):** C1–C4, H1, H5, H6 and H8 have been addressed in code. The server now verifies Firebase ID tokens, family sync requires sign-in and ownership or a linked verified email, the admin check uses the verified token email, hardcoded invite codes are removed, the competitions endpoint is quota-gated, the demo-data heuristics no longer match real records, the public QA PDFs are removed, and vulnerable dependencies are patched. Still open: everything in Phase 1–2, including moving server state off local disk (S1).

---

## 1. Executive Summary

PathToAdmit is a React 19 single-page app with a Firebase backend (Auth + Firestore) and a thin Express server that proxies Gemini AI calls. The **Firestore security rules are solid**: default-deny, strict schema validation, and owner-only access. But the **Express server undoes much of that protection**. It runs a second, unauthenticated data path that stores and returns children's full portfolios, and it decides who you are from HTTP headers that any caller can set.

**Verdict: not ready for production.** There are **4 Critical** and **8 High** issues. All four Critical issues were confirmed against a locally running server:

| # | Critical issue | Impact |
|---|---|---|
| C1 | `/api/family-sync/lookup` returns a family's full portfolio to anyone who knows a linked email address | Leak of minors' PII, essays, journals, GPA, family data. Likely COPPA/FTC exposure |
| C2 | Family share codes are guessable (`PF-2030-FAMILY`, `PF-<gradYear>-<LASTNAME>`) and `/publish` needs no authentication | Families overwrite or read each other's data. Unrelated families that share a code collide |
| C3 | Admin endpoint trusts the `x-user-email` header | Anyone can become admin: read the invite code, raise AI spend caps to 5,000/day, add or remove approved users |
| C4 | Every AI quota and beta check relies on caller-supplied identity, and `/api/events/recent-competitions` has no quota at all | Unlimited Gemini + Google Search grounding spend; the global cap can be drained to deny service to real users |

The server is also **stateful on local disk** (JSON files), which cannot work on Cloud Run or any autoscaled host. It blocks horizontal scaling and silently loses data on every restart or redeploy.

The good news: the codebase typechecks and builds cleanly, the Firestore data model is reasonable, and most fixes are well understood. The work is mainly to verify Firebase ID tokens on the server, delete the file-based stores, and model family sharing in Firestore.

---

## 2. Architecture & Tech Stack

### 2.1 Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19.3, TypeScript 7.0, Vite 8.3 (Rolldown), Tailwind CSS 4.3, `motion`, `recharts`, `lucide-react` | Single-page app, no router; tabs are React state |
| Auth | Firebase Auth (Google sign-in via popup) | Custom `authDomain` (`pathtoadmit.com`) served through a reverse proxy in `server.ts` |
| Database | Cloud Firestore (named DB `ai-studio-cdb8825c-…`) | Client SDK writes directly. Rules in `firestore.rules` |
| API server | Express 4.21 (`server.ts`, 2,904 lines) run with `tsx` (dev) or `node server.ts` (Node type stripping) | Serves the SPA plus `/api/*` |
| AI | `@google/genai` 2.4 (Gemini models `gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`) with Google Search grounding | Server-side API key |
| External data | U.S. Dept. of Education College Scorecard API | Falls back to `DEMO_KEY` |
| Server state | Local JSON files: `.beta-access.json`, `.family-portfolios.json`, `.college-admissions-cache.json`, plus an in-memory polish cache | **Not production-safe** (see §4) |
| Hosting (implied) | Google AI Studio → Cloud Run (`K_SERVICE` check, `.env.example`) | No Dockerfile, `firebase.json`, CI, or IaC in the repo |
| Package manager | Bun (`bun.lock`) | No `package-lock.json`, so `npm ci` and `npm audit` do not work |

### 2.2 Request & data flow

```
Browser (React SPA, 1.74 MB JS)
 ├── Firebase Auth (Google popup) ──► /__/auth/* ──► server.ts proxy ──► <project>.firebaseapp.com
 ├── Firestore SDK (direct)  ──► users/{uid}, users/{uid}/familyProfile/main, users/{uid}/students/*
 │                               activities, journals, honors, essayDrafts, collegeDeadlines  (top-level, ownerId field)
 ├── localStorage            ──► full copy of every collection, including essays and journals (offline / guest mode)
 └── fetch /api/*  (identity = x-user-email / x-user-uid headers, NOT verified)
        ├── /api/ai/*                     ──► Gemini (quota stored in .beta-access.json)
        ├── /api/events/recent-competitions ► Gemini + Google Search (no quota)
        ├── /api/family-sync/publish|lookup ► .family-portfolios.json  (no auth)
        ├── /api/beta/*                   ──► .beta-access.json
        └── /api/ai/college-admissions-insights ► College Scorecard / Gemini ► .college-admissions-cache.json
```

### 2.3 Codebase shape

| File | Lines | Observation |
|---|---|---|
| `src/App.tsx` | 8,538 | One component holding almost all state (63 `useState`), Firestore listeners, sync logic, and UI |
| `server.ts` | 2,904 | All routes, business logic, prompt templates, and deterministic "fallback" generators in one file |
| `src/activitySuggestions.ts`, `src/collegeAdmissionsData.ts`, `src/types.ts` | ~4,700 | Large static datasets bundled into the client |
| Tests | 0 executable | `firestore.rules.test.ts` is a data array and never runs against the emulator |

---

## 3. Findings — Security

Severity follows the impact for a product that stores **minors' (age 11–18) educational and family PII**.

### 🔴 C1 — Unauthenticated family portfolio disclosure by email (`/api/family-sync/lookup`)
- **Where:** `server.ts:2376-2412`, called from `src/App.tsx:2193`
- **What:** Given `{ "email": "<any linked email>" }` or a share code, the endpoint returns the whole stored bundle: profile, family profile (parent names, education, occupation, first-gen status, fee-waiver eligibility, siblings), all activities, journals, honors, essay drafts, and college lists. There is no authentication and no check that the requester owns the email.
- **Verified:** A bundle published as `victim@example.com` was returned to an anonymous `curl` request.
- **Impact:** Mass data exfiltration of children's records. This contradicts the privacy page (`PrivacyPage.tsx:91`: *"Only the parent/guardian account owner and explicitly linked family emails can view or edit the record"*) and creates COPPA, FTC Act §5, and state student-privacy (e.g., SOPIPA, CCPA) exposure.
- **Fix:** Delete both `/api/family-sync/*` endpoints and `.family-portfolios.json`. Model sharing in Firestore (see §6.2). Grant access through rules that check `request.auth.token.email` against a members list, and only after the owner explicitly invites that email.

### 🔴 C2 — Guessable, colliding family share codes; unauthenticated overwrite (`/api/family-sync/publish`)
- **Where:** `server.ts:2323-2374`. Code generation in `src/App.tsx:175`, `:1070` (`'PF-2030-FAMILY'`), `:2156-2160` (`PF-<zip>-FAMILY`, default zip `78701`), `:3212-3216` and `:8215` (`PF-<gradYear>-FAMILY`), and `src/components/StudentFamilyProfileView.tsx:217-225` (`PF-<gradYear>-<LASTNAME>`).
- **What:** Anyone can POST any code and replace that family's stored bundle. The codes come from a few predictable inputs (grad year, ZIP, surname), so:
  1. Unrelated families with the same grad year silently **overwrite each other**, and a later "pull" loads another family's child into their account.
  2. An attacker can enumerate all ~16 grad years × common surnames or ZIPs and download every bundle.
  3. An attacker can **plant** a bundle under a victim's code. When the victim pulls, the client replaces their state with the attacker's data, which can then be written back to Firestore.
- **Fix:** Same as C1. Remove the endpoints. If share codes stay as an invite mechanism, generate ≥128-bit random tokens on the server, make them single-use and time-limited, and bind them to an authenticated Firestore membership write.

### 🔴 C3 — Admin privilege escalation through a spoofable header (`/api/beta/admin-update`, `/api/beta/status`)
- **Where:** `server.ts:1276-1295` (`callerEmail = req.headers['x-user-email'] || adminEmail`), `server.ts:1218-1225`, identity helper `server.ts:1020-1051`
- **What:** Sending `x-user-email: <the hardcoded admin email>` grants full admin rights.
- **Verified:** An anonymous request set `dailyUserLimit=200` and `globalDailyLimit=5000`. The response returned the active invite code and the approved email list.
- **Also:** The admin email, a test-family email, and the demo identity are hardcoded in both server and client (`server.ts:920-923`, `src/firebase.ts:95-97`), so they ship in the public JS bundle.
- **Fix:** Verify a Firebase ID token (`Authorization: Bearer <idToken>`) using `firebase-admin` `verifyIdToken()`. Authorize admins with a **custom claim** (`admin: true`) set from a secure script, not by matching an email string. Remove identities from source.

### 🔴 C4 — AI cost controls can be bypassed, and one AI endpoint has no quota
- **Where:** `server.ts:1053-1207` (quota), `server.ts:1079-1083` and `:1243-1245` (hardcoded invite codes `ADMIT2026`, `PATHBETA`, which **cannot be revoked** because they are checked in code even after an admin rotates the stored code), `server.ts:1145` (the error message itself discloses `ADMIT2026`), `server.ts:2032-2298` (no quota call at all)
- **What:**
  - The per-user quota key is the caller-supplied email or uid. Rotating `x-user-email` on each request gives a fresh 10/day.
  - `x-user-email: demo@pathtoadmit.com` is accepted as the "demo account" with no sign-in. Its key is `demo_<req.ip>`, and `trust proxy` is not configured, so behind Cloud Run or a load balancer `req.ip` is the proxy's address, not the client's.
  - `/api/events/recent-competitions` calls Gemini with **Google Search grounding** (billed per grounded request) up to 3 times plus a schema fallback, for every anonymous request.
  - The **global** cap is shared, so one attacker can exhaust it in seconds and lock out every real family for the day (cheap DoS).
  - Credits are deducted before work starts and are spent even when no model call is made (zero-activity branch, `server.ts:1526-1540`) or when the call fails.
- **Fix:** Use verified ID tokens (C3). Keep quotas in Firestore or Redis keyed by verified uid, with atomic increments. Put the events endpoint behind auth and quota. Add IP and route rate limiting (e.g., `express-rate-limit` backed by Redis, or Cloud Armor). Enable **Firebase App Check** and enforce it on the API. Set Gemini budget alerts and per-key quotas in Google Cloud. Remove hardcoded invite codes.

### 🟠 H1 — No server-side authentication anywhere
Every `/api/*` route uses `getRequestIdentity()` (`server.ts:1020`), which reads headers or body fields such as `profile.uid` and `familyProfile.ownerId`. The client sends these headers (`src/firebase.ts:99-118`) but never sends an ID token. **This is the root cause of C1–C4.** Add one `requireAuth` middleware that verifies the Firebase ID token and sets `req.user = { uid, email, email_verified, admin }`.

### 🟠 H2 — Missing HTTP security hardening
- **Verified:** Responses include `X-Powered-By: Express` and **no** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or frame protection. No CORS policy is defined, so same-origin is the default, which is acceptable, but there is also no CSRF consideration once cookie auth arrives.
- **Fix:** Add `helmet` with a CSP that allows Firebase, Google APIs, and Google Fonts. Call `app.disable('x-powered-by')`. Set `app.set('trust proxy', 1)` on Cloud Run.

### 🟠 H3 — Unbounded inputs drive token cost and enable prompt injection
- `express.json({ limit: '2mb' })` (`server.ts:915`) is applied to every route. `activities`, `honors`, `journals` arrays and free text (`customQuestion`, `essayText`, `searchQuery`, `schoolName`, `collegeName`) go into prompts with no length or count limits. One request can carry ~2 MB of prompt text.
- User text is interpolated directly into prompts (e.g., `server.ts:1437`, `:2050`, and the college prompt). `collegeName` reaches a prompt **whose output is cached server-wide for 30 days** and served to every user who searches that name (`server.ts:2667+`, `setServerCachedCollege`). That is a **cache-poisoning** path.
- **Fix:** Validate every request body with a schema (`zod`/`valibot`): max array lengths, max string lengths, and enums. Lower the body limit to ~64 KB for AI routes. Cache only data from the federal API or allow-listed college names. Treat model output as untrusted.

### 🟠 H4 — Children's records stored in plaintext `localStorage`
`src/App.tsx:929-960` and others mirror every collection, including essays, journals, GPA, and parent details, into `localStorage`. On shared or school computers this survives sign-out, and any XSS can read it. Clear storage on sign-out at minimum. Better: rely on Firestore's built-in offline persistence (IndexedDB, scoped per user) and drop the custom mirror.

### 🟠 H5 — Client-side "demo/test cleanup" deletes real user data
- `isDemoActivityItem` (`src/App.tsx:201-209`) treats an activity as demo data if **its organization name equals any demo organization**. Journals, honors, and essays match on title alone (`:211-231`). The Firestore listener then **hard-deletes** matching documents (`src/App.tsx:1189-1198` and the equivalents for other collections).
- `src/App.tsx:1189-1192` also hard-deletes any real activity with position `"Peer Math Tutor"` whose student name contains `"grace"` (a leftover from QA run "Retest 2").
- **Impact:** Silent, permanent data loss for real families whose data happens to match. QA-specific hacks are running in production code.
- **Fix:** Remove the heuristics. Keep demo data only in memory, never in Firestore, and tag it explicitly (`isDemo: true`) if it must be persisted.

### 🟠 H6 — Internal QA reports with real account details are publicly served
`public/assets/aistudio/*.pdf` (9 files) are copied into `dist/` and served at `/assets/aistudio/...`. **Verified:** they return HTTP 200. One report names a real tester and the real Google account used for testing, and all of them describe internal defects. `.aistudio/artifacts/**` (2.2 MB of screenshots and PDFs) is also committed. **Fix:** Move these out of `public/` and out of the repo (or into a private docs store), and purge them from git history if they contain PII.

### 🟠 H7 — Account deletion, retention, and data export are not implemented
- The `users/{uid}` delete rule exists, but nothing deletes the top-level `activities`, `journals`, `honors`, `essayDrafts`, `collegeDeadlines`, or the `familyProfile` and `students` subcollections, so they are orphaned. There is no "delete my account" flow, and the privacy page asks families to email instead (`PrivacyPage.tsx:230`).
- The 30-day trash purge runs **only in the browser** while the app is open (`src/App.tsx:128`, `:1195-1198`), so the retention promise is not enforced.
- **Fix:** Add a Cloud Function (or Firebase's "Delete User Data" extension) triggered on auth-user deletion, a scheduled purge job for soft-deleted documents, and a JSON/PDF data export. These are COPPA and CCPA obligations.

### 🟠 H8 — Vulnerable dependencies (`bun audit`)
| Package | Severity | Path | Fix |
|---|---|---|---|
| `body-parser` 1.20.8 | High: DoS via trailing bytes after a compressed body (GHSA-27r3-jxmh-p828) | `express` → `body-parser` | Upgrade to ≥1.20.9 (`bun update express`) |
| `@grpc/grpc-js` 1.9.16 | High: cert auth context (GHSA-m9gg-hp2v-232j) + Low | `firebase` → `@firebase/firestore-compat` | Upgrade `firebase` / dedupe to ≥1.13.6 (browser bundle not directly affected, but fix anyway) |

### 🟡 Medium
- **M1 — Firebase auth reverse proxy** (`server.ts:2844-2869`): hardcodes the project host and forwards only `GET`-style requests (no request body, cookies, or `Set-Cookie`), so some auth flows may break. It also has no response size or time limits. Consider Firebase Hosting rewrites for `/__/auth/**`, which are first-party and need no custom proxy. At minimum, add a timeout and restrict methods.
- **M2 — Firebase Web API key restrictions:** The key in `firebase-applet-config.json` (also in the bundle) is meant to be public, but it must be **restricted** in Google Cloud Console to your domains and the APIs actually used. `recaptchaSiteKey` is empty, so **App Check is not enabled**. Without App Check, anyone can script the Firestore API with their own accounts (spam and cost).
- **M3 — Firestore rules gaps:**
  - `grades` validates only `grades[0]` (`firestore.rules:207-208`); other elements can be any type.
  - `studentId` on records is not checked against `users/{uid}/students/{studentId}`.
  - Rules cannot limit document count per user, so a signed-in user can create unlimited documents (cost). Mitigate with App Check plus server-side or monitoring alerts.
  - Date fields (`entryDate`, `deadlineDate`, `deletedAt`) are free strings. Prefer `timestamp`.
  - `firestore.rules.test.ts` is not executed. Write real tests with `@firebase/rules-unit-testing` and run them in CI against the emulator.
  - `DRAFT_firestore.rules` and `firebase-blueprint.json` duplicate the rules and can drift. Delete or clearly mark them.
- **M4 — College Scorecard `DEMO_KEY` fallback** (`server.ts:2537`): `DEMO_KEY` is heavily rate-limited per IP and will fail under load. Require a real key in production.
- **M5 — Privacy claims need verification:** `PrivacyPage.tsx:211` says prompts are processed "under enterprise data-privacy terms" and "never used to train". That holds only for **paid** Gemini API / Vertex AI usage. If the key is a free-tier AI Studio key, Google's terms allow use for product improvement. Confirm billing is enabled on the project, or move to Vertex AI.
- **M6 — PII redaction is partial** (`server.ts:186-190`): only emails and US phone numbers are redacted. Names, schools, and addresses inside essays and journals still go to the model. That is acceptable if disclosed, but the privacy page should say so precisely.
- **M7 — Error and log hygiene:** `handleFirestoreError` (`src/firebase.ts`) logs and throws JSON that includes the user's email and uid to the console, and the error boundary may display it. Server logs dump full upstream errors. Use structured logging with PII scrubbing.

### 🟢 Low
- `firebase.ts:73-87` reads the denied `test/connection` document on every page load: wasted reads and a guaranteed permission error.
- `main.tsx` globally suppresses any error whose message contains "vite", "HMR", or "WebSocket" in production, which can hide real failures.
- `isProduction` (`server.ts:2873-2877`) is inferred from `npm_lifecycle_event`/`K_SERVICE`. Use an explicit `NODE_ENV=production`.
- Package metadata: `name: "react-example"`, `version: 0.0.0`. `metadata.json` says "Pathfolio" while the app is PathToAdmit.

---

## 4. Findings — Scalability & Reliability

### 🔴 S1 — Server state on local disk (blocks horizontal scaling)
`.beta-access.json`, `.family-portfolios.json`, and `.college-admissions-cache.json` are read and written **synchronously on every request** (`fs.readFileSync`/`writeFileSync`).
- **Cloud Run / containers:** the filesystem is ephemeral and per-instance. Approved users, quotas, and family bundles **reset on every deploy, scale event, or cold start**, and each instance has its own copy, so quotas multiply with instance count.
- **Concurrency:** read-modify-write without locking means simultaneous requests lose updates, and a crash mid-write corrupts the JSON.
- **Performance:** synchronous I/O blocks the Node event loop, and the files grow without bound (the family store holds every family's full portfolio).
- **Fix:** Move quotas and allow-lists to Firestore (transactions or `FieldValue.increment`) or Memorystore/Redis. Remove family-sync (C1/C2). Store the college cache in Firestore with a TTL policy.

### 🟠 S2 — Gemini call pattern
- Sequential fallback across up to 3 models with 9 s timeouts each can stall a request for ~27 s and more on grounded routes. `Promise.race` timeouts do not cancel the underlying request, so you still pay for it. Use `AbortController`, a total deadline, and circuit-breaking.
- Model IDs are hardcoded (`server.ts:14-23`). Move them to config or env and verify each ID is GA, so a model retirement does not take down AI features.
- The in-memory `polishCache` is per-instance and lost on restart. Acceptable as an L1 cache, but don't rely on it for cost control.

### 🟠 S3 — Frontend performance
- **Verified:** a single 1.74 MB (477 KB gzip) JS chunk. Vite warns about it. Large static datasets (`activitySuggestions.ts`, `collegeAdmissionsData.ts`) and every view ship upfront.
- **Fix:** Use `React.lazy` per tab/view, put `recharts` and the large datasets in dynamic imports, and serve assets through a CDN (Firebase Hosting or Cloud CDN) with long-lived immutable caching. `express.static` currently sends `Cache-Control: public, max-age=0` for everything.

### 🟡 S4 — Firestore access patterns
- Six real-time listeners per session (`onSnapshot` on five top-level collections plus students), each loading **all** of an owner's documents with no pagination. Fine for small families, but read cost scales with sessions × documents. Consider subcollections under `users/{uid}` (simpler rules, natural partitioning, easy cascading delete) and pagination for journals.
- No `firestore.indexes.json` is committed. Single-field `ownerId` queries work today, but any future `orderBy` needs composite indexes managed in code.
- `localStorage` and Firestore act as two sources of truth with ad-hoc merge logic. QA reports already document lost children and cross-child data mixing. Make Firestore the single source of truth and use its offline cache.

### 🟡 S5 — Missing operational foundations
| Area | Current | Needed |
|---|---|---|
| CI/CD | None (`.github/` absent) | GitHub Actions: install → typecheck → lint → unit tests → rules tests (emulator) → build → deploy |
| Containerization | None (relies on AI Studio) | `Dockerfile` (multi-stage, prod deps only, non-root), or Firebase App Hosting |
| Infra as code | None | `firebase.json` + `.firebaserc` for rules, indexes, and hosting. Terraform for Cloud Run, secrets, budgets |
| Environments | One Firebase project | Separate dev / staging / prod projects |
| Secrets | `.env` / AI Studio injection | Google Secret Manager mounted into Cloud Run |
| Observability | `console.log` | Structured logs (pino), Cloud Error Reporting or Sentry (frontend + backend), uptime checks, Gemini spend dashboards and budget alerts |
| Health checks | None | `/healthz` (liveness) and `/readyz` |
| Graceful shutdown | None | Handle `SIGTERM` (Cloud Run sends it) and drain connections |
| Backups | None configured | Firestore PITR + scheduled exports to GCS |

---

## 5. Findings — Code Quality & Tech Stack

| # | Issue | Recommendation |
|---|---|---|
| Q1 | `App.tsx` is 8,538 lines with 63 `useState` hooks. `server.ts` is 2,904 lines. Both are very hard to review, test, or change safely | Split into feature modules: `features/activities`, `features/journal`, `features/essays`, `features/colleges`, `features/family`. Add a router (React Router / TanStack Router) for deep links. Move server routes to `server/routes/*.ts` with services and validation layers |
| Q2 | **No automated tests.** Lint is `tsc --noEmit` plus a custom regex hook checker | Vitest + React Testing Library for components, Supertest for API routes, Playwright for critical flows (sign-in, add activity, AI coach, family share), `@firebase/rules-unit-testing` for rules |
| Q3 | ESLint is configured only for the security-rules plugin, with no TS or React lint | Add `typescript-eslint`, `eslint-plugin-react-hooks` (replaces `scripts/check-hooks.ts`), and `eslint-plugin-jsx-a11y`. Add Prettier |
| Q4 | `tsconfig.json` has no `strict: true` | Enable `strict` (and `noUncheckedIndexedAccess`) gradually. The server uses many `Record<string, unknown>` casts on request bodies |
| Q5 | Build tools (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`) are runtime `dependencies` | Move them to `devDependencies` so the production image stays lean |
| Q6 | `start: node server.ts` depends on Node's type stripping (Node ≥22.18). No `engines` field | Pin `"engines": { "node": ">=22.18" }`, or compile the server with `esbuild` (already a devDependency) to `dist/server.js` |
| Q7 | Lockfile is Bun-only, but scripts and the runtime are Node | Pick one toolchain. If Node in production, commit `package-lock.json` (or use Bun end-to-end, including the Docker image) |
| Q8 | Business rules live as regexes in server code (`buildPreservingActivityPolishes`, fallback generators), much of it patched per QA run ("fixes Run 4 BUG-01") | Cover with unit tests before refactoring. Separate deterministic text utilities from route handlers |
| Q9 | Bleeding-edge major versions (TypeScript 7.0, Vite 8, ESLint 10, Firebase 13, React 19) | Fine, but pin exact versions for releases and use Renovate/Dependabot to upgrade deliberately |
| Q10 | Hardcoded Firebase project IDs and the auth proxy host | Drive them from env/config per environment |

---

## 6. Recommended Target Architecture

### 6.1 Overview
```
                   ┌──────────── Cloud Armor / rate limiting ────────────┐
Browser ──HTTPS──► Firebase Hosting (CDN, static SPA, /__/auth native)
   │                     │ rewrite /api/** 
   │                     ▼
   │              Cloud Run "api" (stateless Express, min 1 / max N instances)
   │                ├─ requireAuth: firebase-admin verifyIdToken + App Check token
   │                ├─ zod request validation, size limits
   │                ├─ quota service ─► Firestore (atomic counters) or Memorystore Redis
   │                ├─ Gemini via Vertex AI (paid tier, data not used for training)
   │                └─ structured logs ─► Cloud Logging / Error Reporting
   │
   └─ Firestore SDK (rules-enforced) ─► Firestore
                                        ├─ users/{uid}/... (owner data)
                                        └─ families/{familyId} (members map, roles)
Cloud Functions: onUserDeleted cascade · scheduled trash purge · nightly export to GCS
Secret Manager: GEMINI/Vertex creds, Scorecard key       Budgets & alerts on AI spend
```

### 6.2 Family sharing done safely (replaces `/api/family-sync/*`)
- `families/{familyId}`: `{ ownerUid, members: { [uid]: 'parent' | 'student' }, invitedEmails: [...] }`
- A parent invites a student or co-parent by email. The invitee signs in, and a **callable Cloud Function** verifies `request.auth.token.email == invitedEmail && email_verified` before adding their uid to `members`.
- Child records carry `familyId`. Rules allow access when `request.auth.uid in get(/families/$(familyId)).data.members`.
- No share codes and no server-side copies of portfolios. Firestore stays the single source of truth.

---

## 7. Prioritized Remediation Roadmap

### Phase 0 — Before any public traffic (blockers, ~1 week)
- [ ] **Take `/api/family-sync/publish` and `/lookup` offline now** and delete `.family-portfolios.json` from any running instance (C1, C2)
- [ ] Add `requireAuth` middleware that verifies the Firebase ID token. Send `Authorization: Bearer` from the client (H1)
- [ ] Use an admin custom claim instead of the email header. Rotate the invite code and remove hardcoded codes and emails (C3, C4)
- [ ] Put `/api/events/recent-competitions` behind auth and quota. Add IP rate limiting (C4)
- [ ] Set Google Cloud billing budgets and alerts, and a per-key quota on the Gemini API (C4)
- [ ] Remove `public/assets/aistudio/*.pdf` and `.aistudio/` from the repo and deployment (H6)
- [ ] Remove the demo/QA data-deletion heuristics (H5)
- [ ] Upgrade `express`/`body-parser` and `firebase` (H8)

### Phase 1 — Production hardening (~2–3 weeks)
- [ ] Move quotas and allow-lists to Firestore/Redis. Make the server stateless (S1)
- [ ] Add `helmet` + CSP, `trust proxy`, and disable `x-powered-by` (H2)
- [ ] Validate every API body with a schema, limit sizes, and fix the college cache-poisoning path (H3)
- [ ] Enable and enforce Firebase App Check. Restrict the Web API key (M2)
- [ ] Implement account deletion cascade, server-side trash purge, and data export (H7)
- [ ] Stop mirroring PII into `localStorage`, or clear it on sign-out (H4)
- [ ] Implement the Firestore-native family sharing model (§6.2)
- [ ] Confirm Gemini paid tier / Vertex AI and align the privacy page (M5, M6)
- [ ] Add a Dockerfile or App Hosting config, `firebase.json`, separate dev/staging/prod projects, and Secret Manager (S5)

### Phase 2 — Scale & maintainability (ongoing)
- [ ] CI pipeline with typecheck, lint, unit, rules, and E2E tests (Q2, Q3, S5)
- [ ] Code-split the frontend and serve it from a CDN (S3)
- [ ] Break up `App.tsx` and `server.ts`, and add a router (Q1)
- [ ] Gemini resilience: `AbortController`, overall deadlines, configurable models, circuit breaker (S2)
- [ ] Observability: Sentry/Error Reporting, structured logs, uptime checks, spend dashboards (S5)
- [ ] Firestore PITR and scheduled backups. Consider moving child data into `users/{uid}` subcollections (S4)
- [ ] Legal/compliance review: COPPA verifiable parental consent, privacy policy accuracy, a data processing agreement with Google, state student-privacy laws

---

## 8. What Is Already Good
- **Firestore rules** are default-deny, check ownership on every collection, enforce strict key allow-lists and size limits, keep `createdAt` immutable, use server timestamps, and limit which fields each update may change.
- The PII split between `users/{uid}` and `familyProfile` is a sensible design.
- The Gemini key stays on the server and never reaches the client.
- Basic PII redaction runs before model calls, and the prompts restrict the AI to the student's own data.
- Deterministic fallbacks keep the UX working during model outages.
- Typecheck (`tsc --noEmit`) and the production build both pass cleanly.

---

## Appendix A — Verification Log
| Check | Result |
|---|---|
| `bun install --frozen-lockfile` | OK (385 packages) |
| `tsc --noEmit` | Pass (0 errors) |
| `vite build` | Pass. **Warning:** `index-*.js` is 1,737.85 kB (477 kB gzip) |
| `bun audit` | 3 vulnerabilities (2 high, 1 low). See H8 |
| `POST /api/beta/admin-update` with spoofed `x-user-email` | **200 OK**. Limits changed, invite code disclosed (C3) |
| `POST /api/family-sync/publish` then anonymous `POST /lookup {email}` | **Full bundle returned** (C1/C2) |
| `GET /` response headers | No CSP/HSTS/XCTO. `X-Powered-By: Express` present (H2) |
| `GET /assets/aistudio/<QA report>.pdf` | **200 OK**. Internal report publicly served (H6) |
| Server writes `.beta-access.json`, `.family-portfolios.json` to the working directory | Confirmed (S1) |

All local test artifacts (`dist/`, JSON stores) were deleted after verification. No production systems were contacted.
