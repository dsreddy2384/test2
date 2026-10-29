import express from 'express';
import compression from 'compression';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  createServerStore,
  FamilyEntryTooLargeError,
  getLinkedEmails,
  type BetaConfig,
  type DayUsage,
  type FamilyEntry,
} from './server/store.ts';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Firebase ID token verification
// Every caller identity on the server comes from a verified Firebase ID token
// (Authorization: Bearer <idToken>). Client-supplied email/uid headers or body
// fields are never trusted.
// ============================================================================
function readFirebaseAppletConfig(): Record<string, unknown> {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8')
    );
  } catch {
    return {};
  }
}

const firebaseAppletConfig = readFirebaseAppletConfig();
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || String(firebaseAppletConfig.projectId || '');
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || String(firebaseAppletConfig.firestoreDatabaseId || '');

// Server-side JSON stores live outside the project folder: when the server falls back
// to the Vite dev server, every file in the project root is publicly downloadable.
const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'pathtoadmit-data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function dataFilePath(fileName: string): string {
  const target = path.join(DATA_DIR, fileName);
  // One-time move of stores written by older versions into the project root.
  for (const legacy of [path.join(__dirname, fileName), path.join(process.cwd(), fileName)]) {
    try {
      if (fs.existsSync(legacy) && !fs.existsSync(target)) {
        fs.copyFileSync(legacy, target);
      }
      if (fs.existsSync(legacy)) {
        fs.unlinkSync(legacy);
      }
    } catch (e) {
      console.warn(`Could not move legacy ${fileName} into DATA_DIR:`, e);
    }
  }
  return target;
}
const adminApp = initializeAdminApp(
  FIREBASE_PROJECT_ID ? { projectId: FIREBASE_PROJECT_ID } : undefined
);
const adminAuth = getAdminAuth(adminApp);

interface VerifiedUser {
  uid: string;
  email: string; // lowercased; empty unless the provider verified it
}

const verifiedUserByRequest = new WeakMap<express.Request, VerifiedUser>();

function getVerifiedUser(req: express.Request): VerifiedUser | null {
  return verifiedUserByRequest.get(req) || null;
}

async function attachVerifiedUser(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) {
    try {
      const decoded = await adminAuth.verifyIdToken(match[1]);
      verifiedUserByRequest.set(req, {
        uid: decoded.uid,
        email:
          decoded.email && decoded.email_verified
            ? decoded.email.trim().toLowerCase()
            : '',
      });
    } catch {
      // Invalid or expired token: continue as an anonymous request.
    }
  }
  next();
}

const MODEL_FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

const FAST_POLISH_MODEL_CHAIN = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

let cachedGenAIClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined = undefined;

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!cachedGenAIClient || cachedApiKey !== apiKey) {
    cachedGenAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedGenAIClient;
}

// Fast in-memory LRU cache for 150-char AI Polish responses
const POLISH_CACHE_MAX = 200;
const polishCache = new Map<
  string,
  { suggestions: { styleLabel: string; text: string }[]; timestamp: number }
>();

function getPolishCacheKey(
  activityType?: string,
  position?: string,
  organization?: string,
  draftDescription?: string
): string {
  return [
    String(activityType || '').trim().toLowerCase(),
    String(position || '').trim().toLowerCase(),
    String(organization || '').trim().toLowerCase(),
    String(draftDescription || '').trim().toLowerCase(),
  ].join('|');
}

function cleanJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

/**
 * Calls Gemini with low-latency thinkingConfig and fast model fallback
 * so UI interactions don't stall on default HIGH thinking budgets or slow retries.
 */
async function generateJsonWithFallback(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string,
  responseSchema: Record<string, unknown>,
  options?: {
    fastMode?: boolean;
    timeoutMs?: number;
    temperature?: number;
  }
): Promise<Record<string, unknown>> {
  let lastError: unknown = null;
  const models = options?.fastMode ? FAST_POLISH_MODEL_CHAIN : MODEL_FALLBACK_CHAIN;
  const timeoutMs = options?.timeoutMs ?? (options?.fastMode ? 3800 : 9000);

  for (const modelName of models) {
    try {
      const thinkingConfig =
        modelName === 'gemini-3.1-flash-lite'
          ? { thinkingLevel: ThinkingLevel.MINIMAL }
          : modelName === 'gemini-3.8-flash'
          ? { thinkingLevel: ThinkingLevel.LOW }
          : undefined;

      const response = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: options?.temperature ?? 0.4,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Model ${modelName} timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);

      const text = cleanJsonText(response.text || '{}');
      return JSON.parse(text) as Record<string, unknown>;
    } catch (err) {
      lastError = err;
      // Immediately try the next model in the chain without sleeping
      continue;
    }
  }

  throw lastError || new Error('All Gemini models are temporarily unavailable.');
}

/**
 * Dynamic portfolio-aware fallback if all upstream models experience a simultaneous 503 outage.
 */
/**
 * Safely trims a Common App description at a complete clause or word boundary <= maxLen (default 148)
 * so no word is ever sliced in half (e.g., never "mento" or "younge").
 */
function trimToWordBoundary(text: string, maxLen = 148): string {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  if (clean.length <= maxLen) {
    return /[.!?)%+]$/.test(clean) ? clean : `${clean.replace(/[,;:\-\s]+$/, '')}.`;
  }

  const slice = clean.slice(0, maxLen - 1);

  // Prefer cutting at a semicolon clause boundary if it preserves at least 75 chars
  const lastSemicolon = slice.lastIndexOf(';');
  if (lastSemicolon >= 75) {
    const clause = slice.slice(0, lastSemicolon).replace(/[,;:\-\s]+$/, '');
    return /[.!?)%+]$/.test(clause) ? clause : `${clause}.`;
  }

  const lastSpace = slice.lastIndexOf(' ');
  let cut = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;

  // Strip trailing prepositions, conjunctions, articles, or modifiers that would dangle at the end
  cut = cut
    .replace(
      /\s+(?:&|and|or|with|for|to|of|in|at|by|on|as|from|the|a|an|across|into|toward|via|per|younger|fellow|local|weekly|monthly|new|our|their)\s*$/i,
      ''
    )
    .replace(
      /\s+(?:&|and|or|with|for|to|of|in|at|by|on|as|from|the|a|an)\s*$/i,
      ''
    )
    .replace(/[,;:\-&/\s]+$/, '');

  return /[.!?)%+]$/.test(cut) ? cut : `${cut}.`;
}

/**
 * Redacts personal identifiable information (emails, phone numbers, street addresses)
 * before any text is sent to an external AI model.
 */
function redactPIIForAI(text: string): string {
  return String(text || '')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
}

/**
 * Polishes an activity description while preserving 100% of the student's specific numbers,
 * accomplishments, and domain details (and never repeating Organization/Position in a template).
 */
function buildPreservingActivityPolishes(
  rawDraft: string,
  position: string,
  organization: string,
  activityType = 'Extracurricular',
  hoursPerWeek?: number,
  weeksPerYear?: number
): {
  primaryUpgrade: string;
  suggestions: { styleLabel: string; text: string }[];
} {
  const base = String(rawDraft || '')
    .replace(/\s+/g, ' ')
    .trim();
  const catLower = String(activityType || '').toLowerCase();
  const posLower = String(position || '').toLowerCase();
  const knownHrs = Number(hoursPerWeek) > 0 ? Number(hoursPerWeek) : 0;
  const knownWks = Number(weeksPerYear) > 0 ? Number(weeksPerYear) : 0;
  const hrsLabel = knownHrs > 0 ? `${knownHrs} hrs/wk` : '[#] hrs/wk';
  const scheduleLabel =
    knownHrs > 0 && knownWks > 0
      ? `${knownHrs} hrs/wk, ${knownWks} wks/yr`
      : hrsLabel;

  const defaultVerb =
    catLower.includes('music') || catLower.includes('art') || catLower.includes('theater') || catLower.includes('dance')
      ? 'Performed'
      : catLower.includes('robot') || catLower.includes('computer') || catLower.includes('science') || catLower.includes('research')
        ? 'Engineered'
        : catLower.includes('athletics')
          ? 'Competed'
          : catLower.includes('service') || catLower.includes('volunteer')
            ? 'Organized'
            : /(founder|president|captain|lead|director|chair)/i.test(posLower)
              ? 'Spearheaded'
              : 'Dedicated';

  if (!base) {
    const opt1 = trimToWordBoundary(
      `${defaultVerb} ${activityType.toLowerCase()} repertoire & skills (${scheduleLabel}); participated in [#] showcases.`
    );
    const opt2 = trimToWordBoundary(
      `Dedicated ${hrsLabel} to hands-on practice & skill progression; contributed to [#] school/community events.`
    );
    const opt3 = trimToWordBoundary(
      `Honed ${activityType.toLowerCase()} technique across weekly sessions (${hrsLabel}); prepared for [#] performances/meets.`
    );
    return {
      primaryUpgrade: opt1,
      suggestions: [
        { styleLabel: 'Action & Fill-In Metrics ([#])', text: opt1 },
        { styleLabel: 'Skill & Dedication Focus', text: opt2 },
        { styleLabel: 'Concise Common App Format', text: opt3 },
      ],
    };
  }

  // Split into raw clauses by semicolon or period and remove duplicate/repeated clauses
  const rawClauses = base
    .split(/\s*;\s*|\.\s+/)
    .map((c) => c.trim().replace(/[.]+$/, ''))
    .filter(Boolean);

  const baseAlreadyHasPracticed = /\bpracticed\b/i.test(base);
  const baseAlreadyHasHrs = /\b\d+\s*(?:hrs?|hours?|h)\s*\/\s*(?:wk|week)\b/i.test(base);

  const normalizeClauseForPolish = (clause: string, useFillInBrackets: boolean): string => {
    const playReplacementPrefix = baseAlreadyHasPracticed
      ? 'Studied'
      : catLower.includes('music')
        ? 'Practiced'
        : 'Played';
    let c = clause
      .replace(/^I\s+(?:have\s+|had\s+|was\s+|am\s+)?/i, '')
      .replace(/\bI\s+(?:also\s+)?/gi, '')
      .replace(/^Responsible\s+for\s+/i, '')
      .replace(/^Helped\s+(?:to\s+|with\s+)?/i, 'Supported ')
      .replace(/^Worked\s+(?:on\s+|with\s+)/i, 'Collaborated on ')
      .replace(/^Participated\s+in\s+/i, 'Competed in ')
      .replace(
        /^play\s+([a-z]+)\s+and\s+take\s+lessons\s+every\s+week/i,
        `${playReplacementPrefix} $1 & completed weekly lessons`
      )
      .replace(
        /^play\s+([a-z]+)\s+and\s+take\s+weekly\s+lessons/i,
        `${playReplacementPrefix} $1 & completed weekly lessons`
      )
      .replace(/^play\s+/i, `${playReplacementPrefix} `)
      .replace(/\band\s+take\s+lessons\s+every\s+week\b/gi, '& completed weekly lessons')
      .replace(/\btake\s+lessons\s+every\s+week\b/gi, 'completed weekly lessons')
      .replace(/\bevery\s+week\b/gi, 'weekly')
      .replace(/\bmy\s+/gi, '')
      .replace(/\bin\s+order\s+to\b/gi, 'to')
      .replace(/\bsuccessfully\s+/gi, '')
      .replace(/\bvarious\s+/gi, '')
      .replace(/\s+and\s+/g, ' & ')
      .trim();

    if (useFillInBrackets) {
      c = c.replace(/\b(?:a\s+few|several|some|multiple|many)\s+/gi, '[#] ');
      if (!baseAlreadyHasHrs) {
        c = c.replace(/\bweekly\s+lessons\b/gi, `weekly lessons (${hrsLabel})`);
      }
    }
    return c;
  };

  // Deduplicate ONLY clauses that repeat both the same action AND core noun (e.g. "performed at a few recitals; performed at 10+ recitals")
  // Never drop a distinct clause like "Studied piano & completed weekly lessons" when another clause says "practiced 4 hrs/wk on repertoire & technique"
  const dedupedClauses: string[] = [];
  for (const rc of rawClauses) {
    const cleaned = normalizeClauseForPolish(rc, false);
    const stems = cleaned
      .toLowerCase()
      .replace(/\[[^\]]+\]/g, '')
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !['with', 'from', 'weekly', 'every', 'week', 'school'].includes(w))
      .map((w) => w.replace(/(ed|ing|es|s)$/, ''));

    const existingIdx = dedupedClauses.findIndex((existing) => {
      const exStems = existing
        .toLowerCase()
        .replace(/\[[^\]]+\]/g, '')
        .split(/[^a-z]+/)
        .filter((w) => w.length >= 4 && !['with', 'from', 'weekly', 'every', 'week', 'school'].includes(w))
        .map((w) => w.replace(/(ed|ing|es|s)$/, ''));
      const overlap = stems.filter((s) => exStems.includes(s)).length;
      return overlap >= 2;
    });

    if (existingIdx !== -1) {
      // Keep whichever duplicate clause has explicit numbers/brackets or more detail
      const prevHasNum = /\d|\[#\]/.test(dedupedClauses[existingIdx]);
      const currHasNum = /\d|\[#\]/.test(cleaned);
      if (currHasNum && !prevHasNum) {
        dedupedClauses[existingIdx] = cleaned;
      } else if (cleaned.length > dedupedClauses[existingIdx].length && currHasNum === prevHasNum) {
        dedupedClauses[existingIdx] = cleaned;
      }
    } else {
      dedupedClauses.push(cleaned);
    }
  }

  const finalClauses = dedupedClauses.length > 0 ? dedupedClauses : [normalizeClauseForPolish(base, false)];
  const hasVagueCount = /\b(a\s+few|several|some|multiple|many)\b/i.test(base) || !/\d/.test(base);

  // Option 1: Faithful, active-verb Common App rephrase of ONLY the student's stated facts (no invented words like "seasonal" and no dropped clauses!)
  const opt1Clauses = finalClauses.map((c, idx) => {
    const formatted = c
      .replace(/\ba\s+few\s+/gi, '')
      .replace(/\bseveral\s+/gi, '');
    return idx === 0
      ? formatted.charAt(0).toUpperCase() + formatted.slice(1)
      : formatted.charAt(0).toLowerCase() + formatted.slice(1);
  });
  let v1 = opt1Clauses.join('; ');
  if (v1.toLowerCase() === base.replace(/[.]+$/, '').toLowerCase()) {
    v1 = `${defaultVerb} ${v1.charAt(0).toLowerCase() + v1.slice(1)}`;
  }
  const polished1 = trimToWordBoundary(v1, 148);

  // Option 2: Fill-In Metric Template (replaces vague quantifiers like "a few recitals" with "[#] recitals" and uses known hrs/wk ONLY if not already written in the draft)
  const fillInClauses = rawClauses.length > 0
    ? dedupedClauses.map((c) => {
        let updated = c.replace(/\b(?:a\s+few|several|some|multiple|many)\s+/gi, '[#] ');
        if (!baseAlreadyHasHrs) {
          updated = updated.replace(/\bweekly\s+lessons\b/gi, `weekly lessons (${hrsLabel})`);
        }
        return updated;
      })
    : [normalizeClauseForPolish(base, true)];

  let v2 = fillInClauses
    .map((c, idx) =>
      idx === 0
        ? c.charAt(0).toUpperCase() + c.slice(1)
        : c.charAt(0).toLowerCase() + c.slice(1)
    )
    .join('; ');
  if (!v2.includes('[#]') && !/\d+\s*(?:hrs?|h)\/wk/i.test(v2)) {
    v2 = `${v2.replace(/[.]+$/, '')} (${hrsLabel}; [#] events/recitals)`;
  }
  const polished2 = trimToWordBoundary(v2, 148);

  // Option 3: Outcome-First / Reordered Common App Structure (distinct from Option 1 & Option 2)
  let v3 = '';
  if (finalClauses.length >= 2) {
    const reversed = [...finalClauses].reverse().map((c, idx) => {
      const cleanC = c
        .replace(/\ba\s+few\s+/gi, '')
        .replace(/\bseveral\s+/gi, '');
      return idx === 0
        ? cleanC.charAt(0).toUpperCase() + cleanC.slice(1)
        : cleanC.charAt(0).toLowerCase() + cleanC.slice(1);
    });
    v3 = reversed.join('; ');
  } else {
    const single = finalClauses[0].replace(/\ba\s+few\s+/gi, '');
    v3 = `Honed ${activityType.toLowerCase()} skills: ${single.charAt(0).toLowerCase() + single.slice(1)}`;
  }
  if (v3.toLowerCase() === polished1.replace(/[.]+$/, '').toLowerCase() || v3.toLowerCase() === polished2.replace(/[.]+$/, '').toLowerCase()) {
    v3 = `Dedicated weekly practice to ${finalClauses.join('; ').toLowerCase()}`;
  }
  const polished3 = trimToWordBoundary(v3, 148);

  const missingMetricQuestion = /\brecital/i.test(base) && !/\d+\s+recital/i.test(base)
    ? 'Fill-In Metrics (How many recitals?)'
    : hasVagueCount
      ? 'Fill-In Metrics (Add Your Exact Numbers [#])'
      : 'Quantified Common App Format';

  return {
    primaryUpgrade: polished1,
    suggestions: [
      { styleLabel: 'Active Rephrase (Your Stated Facts Only)', text: polished1 },
      { styleLabel: missingMetricQuestion, text: polished2 },
      { styleLabel: 'Outcome-First Common App Structure', text: polished3 },
    ],
  };
}

/**
 * Upgrades an existing saved activity for AI Admissions Coach while:
 * 1) Preserving 100% of original facts, weekly lessons, awards, qualifications, numbers, and grade ranges in active past tense
 * 2) Filling in the activity's already-stored hoursPerWeek/weeksPerYear ONLY when the student has NOT already written hrs/wk in their description
 * 3) Returning addedMetricFlag ONLY when a metric was genuinely added from stored schedule data (never when the student already wrote it).
 */
function buildCoachActivityUpgrade(act: Record<string, unknown>): {
  activityId: string;
  organization: string;
  currentDescription: string;
  upgradedDescription: string;
  whyItWorks: string;
  addedMetricFlag?: string;
} {
  const pos = String(act.position || 'Member');
  const org = String(act.organization || 'Organization');
  const currentDesc = String(act.description || '').trim();
  const cat = String(act.activityType || 'Extracurricular');
  const hrs = Number(act.hoursPerWeek) > 0 ? Number(act.hoursPerWeek) : 0;
  const wks = Number(act.weeksPerYear) > 0 ? Number(act.weeksPerYear) : 0;

  let addedMetricFlag: string | undefined;

  // Check whether the student ALREADY wrote hrs/wk or wks/yr in their description text
  const alreadyHasHrsInText = /\b\d+\s*(?:hrs?|hours?|h)\s*\/\s*(?:wk|week)\b/i.test(currentDesc);
  const alreadyHasWksInText = /\b\d+\s*(?:wks?|weeks?)\s*\/\s*(?:yr|year)\b/i.test(currentDesc);

  let seedDesc = currentDesc;
  const hadHrsPlaceholder =
    !alreadyHasHrsInText &&
    (/\[#\]\s*(?:hrs?|hours?)\/wk/i.test(currentDesc) ||
      /\b(?:take\s+lessons\s+every\s+week|every\s+week)\b/i.test(currentDesc));
  const hadWksPlaceholder =
    !alreadyHasWksInText && /\[#\]\s*(?:wks?|weeks?)\/yr/i.test(currentDesc);

  if (hrs > 0 && !alreadyHasHrsInText && /\[#\]\s*(?:hrs?|hours?)\/wk/i.test(seedDesc)) {
    seedDesc = seedDesc.replace(/\[#\]\s*(?:hrs?|hours?)\/wk/gi, `${hrs} hrs/wk`);
    addedMetricFlag = `${hrs} hrs/wk`;
  }
  if (wks > 0 && hadWksPlaceholder) {
    seedDesc = seedDesc.replace(/\[#\]\s*(?:wks?|weeks?)\/yr/gi, `${wks} wks/yr`);
    addedMetricFlag = addedMetricFlag ? `${addedMetricFlag}, ${wks} wks/yr` : `${wks} wks/yr`;
  }

  // Check if currentDesc starts with first-person "I " or weak phrasing ("a few", "every week")
  const startsWithFirstPersonOrWeak =
    /^I\s+/i.test(seedDesc) ||
    /\bI\s+(?:performed|played|took|helped|worked)\b/i.test(seedDesc) ||
    /\b(?:a\s+few|every\s+week)\b/i.test(seedDesc);

  let basePolished = seedDesc.replace(/[.]+$/, '').trim();
  if (startsWithFirstPersonOrWeak) {
    const { primaryUpgrade, suggestions } = buildPreservingActivityPolishes(
      seedDesc,
      pos,
      org,
      cat,
      hrs || undefined,
      wks || undefined
    );
    // Only pick the option that injects stored hrs/wk if the student had NOT already written hrs/wk in their description
    const optWithKnownHours =
      !alreadyHasHrsInText && hrs > 0
        ? suggestions.find(
            (s) => s.text.includes(`${hrs} hrs/wk`) && !s.text.includes('[#]')
          )
        : undefined;
    if (optWithKnownHours) {
      basePolished = optWithKnownHours.text.replace(/[.]+$/, '').trim();
      addedMetricFlag = `${hrs} hrs/wk`;
    } else {
      basePolished = primaryUpgrade.replace(/[.]+$/, '').trim();
      if (
        hadHrsPlaceholder &&
        !alreadyHasHrsInText &&
        hrs > 0 &&
        /\bweekly\s+lessons\b/i.test(basePolished) &&
        !/\bhrs\/wk\b/i.test(basePolished)
      ) {
        const withKnownHrs = basePolished.replace(
          /\bweekly\s+lessons\b/i,
          `weekly lessons (${hrs} hrs/wk)`
        );
        if (withKnownHrs.length <= 149) {
          basePolished = withKnownHrs;
          addedMetricFlag = `${hrs} hrs/wk`;
        }
      }
    }
  } else {
    // Already strong active past tense: reorder to lead with the standout outcome/award clause if multi-clause, preserving 100% of facts, numbers, awards, and grade ranges
    const clauses = basePolished
      .split(/\s*;\s*/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (clauses.length >= 2) {
      const outcomeIdx = clauses.findIndex(
        (c, i) =>
          i > 0 &&
          /\b(qualified|won|earned|championship|award|first|published|distributed|arranged|scholar-athlete|readers)\b/i.test(
            c
          )
      );
      if (outcomeIdx > 0) {
        const leadClause =
          clauses[outcomeIdx].charAt(0).toUpperCase() +
          clauses[outcomeIdx].slice(1);
        const restClauses = clauses
          .filter((_, i) => i !== outcomeIdx)
          .map((c) => c.charAt(0).toLowerCase() + c.slice(1));
        const reordered = [leadClause, ...restClauses].join('; ');
        if (reordered.length <= 149) {
          basePolished = reordered;
        }
      }
    }
  }

  // Ensure any remaining "[#]" is removed so AI Coach never suggests a raw "[#]" placeholder
  basePolished = basePolished
    .replace(/\(\s*\[#\]\s*hrs\/wk\s*\)/gi, !alreadyHasHrsInText && hrs > 0 ? `(${hrs} hrs/wk)` : '')
    .replace(/\b\[#\]\s+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[.]+$/, '')
    .trim();

  const finalDesc = `${basePolished}.`;

  const whyItWorks = addedMetricFlag
    ? `Preserves every stated fact, lesson schedule, award, and number in active past tense while filling in your logged schedule (${addedMetricFlag} — please confirm).`
    : 'Preserves 100% of your stated facts, lessons, hours, and accomplishments while converting first-person phrasing into concise, active Common App prose.';

  return {
    activityId: String(act.id || ''),
    organization: org,
    currentDescription: currentDesc,
    upgradedDescription: finalDesc.slice(0, 150),
    whyItWorks,
    ...(addedMetricFlag ? { addedMetricFlag } : {}),
  };
}

function buildDynamicCoachFallback(
  profile: Record<string, unknown> = {},
  familyProfile: Record<string, unknown> = {},
  activities: Record<string, unknown>[] = [],
  honors: Record<string, unknown>[] = [],
  customQuestion?: string
) {
  const grade = Number(profile.currentGrade) || 10;
  const rawMajors = String(familyProfile.intendedMajors || '').trim();
  const isDefaultUnusedMajor =
    !rawMajors ||
    rawMajors === 'Environmental Science & Data Analytics' ||
    rawMajors === 'STEM & Interdisciplinary Studies';
  const dreamSchools = String(profile.dreamColleges || '').trim() || 'Selective Universities';
  const totalActs = activities.length;
  const totalHonors = honors.length;
  const starredCount = activities.filter(
    (a) => Number(a.commonAppSlot) >= 1 && Number(a.commonAppSlot) <= 10
  ).length;

  // Ground spike archetype & domain strictly in the student's primary (#1 Common App slot or first) activity and intended major first
  const primaryAct =
    activities.find((a) => Number(a.commonAppSlot) === 1) ||
    activities[0] ||
    {};
  const firstActCategory = String(primaryAct.activityType || '').trim();
  const firstActPos = String(primaryAct.position || 'Participant').trim();
  const firstActOrg = String(primaryAct.organization || 'Activity').trim();
  const primaryDesc = String(primaryAct.description || '').trim();
  const primaryHrs = Number(primaryAct.hoursPerWeek) > 0 ? Number(primaryAct.hoursPerWeek) : 0;
  const primaryWks = Number(primaryAct.weeksPerYear) > 0 ? Number(primaryAct.weeksPerYear) : 0;
  const alreadyHasHoursLogged =
    primaryHrs > 0 || /\b\d+\s*(?:hrs?|hours?|h)\s*\/\s*(?:wk|week)\b/i.test(primaryDesc);
  const scheduleTag =
    primaryHrs > 0 && primaryWks > 0
      ? `${primaryHrs} hrs/wk, ${primaryWks} wks/yr`
      : primaryHrs > 0
        ? `${primaryHrs} hrs/wk`
        : '';
  const hasVagueCountInPrimary = /\b(a\s+few|several|some|multiple|many)\b/i.test(primaryDesc);

  const primaryActText = `${firstActCategory} ${firstActPos} ${firstActOrg} ${primaryDesc}`.toLowerCase();
  const allActText = activities
    .map((a) => `${a.activityType || ''} ${a.position || ''} ${a.organization || ''} ${a.description || ''}`)
    .join(' ')
    .toLowerCase();

  const firstHonor = honors[0] || {};
  const firstHonorTitle = String(firstHonor.title || 'Academic Honor').trim();
  const firstHonorLevel = String(firstHonor.recognitionLevel || 'State/Regional').trim();

  const hasMultiYearAct = activities.some(
    (a) => Array.isArray(a.grades) && a.grades.length >= 2
  );
  const hasMentorshipAct = /\b(mentor|mentored|tutor|tutored|coach|coached|taught|instructed)\b/i.test(
    allActText
  );

  let groundedDomain = 'Extracurricular & Academic';
  if (totalActs === 0) {
    groundedDomain = isDefaultUnusedMajor ? 'Early Portfolio Explorer' : rawMajors.split(',')[0].trim();
  } else if (
    firstActCategory.includes('Robotics') ||
    firstActCategory.includes('Computer') ||
    /\b(robot|robotics|coding|code|python|c\+\+|java|software|computer|autonomous|engineering)\b/i.test(primaryActText) ||
    (!isDefaultUnusedMajor && /\b(robot|robotics|computer|software|engineering)\b/i.test(rawMajors) && /\b(robot|coding|code|c\+\+|stem|science)\b/i.test(allActText))
  ) {
    groundedDomain = 'Robotics, Coding & Engineering';
  } else if (
    firstActCategory.startsWith('Music') ||
    /\b(piano|violin|cello|flute|music|orchestra|band|choir|recital)\b/i.test(primaryActText)
  ) {
    groundedDomain = 'Music & Performing Arts';
  } else if (
    firstActCategory.includes('Science') ||
    firstActCategory.includes('Research') ||
    /\b(science|math|physics|chemistry|biology|olympiad|research)\b/i.test(primaryActText)
  ) {
    groundedDomain = 'STEM & Scientific Inquiry';
  } else if (
    firstActCategory.includes('Athletics') ||
    /\b(basketball|tennis|soccer|track|swim|varsity|jv|athletic)\b/i.test(primaryActText)
  ) {
    groundedDomain = 'Student-Athlete & Team Leadership';
  } else if (
    firstActCategory.includes('Art') ||
    firstActCategory.includes('Theater') ||
    firstActCategory.includes('Dance')
  ) {
    groundedDomain = 'Visual & Performing Arts';
  } else if (
    firstActCategory.includes('Service') ||
    firstActCategory.includes('Volunteer') ||
    firstActCategory.includes('Environmental')
  ) {
    groundedDomain = 'Community Service & Civic Impact';
  } else if (/\b(robot|coding|code|python|software|computer|app)\b/i.test(allActText)) {
    groundedDomain = 'Robotics, Coding & Engineering';
  } else if (/\b(piano|violin|cello|flute|music|orchestra|band|choir|recital)\b/i.test(allActText)) {
    groundedDomain = 'Music & Performing Arts';
  } else if (!isDefaultUnusedMajor) {
    groundedDomain = rawMajors.split(',')[0].trim();
  } else if (firstActCategory) {
    groundedDomain = firstActCategory;
  }

  const actCountPhrase = `${totalActs} ${totalActs === 1 ? 'activity' : 'activities'}`;
  const honorCountPhrase = `${totalHonors} ${totalHonors === 1 ? 'academic honor' : 'academic honors'}`;
  const topSlotPhrase =
    starredCount === 1
      ? `your #1 Common App activity (${firstActOrg})`
      : starredCount > 1
        ? `your top ${starredCount} Common App activities`
        : totalActs === 1
          ? `your logged activity (${firstActOrg})`
          : `your ${totalActs} logged activities`;

  const spikeArchetype =
    totalActs === 0
      ? totalHonors > 0
        ? `Emerging ${grade}th Grade Scholar (${honorCountPhrase} Logged)`
        : `Emerging ${grade}th Grade Scholar — Ready to Log First Activity`
      : totalActs === 1
        ? `Emerging ${groundedDomain} Focus (${firstActPos})`
        : hasMentorshipAct
          ? `${groundedDomain.replace(/\s*&\s*/g, ', ')} & Peer Mentorship Leader`
          : `Developing ${groundedDomain} Portfolio`;

  // Realistic readiness score grounded in actual activity count, multi-year depth, and honors
  const multiYearBonus = hasMultiYearAct ? 8 : 0;
  const readinessScore =
    totalActs === 0
      ? Math.min(55, 25 + totalHonors * 8)
      : Math.min(
          95,
          Math.max(
            38,
            34 + totalActs * 8 + totalHonors * 5 + multiYearBonus
          )
        );

  const activityUpgrades = activities.slice(0, 4).map((act) =>
    buildCoachActivityUpgrade(act)
  );

  // Compare stored hours and description before suggesting what to add so we never ask for hours already entered (UX-02 & Suggestion 2)
  const singleActGuidance = alreadyHasHoursLogged
    ? hasVagueCountInPrimary
      ? `With your schedule already documented (${scheduleTag || 'hours logged'}), replacing general counts (such as "a few") with exact event/recital numbers in ${firstActOrg} and adding 2–3 complementary activities will build a competitive narrative.`
      : `With your time commitment already documented (${scheduleTag || 'hours logged'}), adding 2–3 complementary activities and building multi-year progression will round out your Common App narrative.`
    : `Quantifying your weekly schedule and event milestones in ${firstActOrg} and adding 2–3 complementary activities will build a competitive narrative.`;

  const executiveSummary =
    totalActs === 0
      ? totalHonors > 0
        ? `As a ${grade}th grade student targeting ${dreamSchools}, you have logged 0 activities and ${honorCountPhrase} (${firstHonorTitle} — ${firstHonorLevel}). Next, add 2–3 extracurricular commitments—such as clubs, STEM/arts pursuits, athletics, or volunteering—to pair your academic recognition with hands-on depth.`
        : `As a ${grade}th grade student targeting ${dreamSchools}, your portfolio is currently a blank canvas with 0 activities and 0 academic honors logged. Start by adding 2–3 clubs, music/arts pursuits, sports, or service commitments to establish your baseline profile.`
      : totalActs === 1
        ? `As a ${grade}th grade applicant targeting ${dreamSchools}, you have logged ${actCountPhrase} (${firstActPos} at ${firstActOrg}${scheduleTag ? `, ${scheduleTag}` : ''}) and ${honorCountPhrase}. ${singleActGuidance}`
        : `As a ${grade}th grade applicant targeting ${dreamSchools}, your portfolio currently includes ${actCountPhrase} and ${honorCountPhrase}${hasMultiYearAct ? ' with multi-year continuity' : ''}.${hasMentorshipAct ? ' Your combination of skill development and peer mentorship strengthens your narrative.' : ' Focusing on measurable outcomes and leadership roles across your core activities will elevate your Common App.'}`;

  return {
    readinessScore,
    spikeArchetype,
    executiveSummary,
    coachAnswer: customQuestion
      ? `Regarding "${customQuestion}": Build around ${totalActs > 0 ? `${firstActPos} (${firstActOrg})` : totalHonors > 0 ? `your ${firstHonorTitle} distinction and core interests` : 'your core interests'} by documenting concrete milestones (events/recitals performed, repertoire level, or peers impacted) as you build your Common App profile.`
      : totalActs === 0
        ? `Start by logging your first 2–3 extracurricular activities—such as school clubs, music or arts pursuits, athletics, or community service—to build your Common App activity foundation for ${dreamSchools}.`
        : alreadyHasHoursLogged
          ? `Your time commitment (${scheduleTag || 'logged schedule'}) is already recorded for ${topSlotPhrase}; focus next on specifying exact event/performance counts and expanding your portfolio breadth.`
          : `Prioritize adding specific numbers and measurable outcomes to ${topSlotPhrase} so admissions readers can clearly gauge your commitment and growth.`,
    strengths:
      totalActs === 0
        ? [
            ...(totalHonors > 0
              ? [
                  `Documented ${honorCountPhrase} (${firstHonorTitle} — ${firstHonorLevel} recognition) anchoring your academic profile.`,
                ]
              : []),
            `Early start in ${grade}th grade gives you a multi-year runway to build authentic extracurricular depth.`,
            `Academic tracking initialized (${String(familyProfile.curriculumType || 'High School Curriculum')}).`,
          ]
        : totalActs === 1
          ? [
              `Clear foundational commitment in ${firstActCategory || groundedDomain}: ${firstActPos} (${firstActOrg}${scheduleTag ? ` — ${scheduleTag}` : ''}).`,
              alreadyHasHoursLogged
                ? `Consistent time commitment (${scheduleTag}) already logged, with room to specify exact performance/recital counts and repertoire milestones.`
                : `Authentic activity baseline established with room to quantify specific milestones (e.g., exact number of recitals, pieces, or weekly schedule).`,
              totalHonors > 0
                ? `Documented ${honorCountPhrase} to anchor your academic profile.`
                : `Opportunity to pair your ${firstActCategory || groundedDomain} dedication with school or regional honors/festivals.`,
            ]
          : [
              `Logged ${actCountPhrase} anchored by ${firstActPos} at ${firstActOrg}${hasMultiYearAct ? ' across multiple grade levels' : ''}.`,
              `Academic foundation (${String(familyProfile.curriculumType || 'AP / Honors')}, GPA ${String(familyProfile.unweightedGpa || 'In Progress')}) aligned with ${groundedDomain}.`,
              totalHonors > 0
                ? `Recognized with ${honorCountPhrase} supporting your academic and extracurricular profile.`
                : `Consistent weekly time investment across ${actCountPhrase}.`,
            ],
    blindSpots: [
      totalActs < 3
        ? `Portfolio Breadth & Depth: Only ${actCountPhrase} logged so far (Common App provides up to 10 slots for Grades 9–12). Aim to build 4–6 sustained activities.`
        : `Ensure all Common App activity descriptions replace vague words ("a few", "several") with exact numbers within the 150-character limit.`,
      totalHonors === 0
        ? `Academic Honors Gap: 0 academic honors or festival/competition distinctions logged so far (Common App includes 5 Honor slots).`
        : `Consider adding a capstone leadership role, competition showcase, or community project related to ${groundedDomain} before 12th grade.`,
    ],
    nextStepsByGrade: [
      {
        title:
          totalActs > 0
            ? hasVagueCountInPrimary
              ? `Specify Exact Event Counts in ${firstActOrg}`
              : `Deepen Milestones in ${firstActOrg}`
            : `Log Your First 2–3 Activities for ${grade}th Grade`,
        action:
          totalActs > 0
            ? alreadyHasHoursLogged
              ? `You already logged ${scheduleTag || 'your weekly hours'}; next, replace general phrases like "a few recitals" with exact performance counts and repertoire/competition details.`
              : `Replace general phrases (like "a few recitals") with exact figures (e.g., number of recitals, repertoire level, and schedule).`
            : `Record your current clubs, music lessons, athletics, or volunteering to establish your ${grade}th grade baseline.`,
        impactCategory: 'Common App Polish',
      },
      {
        title:
          totalHonors === 0
            ? 'Add Your First Academic or Activity Honor'
            : 'Expand Leadership & Community Reach',
        action:
          totalHonors === 0
            ? `Log school honor roll, AP Scholar, music adjudication/festival ratings, or competition awards in the Honors section.`
            : `Look for ways to share your ${groundedDomain} skills with younger peers or your local community.`,
        impactCategory: 'Portfolio Depth',
      },
      {
        title: 'Capture a Specific Memory in Your Reflection Journal',
        action:
          'Write a short reflection about a challenge overcome or proud moment from your activity to seed your future 650-word Personal Statement.',
        impactCategory: 'Essay Strategy',
      },
    ],
    activityUpgrades,
  };
}

/**
 * Dynamic essay-aware critique & seed expansion guide.
 * Enforces a 150-word minimum before awarding a numerical 100-point rubric score (fixes BUG-02 & Suggestion 2).
 */
function buildDynamicEssayFallback(essayText: string, intendedMajors?: string) {
  const cleanText = essayText.trim();
  const sentences = cleanText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const firstSentence =
    sentences[0] || cleanText.slice(0, 120) || 'My experience taught me an important lesson.';
  const secondSentence =
    sentences[1] || firstSentence;

  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const rawMajor = String(intendedMajors || '').trim();
  const hasRealMajor =
    Boolean(rawMajor) &&
    rawMajor !== 'Environmental Science & Data Analytics' &&
    rawMajor !== 'STEM & Interdisciplinary Studies';

  // Below 150 words: refuse to assign a fake high score; return expansion prompts grounded in the student's note
  if (wordCount < 150) {
    return {
      overallScore: 0,
      tooShortToScore: true,
      wordCount,
      minWordsRequired: 150,
      admissionsOfficerTakeaway: `Your entry is currently ${wordCount} ${wordCount === 1 ? 'word' : 'words'}—a great reflection seed, but too brief for a 100-point Common App essay rubric score (minimum 150 words required). Expand this memory into a 3-part narrative using the prompts below to unlock full scoring.`,
      dimensionScores: {
        hookAndScene: 0,
        authenticVoice: 0,
        growthAndReflection: 0,
        structureAndImpact: 0,
      },
      whatWorksWell: [
        `Clear core memory captured in "${firstSentence.slice(0, 90)}${firstSentence.length > 90 ? '...' : ''}".`,
        'Authentic first-person starting point that focuses on a real personal moment rather than a resume summary.',
        `Plenty of room (${650 - wordCount} words remaining under the 650-word Common App limit) to build scene, tension, and reflection.`,
      ],
      areasToImprove: [
        `Prompt 1 — Set the Opening Scene (+60–80 words): Where did "${firstSentence.slice(0, 60)}${firstSentence.length > 60 ? '...' : ''}" take place? Describe what you saw, heard, or felt right before it happened.`,
        'Prompt 2 — Show the Obstacle or Practice (+60–80 words): What specific challenge, mistake, or weeks of effort behind the scenes made this moment hard to achieve?',
        `Prompt 3 — Reflect on Why It Matters (+50–70 words): How did this moment change your confidence, curiosity, or approach to future challenges? Add at least ${150 - wordCount} more words to unlock your rubric score.`,
      ],
      sentenceUpgrades: [
        {
          originalExcerpt: firstSentence,
          suggestedRewrite: `${firstSentence.replace(/[.]+$/, '')}—after weeks of practicing the hardest measures until my fingers knew every transition by heart.`,
          reason: 'Expands a brief note by pairing the outcome with the specific preparation that made it possible.',
        },
      ],
      polishedSampleParagraph: `${firstSentence.replace(/[.]+$/, '')}. Walking up to begin, I focused on the steady rhythm I had practiced for weeks. What started as a nerve-wracking challenge became the moment I realized how much quiet persistence pays off.`,
    };
  }

  const baseScore = wordCount >= 400 ? 88 : wordCount >= 250 ? 82 : 74;

  return {
    overallScore: baseScore,
    tooShortToScore: false,
    wordCount,
    minWordsRequired: 150,
    admissionsOfficerTakeaway: `This ${wordCount}-word draft shares a personal reflection centered on "${firstSentence.slice(0, 75)}${firstSentence.length > 75 ? '...' : ''}"${
      hasRealMajor ? ` and connects to your interest in ${rawMajor}` : ''
    }.`,
    dimensionScores: {
      hookAndScene: wordCount >= 300 ? 8 : 7,
      authenticVoice: 8,
      growthAndReflection: wordCount >= 250 ? 8 : 7,
      structureAndImpact: wordCount >= 350 ? 8 : 7,
    },
    whatWorksWell: [
      `Grounded opening built around "${firstSentence.slice(0, 80)}${firstSentence.length > 80 ? '...' : ''}".`,
      'Genuine student voice that keeps the focus on personal effort and growth.',
      `Solid ${wordCount}-word draft foundation with ${Math.max(0, 650 - wordCount)} words available under the 650-word Common App cap.`,
    ],
    areasToImprove: [
      'Open right in the middle of a specific moment or action in your first paragraph to hook the reader immediately.',
      'Deepen the middle section by showing a specific challenge or adjustment you made along the way.',
      wordCount < 400
        ? `At ${wordCount} words, you have room under the 650-word limit to expand your closing reflection on how this shapes your future goals.`
        : 'Tighten any repetitive phrases in the middle section so the pacing stays brisk through the conclusion.',
    ],
    sentenceUpgrades: [
      {
        originalExcerpt: firstSentence,
        suggestedRewrite: `${firstSentence.replace(/\.$/, '')}—a moment that reshaped how I approach complex challenges.`,
        reason: 'Sharpens the opening rhythm and signals personal stakes right away.',
      },
      ...(secondSentence !== firstSentence
        ? [
            {
              originalExcerpt: secondSentence,
              suggestedRewrite: `${secondSentence.replace(/\.$/, '')}, turning careful preparation into lasting confidence.`,
              reason: 'Connects your action directly to personal growth.',
            },
          ]
        : []),
    ],
    polishedSampleParagraph: `${firstSentence} ${secondSentence !== firstSentence ? secondSentence : ''} Carrying that lesson forward has shaped how I practice, collaborate, and take on new challenges.`.trim(),
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  // Cloud Run / AI Studio hosting sits behind Google's front end proxy.
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    if (host === 'www.pathtoadmit.com' || host.startsWith('www.pathtoadmit.com:')) {
      return res.redirect(301, `https://pathtoadmit.com${req.originalUrl || '/'}`);
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', attachVerifiedUser);

  // ============================================================================
  // Beta Family Access Control & Daily AI Spending Guardrails
  // ============================================================================
  const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || 'dsreddy123@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const ADMIN_EMAIL = ADMIN_EMAILS[0];
  const DEMO_ACCOUNT_EMAIL = 'demo@pathtoadmit.com';
  const TEST_FAMILY_EMAIL = 'nyourahealth@gmail.com';
  const DEMO_ACCOUNT_UID = 'demo_family_account';
  const serverStore = await createServerStore({
    adminApp,
    databaseId: FIRESTORE_DATABASE_ID || undefined,
    betaFilePath: dataFilePath('.beta-access.json'),
    familyFilePath: dataFilePath('.family-portfolios.json'),
  });

  function getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async function readBetaStore(): Promise<BetaConfig> {
    const defaults: BetaConfig = {
      inviteCode: process.env.BETA_INVITE_CODE || 'ADMIT2026',
      demoLoginEnabled: true,
      dailyUserLimit: 10,
      globalDailyLimit: 100,
      approvedEmails: [ADMIN_EMAIL, DEMO_ACCOUNT_EMAIL, TEST_FAMILY_EMAIL],
      approvedUids: [DEMO_ACCOUNT_UID],
    };
    const raw = await serverStore.readBetaConfig();
    if (!raw) return defaults;
    const demoEnabled =
      typeof raw.demoLoginEnabled === 'boolean'
        ? raw.demoLoginEnabled
        : defaults.demoLoginEnabled;
    return {
      inviteCode: String(raw.inviteCode || defaults.inviteCode)
        .trim()
        .toUpperCase(),
      demoLoginEnabled: demoEnabled,
      dailyUserLimit: Number(raw.dailyUserLimit) || defaults.dailyUserLimit,
      globalDailyLimit: Number(raw.globalDailyLimit) || defaults.globalDailyLimit,
      approvedEmails: Array.from(
        new Set([
          ADMIN_EMAIL,
          TEST_FAMILY_EMAIL,
          ...(demoEnabled ? [DEMO_ACCOUNT_EMAIL] : []),
          ...(Array.isArray(raw.approvedEmails)
            ? raw.approvedEmails.map((e: unknown) => String(e).trim().toLowerCase())
            : []),
        ])
      ),
      approvedUids: Array.from(
        new Set([
          ...(demoEnabled ? [DEMO_ACCOUNT_UID] : []),
          ...(Array.isArray(raw.approvedUids) ? raw.approvedUids.map(String) : []),
        ])
      ),
    };
  }

  async function writeBetaStore(data: BetaConfig) {
    try {
      await serverStore.writeBetaConfig(data);
    } catch (e) {
      console.warn('Could not write beta access settings:', e);
    }
  }

  // Identity comes only from a verified Firebase ID token. Demo and guest sessions
  // have no Firebase user, so they are treated as unauthenticated and receive the
  // deterministic sample responses instead of live Gemini calls.
  function getRequestIdentity(req: express.Request) {
    const verified = getVerifiedUser(req);
    const email = verified?.email || '';
    const uid = verified?.uid || '';
    const code = String(
      req.headers['x-beta-code'] || req.body?.betaInviteCode || ''
    )
      .trim()
      .toUpperCase();
    const isGuestOrDemo = !uid;
    return { email, uid, code, isGuestOrDemo };
  }

  interface QuotaResult {
    allowed: boolean;
    isAdmin: boolean;
    isApproved: boolean;
    demoLoginEnabled: boolean;
    reason?: 'unauthenticated' | 'beta_code_required' | 'user_limit' | 'global_limit';
    errorMessage?: string;
    aiRemainingToday: number;
    dailyUserLimit: number;
    globalRemainingToday: number;
    globalDailyLimit: number;
    usage: DayUsage;
    config: BetaConfig;
  }

  async function evaluateBetaAndQuota(
    req: express.Request,
    consumeCredit: boolean
  ): Promise<QuotaResult> {
    let store: BetaConfig;
    let usage: DayUsage;
    const today = getTodayKey();
    try {
      [store, usage] = await Promise.all([readBetaStore(), serverStore.readUsage(today)]);
    } catch (e) {
      // Never grant AI calls when the quota store cannot be read.
      console.warn('Quota store unavailable:', e);
      const fallbackConfig = { dailyUserLimit: 10, globalDailyLimit: 100 } as BetaConfig;
      return {
        allowed: false,
        isAdmin: false,
        isApproved: false,
        demoLoginEnabled: true,
        reason: 'global_limit',
        errorMessage: 'Live AI is temporarily unavailable. Please try again in a few minutes.',
        aiRemainingToday: 0,
        dailyUserLimit: fallbackConfig.dailyUserLimit,
        globalRemainingToday: 0,
        globalDailyLimit: fallbackConfig.globalDailyLimit,
        usage: { globalCount: 0, users: {} },
        config: fallbackConfig,
      };
    }
    const { email, uid, code, isGuestOrDemo } = getRequestIdentity(req);
    const isAdmin = Boolean(email) && ADMIN_EMAILS.includes(email);

    // Auto-approve if they pass the current invite code
    const codeMatches = Boolean(code) && code === store.inviteCode;

    let isApproved =
      isAdmin ||
      (Boolean(email) && store.approvedEmails.includes(email)) ||
      (Boolean(uid) && !isGuestOrDemo && store.approvedUids.includes(uid)) ||
      Boolean(codeMatches);

    if (codeMatches && !isGuestOrDemo) {
      let dirty = false;
      if (email && !store.approvedEmails.includes(email)) {
        store.approvedEmails.push(email);
        dirty = true;
      }
      if (uid && !store.approvedUids.includes(uid)) {
        store.approvedUids.push(uid);
        dirty = true;
      }
      if (dirty) await writeBetaStore(store);
      isApproved = true;
    }

    const userKey = uid || String(req.ip || 'anon');
    const effectiveUserLimit = isAdmin
      ? Math.max(50, store.dailyUserLimit * 5)
      : store.dailyUserLimit;
    const base = {
      isAdmin,
      demoLoginEnabled: store.demoLoginEnabled,
      dailyUserLimit: effectiveUserLimit,
      globalDailyLimit: store.globalDailyLimit,
      config: store,
    };
    const remaining = (u: DayUsage) => ({
      aiRemainingToday: Math.max(0, effectiveUserLimit - (u.users[userKey] || 0)),
      globalRemainingToday: Math.max(0, store.globalDailyLimit - u.globalCount),
      usage: u,
    });

    if (isGuestOrDemo) {
      return {
        ...base,
        ...remaining(usage),
        allowed: false,
        isAdmin: false,
        isApproved: false,
        reason: 'unauthenticated',
        errorMessage: 'Sign in with Google to run live AI coaching.',
        aiRemainingToday: 0,
        dailyUserLimit: store.dailyUserLimit,
      };
    }

    if (!isApproved) {
      return {
        ...base,
        ...remaining(usage),
        allowed: false,
        isAdmin: false,
        isApproved: false,
        reason: 'beta_code_required',
        errorMessage:
          'Family Beta Invite Code required. Enter the invite code shared with your family in the top bar to unlock AI features.',
      };
    }

    const globalLimitReached = (u: DayUsage) =>
      u.globalCount >= store.globalDailyLimit && !isAdmin;
    const userLimitReached = (u: DayUsage) => (u.users[userKey] || 0) >= effectiveUserLimit;
    const limitResult = (u: DayUsage): QuotaResult =>
      globalLimitReached(u)
        ? {
            ...base,
            ...remaining(u),
            allowed: false,
            isApproved: true,
            reason: 'global_limit',
            errorMessage:
              'PathToAdmit has reached its daily community AI budget cap for today. Please try again tomorrow!',
          }
        : {
            ...base,
            ...remaining(u),
            allowed: false,
            isApproved: true,
            reason: 'user_limit',
            errorMessage: `Daily AI Coach limit reached (${effectiveUserLimit}/${effectiveUserLimit} used today). Your family's AI credits reset tomorrow!`,
            aiRemainingToday: 0,
          };

    if (globalLimitReached(usage) || userLimitReached(usage)) {
      return limitResult(usage);
    }

    if (consumeCredit) {
      try {
        const { ok, usage: updated } = await serverStore.consumeIfAllowed(
          today,
          userKey,
          effectiveUserLimit,
          isAdmin ? Number.MAX_SAFE_INTEGER : store.globalDailyLimit
        );
        if (!ok) return limitResult(updated);
        usage = updated;
      } catch (e) {
        console.warn('Could not record AI usage:', e);
        return {
          ...base,
          ...remaining(usage),
          allowed: false,
          isApproved: true,
          reason: 'global_limit',
          errorMessage: 'Live AI is temporarily unavailable. Please try again in a few minutes.',
        };
      }
    }

    return { ...base, ...remaining(usage), allowed: true, isApproved: true };
  }

  // Internal bookkeeping fields never go to the browser.
  function publicQuota(q: QuotaResult) {
    const { usage: _usage, config: _config, ...rest } = q;
    return rest;
  }

  // Check Beta Status & Remaining Daily AI Credits
  app.post('/api/beta/status', async (req, res) => {
    const status = await evaluateBetaAndQuota(req, false);
    res.json({
      ...publicQuota(status),
      ...(status.isAdmin
        ? {
            activeInviteCode: status.config.inviteCode,
            approvedEmails: status.config.approvedEmails,
            todayGlobalUsed: status.usage.globalCount,
            todayActiveUsersCount: Object.keys(status.usage.users).length,
            serverStore: serverStore.kind,
          }
        : {}),
    });
  });

  // Redeem Family Beta Invite Code
  app.post('/api/beta/redeem', async (req, res) => {
    const { inviteCode } = req.body || {};
    const cleanCode = String(inviteCode || '')
      .trim()
      .toUpperCase();
    const verified = getVerifiedUser(req);
    if (!verified) {
      res.status(401).json({
        ok: false,
        error: 'Sign in with Google before redeeming a Family Beta Invite Code.',
      });
      return;
    }
    const cleanEmail = verified.email;
    const cleanUid = verified.uid;
    const store = await readBetaStore();

    if (!cleanCode || cleanCode !== store.inviteCode) {
      res.status(403).json({
        ok: false,
        error:
          'Invalid Family Beta Invite Code. Please check the code shared with your family.',
      });
      return;
    }

    if (cleanEmail && !store.approvedEmails.includes(cleanEmail)) {
      store.approvedEmails.push(cleanEmail);
    }
    if (cleanUid && !store.approvedUids.includes(cleanUid)) {
      store.approvedUids.push(cleanUid);
    }
    await writeBetaStore(store);

    const status = await evaluateBetaAndQuota(req, false);
    res.json({
      ok: true,
      ...publicQuota(status),
      isApproved: true,
    });
  });

  // Admin Endpoint (ADMIN_EMAILS only) to manage Invite Code, Demo Login Toggle, Approved Emails & Daily Caps
  app.post('/api/beta/admin-update', async (req, res) => {
    const {
      newInviteCode,
      demoLoginEnabled,
      addEmail,
      removeEmail,
      dailyUserLimit,
      globalDailyLimit,
    } = req.body || {};
    const callerEmail = getVerifiedUser(req)?.email || '';

    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }

    const store = await readBetaStore();
    if (newInviteCode && String(newInviteCode).trim().length >= 4) {
      store.inviteCode = String(newInviteCode).trim().toUpperCase();
    }
    if (typeof demoLoginEnabled === 'boolean') {
      store.demoLoginEnabled = demoLoginEnabled;
      if (!demoLoginEnabled) {
        store.approvedEmails = store.approvedEmails.filter(
          (e) => e !== DEMO_ACCOUNT_EMAIL
        );
        store.approvedUids = store.approvedUids.filter(
          (u) => u !== DEMO_ACCOUNT_UID
        );
      } else {
        if (!store.approvedEmails.includes(DEMO_ACCOUNT_EMAIL)) {
          store.approvedEmails.push(DEMO_ACCOUNT_EMAIL);
        }
        if (!store.approvedUids.includes(DEMO_ACCOUNT_UID)) {
          store.approvedUids.push(DEMO_ACCOUNT_UID);
        }
      }
    }
    if (addEmail && String(addEmail).includes('@')) {
      const target = String(addEmail).trim().toLowerCase();
      if (!store.approvedEmails.includes(target)) {
        store.approvedEmails.push(target);
      }
    }
    if (removeEmail && !ADMIN_EMAILS.includes(String(removeEmail).trim().toLowerCase())) {
      const target = String(removeEmail).trim().toLowerCase();
      store.approvedEmails = store.approvedEmails.filter((e) => e !== target);
    }
    if (typeof dailyUserLimit === 'number' && dailyUserLimit >= 1 && dailyUserLimit <= 200) {
      store.dailyUserLimit = Math.round(dailyUserLimit);
    }
    if (
      typeof globalDailyLimit === 'number' &&
      globalDailyLimit >= 5 &&
      globalDailyLimit <= 5000
    ) {
      store.globalDailyLimit = Math.round(globalDailyLimit);
    }
    await writeBetaStore(store);

    const usage = await serverStore.readUsage(getTodayKey()).catch(() => ({ globalCount: 0, users: {} }));
    res.json({
      ok: true,
      demoLoginEnabled: store.demoLoginEnabled,
      activeInviteCode: store.inviteCode,
      approvedEmails: store.approvedEmails,
      dailyUserLimit: store.dailyUserLimit,
      globalDailyLimit: store.globalDailyLimit,
      todayGlobalUsed: usage.globalCount,
    });
  });

  // 1. AI Admissions Coach Holistic Evaluation & Strategy Endpoint
  app.post('/api/ai/admissions-coach', async (req, res) => {
    const { profile, familyProfile, activities, honors, journals, customQuestion } =
      req.body || {};

    const quota = await evaluateBetaAndQuota(req, true);
    if (!quota.allowed) {
      if (quota.reason === 'unauthenticated') {
        const fallback = buildDynamicCoachFallback(
          profile,
          familyProfile,
          activities,
          honors,
          customQuestion
        );
        res.json({
          ...fallback,
          isSampleFallback: true,
          fallbackReason: 'sign_in_required',
          aiRemainingToday: 0,
        });
        return;
      }
      res.status(429).json({
        error: quota.errorMessage,
        reason: quota.reason,
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
      return;
    }

    try {
      const ai = getGenAIClient();

      const safeStudentProfile = {
        currentGrade: profile?.currentGrade,
        gradYear: profile?.gradYear,
        dreamColleges: profile?.dreamColleges,
      };
      const safeFamilyAcademicProfile = {
        curriculumType: familyProfile?.curriculumType,
        unweightedGpa: familyProfile?.unweightedGpa,
        weightedGpa: familyProfile?.weightedGpa,
        intendedMajors: familyProfile?.intendedMajors,
        apIbCoursesCount: familyProfile?.apIbCoursesCount,
      };

      const portfolioContext = JSON.stringify(
        {
          studentProfile: safeStudentProfile,
          familyAndAcademicProfile: safeFamilyAcademicProfile,
          activities: (activities || []).map((a: Record<string, unknown>) => ({
            id: a.id,
            activityType: a.activityType,
            position: redactPIIForAI(String(a.position || '')),
            organization: redactPIIForAI(String(a.organization || '')),
            description: redactPIIForAI(String(a.description || '')),
            grades: a.grades,
            hoursPerWeek: a.hoursPerWeek,
            weeksPerYear: a.weeksPerYear,
            commonAppSlot: a.commonAppSlot,
            impactScore: a.impactScore,
          })),
          honors: (honors || []).map((h: Record<string, unknown>) => ({
            title: redactPIIForAI(String(h.title || '')),
            gradeLevel: h.gradeLevel,
            recognitionLevel: h.recognitionLevel,
            notes: redactPIIForAI(String(h.notes || '')),
          })),
          recentReflections: (journals || [])
            .slice(0, 6)
            .map((j: Record<string, unknown>) => ({
              title: redactPIIForAI(String(j.title || '')),
              content: redactPIIForAI(String(j.content || '')),
              gradeLevel: j.gradeLevel,
              isEssaySeed: j.isEssaySeed,
            })),
        },
        null,
        2
      );

      const safeCustomQuestion = customQuestion
        ? redactPIIForAI(String(customQuestion))
        : '';

      const prompt = safeCustomQuestion
        ? `Analyze this student's holistic 6th-12th grade portfolio, academic/family profile, and Common App activities:\n${portfolioContext}\n\nAdditionally, directly answer the student/parent's specific admissions question in 'coachAnswer': "${safeCustomQuestion}"`
        : `Analyze this student's holistic 6th-12th grade portfolio, academic/family profile, and Common App activities:\n${portfolioContext}\n\nProvide a comprehensive college admissions evaluation, identify their core spike archetype, strengths, gaps, grade-level action plan, and rewrite up to 4 of their existing activities into punchier Common App descriptions strictly <= 150 characters.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          readinessScore: {
            type: Type.INTEGER,
            description:
              'Holistic college readiness score from 50 to 99 based on current grade level and portfolio depth.',
          },
          spikeArchetype: {
            type: Type.STRING,
            description: 'Short 4-7 word admissions persona/spike title for this student.',
          },
          executiveSummary: {
            type: Type.STRING,
            description:
              '2-3 sentence encouraging yet candid admissions officer summary of how this applicant reads in committee.',
          },
          coachAnswer: {
            type: Type.STRING,
            description:
              'Direct, detailed strategic answer to the custom question if one was asked, or top strategic takeaway if none was asked.',
          },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              '3 to 4 standout strengths in their activities, academics, honors, or family context.',
          },
          blindSpots: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              '2 to 3 honest gaps or areas to strengthen before submitting college applications.',
          },
          nextStepsByGrade: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                action: { type: Type.STRING },
                impactCategory: { type: Type.STRING },
              },
              required: ['title', 'action', 'impactCategory'],
            },
            description:
              '3 concrete action items tailored to the student current grade level and intended major.',
          },
          activityUpgrades: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                activityId: { type: Type.STRING },
                organization: { type: Type.STRING },
                currentDescription: { type: Type.STRING },
                upgradedDescription: {
                  type: Type.STRING,
                  description:
                    'Upgraded Common App description strictly <= 150 characters.',
                },
                whyItWorks: { type: Type.STRING },
              },
              required: [
                'activityId',
                'organization',
                'currentDescription',
                'upgradedDescription',
                'whyItWorks',
              ],
            },
          },
        },
        required: [
          'readinessScore',
          'spikeArchetype',
          'executiveSummary',
          'coachAnswer',
          'strengths',
          'blindSpots',
          'nextStepsByGrade',
          'activityUpgrades',
        ],
      };

      // If 0 activities are logged, serve our deterministic portfolio-grounded analysis directly so we never reference a non-existent primary Common App activity or misstate honor counts (fixes BUG-02 & BUG-04)
      if (!Array.isArray(activities) || activities.length === 0) {
        const zeroActReport = buildDynamicCoachFallback(
          profile,
          familyProfile,
          Array.isArray(activities) ? activities : [],
          Array.isArray(honors) ? honors : [],
          customQuestion
        );
        res.json({
          ...zeroActReport,
          isSampleFallback: true,
          fallbackReason: 'not_enough_content',
          aiRemainingToday: quota.aiRemainingToday,
          dailyUserLimit: quota.dailyUserLimit,
        });
        return;
      }

      const parsed = await generateJsonWithFallback(
        ai,
        prompt,
        'You are a former Senior Admissions Officer at a top-tier university and an encouraging high school college counselor. Evaluate the student STRICTLY based on the actual activities and honors present in their portfolio: 1) Ground spikeArchetype in their #1 primary Common App activity and intended major (do not label a Robotics #1 student as Music just because they have a secondary music activity in slot #4). 2) Do NOT claim "multi-year continuity" or "hands-on mentorship" unless their logged activities actually show multiple grade levels or mentoring/teaching. 3) Compare stored hoursPerWeek/weeksPerYear and description before suggesting what to add: NEVER ask the student to quantify their hours if hoursPerWeek > 0 or hrs/wk is already entered. 4) Calibrate readinessScore honestly and use non-manipulative, realistic counseling. 5) Use proper singular/plural grammar ("1 activity", "1 academic honor") and accurately state the exact number of honors logged. 6) CRITICAL RULES FOR activityUpgrades: Rephrase only the student\'s stated facts into strong active Common App prose <= 145 characters, preserve 100% of stated facts (including weekly lessons, hours, and awards), eliminate repeated verbs/clauses, NEVER invent unstated mentorship or awards, and NEVER repeat the Organization or Position title.',
        schema
      );

      const groundedFallback = buildDynamicCoachFallback(
        profile,
        familyProfile,
        Array.isArray(activities) ? activities : [],
        Array.isArray(honors) ? honors : [],
        customQuestion
      );

      // Guard against LLM miscounting honors, mislabeling primary archetype, or asking to quantify hours already entered (UX-02 & Suggestion 2)
      const honorLen = Array.isArray(honors) ? honors.length : 0;
      const primaryActObj =
        (Array.isArray(activities)
          ? activities.find((a: Record<string, unknown>) => Number(a.commonAppSlot) === 1) ||
            activities[0]
          : undefined) || {};
      const primaryHasHours =
        Number(primaryActObj.hoursPerWeek) > 0 ||
        /\b\d+\s*(?:hrs?|hours?|h)\s*\/\s*(?:wk|week)\b/i.test(
          String(primaryActObj.description || '')
        );

      if (
        (honorLen > 0 &&
          /0\s+academic\s+honors?/i.test(String(parsed.executiveSummary || ''))) ||
        (primaryHasHours &&
          /\b(?:quantif(?:y|ying)\s+(?:your\s+)?(?:exact\s+)?hours|add\s+(?:your\s+)?(?:weekly\s+)?hours)\b/i.test(
            String(parsed.executiveSummary || '')
          ))
      ) {
        parsed.executiveSummary = groundedFallback.executiveSummary;
      }
      if (
        primaryHasHours &&
        /\b(?:quantif(?:y|ying)\s+(?:your\s+)?(?:exact\s+)?hours|add\s+(?:your\s+)?(?:weekly\s+)?hours)\b/i.test(
          String(parsed.coachAnswer || '')
        )
      ) {
        parsed.coachAnswer = groundedFallback.coachAnswer;
      }
      if (
        groundedFallback.spikeArchetype.includes('Robotics') &&
        /music|performing\s+arts|environmental/i.test(String(parsed.spikeArchetype || ''))
      ) {
        parsed.spikeArchetype = groundedFallback.spikeArchetype;
      }
      if (typeof parsed.spikeArchetype === 'string') {
        parsed.spikeArchetype = parsed.spikeArchetype.replace(/\s*&\s*(?=.*&)/g, ', ');
      }

      // Always ground activityUpgrades in buildCoachActivityUpgrade so every original award, lesson fact, number, and grade range is faithfully preserved without redundant schedule strings (fixes Run 4 BUG-01)
      parsed.activityUpgrades = (
        Array.isArray(activities) ? activities.slice(0, 4) : []
      ).map((act: Record<string, unknown>) => buildCoachActivityUpgrade(act));

      res.json({
        ...parsed,
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
    } catch (error) {
      console.warn(
        'Upstream Gemini models busy (503/429), serving portfolio-grounded analysis:',
        error
      );
      const fallback = buildDynamicCoachFallback(
        profile,
        familyProfile,
        activities,
        honors,
        customQuestion
      );
      res.json({
        ...fallback,
        isSampleFallback: true,
        fallbackReason: 'ai_unavailable',
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
    }
  });

  // 2. AI Essay Critique & Personal Statement Studio Endpoint
  app.post('/api/ai/essay-critique', async (req, res) => {
    const {
      promptTitle,
      essayText,
      studentGrade,
      intendedMajors,
      dreamColleges,
      activitiesSummary,
    } = req.body || {};

    if (!essayText || typeof essayText !== 'string' || essayText.trim().length < 10) {
      res.status(400).json({
        error:
          'Please enter at least a sentence or reflection seed first.',
      });
      return;
    }

    const wordCount = essayText.trim().split(/\s+/).filter(Boolean).length;

    // Enforce minimum 150-word threshold before giving a numerical rubric score (BUG-02 & Suggestion 2)
    if (wordCount < 150) {
      const statusOnly = await evaluateBetaAndQuota(req, false);
      const shortGuide = buildDynamicEssayFallback(essayText, intendedMajors);
      res.json({
        ...shortGuide,
        isSampleFallback: true,
        fallbackReason: 'not_enough_content',
        aiRemainingToday: statusOnly.aiRemainingToday,
        dailyUserLimit: statusOnly.dailyUserLimit,
      });
      return;
    }

    const quota = await evaluateBetaAndQuota(req, true);
    if (!quota.allowed) {
      if (quota.reason === 'unauthenticated') {
        const fallback = buildDynamicEssayFallback(essayText, intendedMajors);
        res.json({
          ...fallback,
          isSampleFallback: true,
          fallbackReason: 'sign_in_required',
          aiRemainingToday: 0,
        });
        return;
      }
      res.status(429).json({
        error: quota.errorMessage,
        reason: quota.reason,
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
      return;
    }

    try {
      const ai = getGenAIClient();

      const rawMajor = String(intendedMajors || '').trim();
      const effectiveMajor =
        rawMajor &&
        rawMajor !== 'Environmental Science & Data Analytics' &&
        rawMajor !== 'STEM & Interdisciplinary Studies'
          ? rawMajor
          : 'Undecided';

      const safeEssayText = redactPIIForAI(essayText);
      const safeActivitiesSummary = redactPIIForAI(String(activitiesSummary || 'N/A'));

      const userPrompt = `Critique this ${wordCount}-word college essay / personal reflection draft for a ${
        studentGrade || 11
      }th grade student.
Essay Prompt: ${promptTitle || 'Common App Personal Statement'}
Student Intended Majors: ${effectiveMajor}
Target Colleges: ${dreamColleges || 'Selective Universities'}
Student Key Activities Context: ${safeActivitiesSummary}

CRITICAL RULES:
- Evaluate ONLY what is actually written in the Essay Draft below.
- Do NOT praise "concrete sensory details", "clear turning point", or any specific major (such as Environmental Science) unless those exact elements appear in the Essay Draft text.
- Preserve all factual events stated by the student when suggesting sentence upgrades; never fabricate accomplishments or experiences.
- Calibrate overallScore honestly based on length (${wordCount} words out of 650) and narrative depth.

Essay Draft:
"""
${safeEssayText}
"""`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          overallScore: {
            type: Type.INTEGER,
            description: 'Overall essay effectiveness score from 50 to 99.',
          },
          admissionsOfficerTakeaway: {
            type: Type.STRING,
            description:
              '1-2 sentence summary of what an admissions officer learns about the student from this draft.',
          },
          dimensionScores: {
            type: Type.OBJECT,
            properties: {
              hookAndScene: {
                type: Type.INTEGER,
                description: 'Score 1-10 for opening hook and vivid imagery.',
              },
              authenticVoice: {
                type: Type.INTEGER,
                description: 'Score 1-10 for genuine student voice and vulnerability.',
              },
              growthAndReflection: {
                type: Type.INTEGER,
                description: 'Score 1-10 for self-reflection and personal growth.',
              },
              structureAndImpact: {
                type: Type.INTEGER,
                description: 'Score 1-10 for narrative arc, pacing, and conclusion.',
              },
            },
            required: [
              'hookAndScene',
              'authenticVoice',
              'growthAndReflection',
              'structureAndImpact',
            ],
          },
          whatWorksWell: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 specific strengths in the current draft.',
          },
          areasToImprove: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 specific strategic improvements to elevate the essay.',
          },
          sentenceUpgrades: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalExcerpt: { type: Type.STRING },
                suggestedRewrite: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['originalExcerpt', 'suggestedRewrite', 'reason'],
            },
            description:
              '2 to 3 specific sentences or phrases from the draft upgraded to "show, don\'t tell".',
          },
          polishedSampleParagraph: {
            type: Type.STRING,
            description:
              'A sample polished version of their opening hook or key paragraph that keeps their voice while elevating vividness and emotional resonance.',
          },
        },
        required: [
          'overallScore',
          'admissionsOfficerTakeaway',
          'dimensionScores',
          'whatWorksWell',
          'areasToImprove',
          'sentenceUpgrades',
          'polishedSampleParagraph',
        ],
      };

      const parsed = await generateJsonWithFallback(
        ai,
        userPrompt,
        'You are an expert College Essay Coach and former Ivy League Admissions Reader. Provide constructive, specific, line-by-line feedback strictly grounded in the text the student actually wrote. Never praise details or majors not present in the draft.',
        schema
      );

      res.json({
        ...parsed,
        tooShortToScore: false,
        wordCount,
        minWordsRequired: 150,
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
    } catch (error) {
      console.warn(
        'Upstream Gemini models busy (503/429), serving draft-grounded essay critique:',
        error
      );
      const fallback = buildDynamicEssayFallback(essayText, intendedMajors);
      res.json({
        ...fallback,
        isSampleFallback: true,
        fallbackReason: 'ai_unavailable',
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
    }
  });

  // 3. AI 150-Character Common App Activity Polisher (for Step 2 of Activity Modal)
  app.post('/api/ai/polish-activity', async (req, res) => {
    const {
      activityType,
      position,
      organization,
      draftDescription,
      hoursPerWeek,
      weeksPerYear,
    } = req.body || {};
    const cacheKey = getPolishCacheKey(
      activityType,
      position,
      organization,
      `${draftDescription || ''}|${hoursPerWeek || ''}|${weeksPerYear || ''}`
    );

    const cached = polishCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
      const statusOnly = await evaluateBetaAndQuota(req, false);
      res.json({
        suggestions: cached.suggestions,
        cached: true,
        aiRemainingToday: statusOnly.aiRemainingToday,
        dailyUserLimit: statusOnly.dailyUserLimit,
      });
      return;
    }

    const quota = await evaluateBetaAndQuota(req, true);
    if (!quota.allowed) {
      if (quota.reason === 'unauthenticated') {
        const pos = String(position || 'Team Member').trim();
        const org = String(organization || 'School Organization').trim();
        const baseDraft = String(draftDescription || '').trim();
        const { suggestions } = buildPreservingActivityPolishes(
          baseDraft,
          pos,
          org,
          String(activityType || 'Extracurricular'),
          Number(hoursPerWeek) || undefined,
          Number(weeksPerYear) || undefined
        );
        res.json({
          isSampleFallback: true,
          aiRemainingToday: 0,
          suggestions,
        });
        return;
      }
      res.status(429).json({
        error: quota.errorMessage,
        reason: quota.reason,
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
      return;
    }

    try {
      const pos = String(position || 'Member').trim();
      const org = String(organization || 'School Club').trim();
      const baseDraft = String(draftDescription || '').trim();
      const { suggestions: deterministicSuggestions } =
        buildPreservingActivityPolishes(
          baseDraft,
          pos,
          org,
          String(activityType || 'Extracurricular'),
          Number(hoursPerWeek) || undefined,
          Number(weeksPerYear) || undefined
        );

      // If the student provided a draft, our deterministic fact-preserving polishes guarantee:
      // Option 1: Active Rephrase of Stated Facts Only (no invented words like "seasonal" or "mentored")
      // Option 2: Fill-In Metrics with [#] (or stored hrs/wk if already entered)
      // Option 3: Outcome-First Reordered Common App Structure
      if (baseDraft.length > 0) {
        polishCache.set(cacheKey, {
          suggestions: deterministicSuggestions,
          timestamp: Date.now(),
        });
        res.json({
          suggestions: deterministicSuggestions,
          aiRemainingToday: quota.aiRemainingToday,
          dailyUserLimit: quota.dailyUserLimit,
        });
        return;
      }

      const ai = getGenAIClient();

      const prompt = `Rewrite this student's activity draft into 3 distinct Common App activity descriptions (each strictly <= 145 characters, complete sentences, never cut off mid-word).
Category: ${activityType || 'Extracurricular'}
Role (already shown in Common App Position box — DO NOT repeat): ${redactPIIForAI(String(position || 'Member'))}
Organization (already shown in Common App Organization box — DO NOT repeat): ${redactPIIForAI(String(organization || 'School Club'))}
Student's Original Draft: "${redactPIIForAI(String(draftDescription || ''))}"

CRITICAL RULES:
1. ZERO INVENTION: Rephrase ONLY the facts stated in the Student's Original Draft. NEVER invent mentoring ("mentored younger musicians"), leadership, or awards that the student did not state.
2. MISSING NUMBERS -> FILL-IN BRACKETS: When a quantity is missing or vague (e.g., "a few recitals", "every week", "several games"), use "[#]" fill-in brackets (e.g., "[#] recitals", "[#] hrs/wk") in at least one option and ask the question in its styleLabel (e.g., "Fill-In Metrics (How many recitals?)").
3. NO DUPLICATES OR REPEATED VERBS: Eliminate repeated verbs/clauses (such as repeating "performed" twice) and make all 3 options genuinely distinct in structure (Option 1: Active Rephrase of Stated Facts; Option 2: Fill-In Metrics with [#]; Option 3: Outcome-First Reordered Structure).`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                styleLabel: {
                  type: Type.STRING,
                  description:
                    'e.g., "Active Rephrase (Stated Facts Only)", "Fill-In Metrics (How many recitals?)", or "Outcome-First Structure"',
                },
                text: {
                  type: Type.STRING,
                  description: 'Complete sentence strictly under 145 characters.',
                },
              },
              required: ['styleLabel', 'text'],
            },
          },
        },
        required: ['suggestions'],
      };

      const parsed = await generateJsonWithFallback(
        ai,
        prompt,
        'Common App Activity Description specialist. Output 3 distinct options strictly <=145 characters. Rephrase ONLY the student\'s stated facts, never invent mentorship or awards, replace vague counts ("a few") with "[#]" fill-in brackets, eliminate repeated verbs, and never cut off mid-word.',
        schema,
        { fastMode: true, timeoutMs: 3200, temperature: 0.35 }
      );

      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        const fallback = buildPreservingActivityPolishes(
          String(draftDescription || ''),
          String(position || ''),
          String(organization || ''),
          String(activityType || 'Extracurricular')
        );
        const seenTexts = new Set<string>();
        const cleanedList: { styleLabel: string; text: string }[] = [];

        for (let i = 0; i < parsed.suggestions.length; i++) {
          const s = parsed.suggestions[i] as { styleLabel?: string; text?: string };
          const txt = trimToWordBoundary(String(s.text || ''), 148);
          const norm = txt.toLowerCase();
          // Reject hallucinated "mentored" if the user draft didn't mention mentoring/teaching/tutoring/coaching
          const draftHasMentor = /\b(mentor|tutor|teach|taught|coach)\b/i.test(
            String(draftDescription || '')
          );
          const inventedMentor = !draftHasMentor && /\bmentor/i.test(txt);

          if (txt && !seenTexts.has(norm) && !inventedMentor) {
            seenTexts.add(norm);
            cleanedList.push({
              styleLabel: String(s.styleLabel || `Option ${i + 1}`),
              text: txt,
            });
          }
        }

        // Fill any missing/deduplicated slots from our deterministic fact-preserving builder
        for (const fb of fallback.suggestions) {
          if (cleanedList.length >= 3) break;
          if (!seenTexts.has(fb.text.toLowerCase())) {
            seenTexts.add(fb.text.toLowerCase());
            cleanedList.push(fb);
          }
        }

        parsed.suggestions = cleanedList.slice(0, 3);

        if (polishCache.size >= POLISH_CACHE_MAX) {
          const oldestKey = polishCache.keys().next().value;
          if (oldestKey) polishCache.delete(oldestKey);
        }
        polishCache.set(cacheKey, {
          suggestions: parsed.suggestions as { styleLabel: string; text: string }[],
          timestamp: Date.now(),
        });
      }

      res.json({
        ...parsed,
        aiRemainingToday: quota.aiRemainingToday,
        dailyUserLimit: quota.dailyUserLimit,
      });
    } catch (error) {
      console.warn(
        'Upstream Gemini models busy (503/429), serving content-preserving 150-char options:',
        error
      );
      const pos = String(position || 'Team Member').trim();
      const org = String(organization || 'School Organization').trim();
      const baseDraft = String(draftDescription || '').trim();
      const { suggestions } = buildPreservingActivityPolishes(
        baseDraft,
        pos,
        org,
        String(activityType || 'Extracurricular')
      );

      res.json({
        suggestions,
      });
    }
  });

  // 4. Recent Completed School & District Competitions (Past 30 Days Only — Live Google Search Grounded + ZIP Code Aware)
  app.post('/api/events/recent-competitions', async (req, res) => {
    const body = req.body || {};
    const schoolName = String(body.schoolName || '').slice(0, 120);
    const districtOrCity = String(body.districtOrCity || '').slice(0, 120);
    const searchQuery = String(body.searchQuery || '').slice(0, 200);
    const gradeLevel = Number(body.gradeLevel) || 10;
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const todayIso = today.toISOString().slice(0, 10);
    const minIso = thirtyDaysAgo.toISOString().slice(0, 10);
    const cleanZip = String(body.zipCode || '').trim().slice(0, 10);

    try {
      // Search-grounded calls are billed per request: require a signed-in, approved
      // user with remaining daily credits. Everyone else gets the local fallback below.
      const quota = await evaluateBetaAndQuota(req, true);
      if (!quota.allowed) {
        throw new Error(`Live competition search unavailable: ${quota.reason}`);
      }
      const ai = getGenAIClient();
      const baseRegion = String(districtOrCity || schoolName || 'Regional School District').trim();
      const regionQuery = cleanZip
        ? `${baseRegion} near ZIP code ${cleanZip}`
        : baseRegion;
      const topicQuery = String(
        searchQuery || 'Scholastic Chess, Math League, AMC, VEX Robotics, FIRST Tech Challenge, Science Olympiad, Speech & Debate'
      ).trim();

      const prompt = `Search the web for real, recently completed middle school, high school, regional, or school-district competitions, tournaments, invitationals, and league meets in or near "${regionQuery}" (${cleanZip ? `ZIP Code: ${cleanZip}, ` : ''}School: "${schoolName || 'Local High School'}", Grade: ${gradeLevel || 10}) for topics: ${topicQuery}.
Focus on completed competitions from the past 30 days (between ${minIso} and ${todayIso}).

Return a valid JSON object (no markdown fences) with an "events" array of 6 completed competitions. Each item in "events" MUST have:
- "title": string (specific tournament/meet name found or held in/near ${cleanZip ? `ZIP ${cleanZip} / ` : ''}${baseRegion})
- "category": one of "Chess", "District Math", "Robotics", "Science & STEM", "Debate & Speech", "Coding & CS", "Athletics & Arts"
- "activityType": one of "Academic", "Science/Math", "Robotics", "Computer/Technology", "Debate/Speech", "Athletics: JV/Varsity", "Music: Instrumental", "Community Service (Volunteer)"
- "organizer": string (real organizing body, e.g., US Chess / UIL / VEX / Science Olympiad / NSDA / District League)
- "daysAgo": integer between 1 and 29
- "locationScope": string (e.g., "${cleanZip ? `ZIP ${cleanZip} · ` : ''}${baseRegion} · Completed")
- "sourceUrl": string (URL of the tournament page, results page, or governing organization if found, or empty string)
- "sourceTitle": string (Title of the source website or league page)
- "defaultRoles": array of 3-4 student roles (e.g., ["Varsity Competitor", "Team Captain", "Division Representative"])
- "whatIDidPrompts": array of 4 specific accomplishments a student participant can check off
- "defaultHoursPerWeek": number (3 to 8)
- "defaultWeeksPerYear": integer (20 to 36)`;

      let parsedEvents: Record<string, unknown>[] = [];
      let groundingSources: { title: string; uri: string }[] = [];

      // Attempt 1: Live Google Search Grounding (tools: [{ googleSearch: {} }])
      for (const modelName of MODEL_FALLBACK_CHAIN) {
        try {
          const groundedRes = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const chunks =
            groundedRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          for (const chunk of chunks) {
            const web = (chunk as { web?: { uri?: string; title?: string } }).web;
            if (web?.uri) {
              groundingSources.push({
                uri: String(web.uri),
                title: String(web.title || web.uri),
              });
            }
          }

          const rawText = cleanJsonText(groundedRes.text || '');
          const jsonStart = rawText.indexOf('{');
          const jsonEnd = rawText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const candidateObj = JSON.parse(
              rawText.slice(jsonStart, jsonEnd + 1)
            ) as { events?: Record<string, unknown>[] };
            if (Array.isArray(candidateObj.events) && candidateObj.events.length > 0) {
              parsedEvents = candidateObj.events;
              break;
            }
          }
        } catch (groundErr) {
          console.warn(`Search-grounded call on ${modelName} failed, trying next:`, groundErr);
        }
      }

      // Attempt 2: Structured JSON Schema fallback if search-grounded text wasn't JSON
      if (parsedEvents.length === 0) {
        const schema = {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  activityType: { type: Type.STRING },
                  organizer: { type: Type.STRING },
                  daysAgo: { type: Type.INTEGER },
                  locationScope: { type: Type.STRING },
                  sourceUrl: { type: Type.STRING },
                  sourceTitle: { type: Type.STRING },
                  defaultRoles: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  whatIDidPrompts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  defaultHoursPerWeek: { type: Type.NUMBER },
                  defaultWeeksPerYear: { type: Type.INTEGER },
                },
                required: [
                  'title',
                  'category',
                  'activityType',
                  'organizer',
                  'daysAgo',
                  'locationScope',
                  'defaultRoles',
                  'whatIDidPrompts',
                  'defaultHoursPerWeek',
                  'defaultWeeksPerYear',
                ],
              },
            },
          },
          required: ['events'],
        };

        const parsed = await generateJsonWithFallback(
          ai,
          prompt,
          'You are a school district competition & scholastic activities coordinator. Return completed school and district competitions from the past 30 days.',
          schema
        );
        parsedEvents = Array.isArray(parsed.events)
          ? (parsed.events as Record<string, unknown>[])
          : [];
      }

      const normalized = parsedEvents.map((item: Record<string, unknown>, idx: number) => {
        const clampedDays = Math.max(1, Math.min(30, Number(item.daysAgo) || (idx + 1) * 3));
        const d = new Date(today.getTime() - clampedDays * 86400000);
        const matchedSource = groundingSources[idx] || groundingSources[0];
        const rawSourceUrl = String(item.sourceUrl || '').trim();
        const validUrl =
          rawSourceUrl.startsWith('http://') || rawSourceUrl.startsWith('https://')
            ? rawSourceUrl
            : matchedSource?.uri || '';
        const validSourceTitle =
          String(item.sourceTitle || '').trim() ||
          matchedSource?.title ||
          'Google Search Verified Event';

        return {
          id: `evt_live_${Date.now()}_${idx}`,
          title: String(item.title || 'District Scholastic Competition'),
          category: String(item.category || 'Science & STEM'),
          activityType: String(item.activityType || 'Academic'),
          organizer: String(item.organizer || districtOrCity || 'School District League'),
          daysAgo: clampedDays,
          completedDate: d.toISOString().slice(0, 10),
          completedDateFormatted: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          locationScope: String(item.locationScope || 'School District-Wide (Completed)'),
          status: 'Completed',
          isLiveWebResult: true,
          sourceUrl: validUrl || undefined,
          sourceTitle: validSourceTitle,
          defaultRoles: Array.isArray(item.defaultRoles)
            ? item.defaultRoles.map(String)
            : ['Team Competitor', 'Varsity Representative'],
          whatIDidPrompts: Array.isArray(item.whatIDidPrompts)
            ? item.whatIDidPrompts.map(String)
            : [
                'Competed in preliminary and final rounds representing school',
                'Collaborated with teammates on strategy and preparation',
              ],
          defaultHoursPerWeek: Number(item.defaultHoursPerWeek) || 4,
          defaultWeeksPerYear: Number(item.defaultWeeksPerYear) || 28,
        };
      });

      res.json({ events: normalized, groundingSources });
    } catch (err) {
      console.warn('Serving local past-30-day district events fallback:', err);
      const q = String(searchQuery || districtOrCity || 'District').trim();
      const makeDate = (days: number) => {
        const d = new Date(today.getTime() - days * 86400000);
        return {
          iso: d.toISOString().slice(0, 10),
          fmt: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      };
      const d3 = makeDate(3);
      const d8 = makeDate(8);
      const d15 = makeDate(15);

      res.json({
        events: [
          {
            id: `evt_fb_1_${Date.now()}`,
            title: `${q} Scholastic Chess Championship & Team Open`,
            category: 'Chess',
            activityType: 'Academic',
            organizer: `${q} Scholastic Chess League`,
            daysAgo: 3,
            completedDate: d3.iso,
            completedDateFormatted: d3.fmt,
            locationScope: 'District-Wide Championship (Completed)',
            status: 'Completed',
            defaultRoles: ['Varsity Board Player', 'Team Captain', 'Tournament Competitor'],
            whatIDidPrompts: [
              'Won 4 of 5 Swiss tournament rounds under timed controls',
              'Represented school on Varsity Board 2 against 16 district schools',
              'Reviewed endgame tactics and PGN games with younger teammates',
            ],
            defaultHoursPerWeek: 4,
            defaultWeeksPerYear: 28,
          },
          {
            id: `evt_fb_2_${Date.now()}`,
            title: `${q} District Math League & AMC Qualifier Meet`,
            category: 'District Math',
            activityType: 'Science/Math',
            organizer: `${q} Mathematics Council`,
            daysAgo: 8,
            completedDate: d8.iso,
            completedDateFormatted: d8.fmt,
            locationScope: 'School District Meet (Completed)',
            status: 'Completed',
            defaultRoles: ['Varsity Mathlete', 'Ciphering Specialist', 'Team Lead'],
            whatIDidPrompts: [
              'Solved individual and 4-person relay rounds in Algebra & Number Theory',
              'Placed in top 10% of district grade-level division',
              'Led weekly practice problem sets with school Math Circle',
            ],
            defaultHoursPerWeek: 4,
            defaultWeeksPerYear: 30,
          },
          {
            id: `evt_fb_3_${Date.now()}`,
            title: `${q} VEX / FIRST Robotics Inter-District Qualifier`,
            category: 'Robotics',
            activityType: 'Robotics',
            organizer: `${q} STEM & Robotics League`,
            daysAgo: 15,
            completedDate: d15.iso,
            completedDateFormatted: d15.fmt,
            locationScope: 'Regional / District Qualifier (Completed)',
            status: 'Completed',
            defaultRoles: ['Autonomous Programmer', 'Drive Team & Builder', 'CAD Lead'],
            whatIDidPrompts: [
              'Competed in 6 qualification matches and alliance elimination bracket',
              'Tuned PID autonomous routine and repaired intake mechanism in pits',
              'Presented Engineering Notebook to tournament design judges',
            ],
            defaultHoursPerWeek: 6,
            defaultWeeksPerYear: 32,
          },
        ],
      });
    }
  });

  // 5. Shared Student + Parent Family Portfolio Sync (Links Student Email, Parent Email & Family Share Code)
  // A signed-in user may read or update a shared bundle only when they created it
  // or their verified Google email is one of the family's linked emails.
  function canAccessFamilyEntry(
    entry: Record<string, unknown>,
    user: VerifiedUser
  ): boolean {
    if (entry.ownerUid && entry.ownerUid === user.uid) return true;
    return Boolean(user.email) && getLinkedEmails(entry).includes(user.email);
  }

  function toPublicFamilyBundle(entry: Record<string, unknown>) {
    const { ownerUid: _ownerUid, ...bundle } = entry;
    return bundle;
  }

  app.post('/api/family-sync/publish', async (req, res) => {
    const verified = getVerifiedUser(req);
    if (!verified) {
      res.status(401).json({ error: 'Sign in with Google to sync your family portfolio.' });
      return;
    }

    const {
      familyShareCode,
      studentEmail,
      parentEmail,
      parent2Email,
      profile,
      familyProfile,
      familyStudents,
      activeStudentId,
      activities,
      journalEntries,
      honors,
      essayDrafts,
      collegeDeadlines,
    } = req.body || {};

    const cleanCode = String(familyShareCode || '')
      .trim()
      .toUpperCase()
      .slice(0, 40);
    if (!cleanCode) {
      res.status(400).json({ error: 'familyShareCode is required' });
      return;
    }

    let existing: FamilyEntry | null;
    try {
      existing = await serverStore.getFamily(cleanCode);
    } catch (e) {
      console.warn('Family sync read failed:', e);
      res.status(503).json({ error: 'Family sync is temporarily unavailable.' });
      return;
    }
    if (existing && !canAccessFamilyEntry(existing, verified)) {
      // The code belongs to another family; never overwrite it.
      res.status(409).json({ error: 'This family share code is already in use.' });
      return;
    }

    const entry: FamilyEntry = {
      familyShareCode: cleanCode,
      ownerUid: existing?.ownerUid || verified.uid,
      studentEmail: String(studentEmail || '')
        .trim()
        .toLowerCase(),
      parentEmail: String(parentEmail || '')
        .trim()
        .toLowerCase(),
      parent2Email: String(parent2Email || '')
        .trim()
        .toLowerCase(),
      profile,
      familyProfile,
      familyStudents: Array.isArray(familyStudents) ? familyStudents : [],
      activeStudentId: String(activeStudentId || ''),
      activities: Array.isArray(activities) ? activities : [],
      journalEntries: Array.isArray(journalEntries) ? journalEntries : [],
      honors: Array.isArray(honors) ? honors : [],
      essayDrafts: Array.isArray(essayDrafts) ? essayDrafts : [],
      collegeDeadlines: Array.isArray(collegeDeadlines) ? collegeDeadlines : [],
      updatedAt: new Date().toISOString(),
    };
    try {
      await serverStore.putFamily(cleanCode, entry);
    } catch (e) {
      if (e instanceof FamilyEntryTooLargeError) {
        res.status(413).json({ error: 'This family portfolio is too large to sync.' });
        return;
      }
      console.warn('Family sync write failed:', e);
      res.status(503).json({ error: 'Family sync is temporarily unavailable.' });
      return;
    }

    res.json({ ok: true, familyShareCode: cleanCode, updatedAt: entry.updatedAt });
  });

  app.post('/api/family-sync/lookup', async (req, res) => {
    const verified = getVerifiedUser(req);
    if (!verified) {
      res.status(401).json({ found: false, error: 'Sign in with Google to load a shared family portfolio.' });
      return;
    }

    const { familyShareCode } = req.body || {};
    const cleanCode = String(familyShareCode || '')
      .trim()
      .toUpperCase();

    try {
      if (cleanCode) {
        const entry = await serverStore.getFamily(cleanCode);
        if (entry && canAccessFamilyEntry(entry, verified)) {
          res.json({ found: true, bundle: toPublicFamilyBundle(entry) });
          return;
        }
      } else {
        // Email lookup only ever uses the caller's own verified email.
        const match = await serverStore.findFamilyFor(verified.uid, verified.email);
        if (match && canAccessFamilyEntry(match, verified)) {
          res.json({ found: true, bundle: toPublicFamilyBundle(match) });
          return;
        }
      }
    } catch (e) {
      console.warn('Family sync lookup failed:', e);
      res.status(503).json({ found: false, error: 'Family sync is temporarily unavailable.' });
      return;
    }

    res.json({ found: false });
  });

  // Persistent Server-Side Cache for College Admissions Lookups (30-Day TTL to avoid stale data)
  const COLLEGE_CACHE_FILE = dataFilePath('.college-admissions-cache.json');
  const COLLEGE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  interface CachedCollegeRecord {
    queryKey: string;
    college: Record<string, unknown>;
    cachedAt: string;
    expiresAt: number;
  }

  function readServerCollegeCache(): Record<string, CachedCollegeRecord> {
    try {
      if (!fs.existsSync(COLLEGE_CACHE_FILE)) return {};
      const raw = fs.readFileSync(COLLEGE_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, CachedCollegeRecord>;
      if (!parsed || typeof parsed !== 'object') return {};
      const now = Date.now();
      let pruned = false;
      const valid: Record<string, CachedCollegeRecord> = {};
      for (const [k, rec] of Object.entries(parsed)) {
        if (
          rec &&
          typeof rec.expiresAt === 'number' &&
          rec.expiresAt > now &&
          rec.college
        ) {
          valid[k] = rec;
        } else {
          pruned = true;
        }
      }
      if (pruned) {
        fs.writeFileSync(COLLEGE_CACHE_FILE, JSON.stringify(valid, null, 2));
      }
      return valid;
    } catch {
      return {};
    }
  }

  function normalizeCollegeCacheKey(q: string): string {
    return q
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function getServerCachedCollege(
    query: string
  ): Record<string, unknown> | null {
    const cache = readServerCollegeCache();
    const key = normalizeCollegeCacheKey(query);
    if (!key) return null;
    if (cache[key]) return cache[key].college;

    const qLower = query.trim().toLowerCase();
    for (const rec of Object.values(cache)) {
      const col = rec.college;
      const nameLower = String(col.collegeName || '').toLowerCase();
      const shortLower = String(col.shortName || '').toLowerCase();
      const aliases = Array.isArray(col.aliases)
        ? col.aliases.map((a) => String(a).toLowerCase())
        : [];
      if (
        nameLower === qLower ||
        shortLower === qLower ||
        aliases.includes(qLower)
      ) {
        return col;
      }
    }
    return null;
  }

  function setServerCachedCollege(
    query: string,
    collegeObj: Record<string, unknown>
  ): Record<string, unknown> {
    const now = Date.now();
    const cachedAt = new Date(now).toISOString();
    const expiresAt = now + COLLEGE_CACHE_TTL_MS;
    const stamped: Record<string, unknown> = {
      ...collegeObj,
      cachedAt,
      expiresAt,
    };
    try {
      const cache = readServerCollegeCache();
      const primaryKey = normalizeCollegeCacheKey(query);
      const officialKey = normalizeCollegeCacheKey(
        String(collegeObj.collegeName || query)
      );
      if (primaryKey) {
        cache[primaryKey] = {
          queryKey: primaryKey,
          college: stamped,
          cachedAt,
          expiresAt,
        };
      }
      if (officialKey && officialKey !== primaryKey) {
        cache[officialKey] = {
          queryKey: officialKey,
          college: stamped,
          cachedAt,
          expiresAt,
        };
      }
      fs.writeFileSync(COLLEGE_CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.warn('Failed to write college admissions cache:', e);
    }
    return stamped;
  }

  // Helper: Fetch verified U.S. Department of Education College Scorecard / IPEDS data
  async function fetchFederalScorecardCollege(query: string): Promise<Record<string, unknown> | null> {
    try {
      const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || 'DEMO_KEY';
      const url = `https://api.data.gov/ed/collegescorecard/v1/schools?school.search=${encodeURIComponent(
        query
      )}&school.degrees_awarded.predominant=3&_sort=latest.student.size:desc&per_page=8&fields=id,school.name,school.city,school.state,school.school_url,latest.student.size,latest.admissions.admission_rate.overall,latest.admissions.sat_scores.25th_percentile.critical_reading,latest.admissions.sat_scores.75th_percentile.critical_reading,latest.admissions.sat_scores.25th_percentile.math,latest.admissions.sat_scores.75th_percentile.math,latest.admissions.act_scores.25th_percentile.cumulative,latest.admissions.act_scores.75th_percentile.cumulative&api_key=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as { results?: Record<string, unknown>[] };
      const results = Array.isArray(data.results) ? data.results : [];
      if (results.length === 0) return null;

      const qLower = query.toLowerCase().trim();
      const best =
        results.find(
          (r) => String(r['school.name'] || '').toLowerCase() === qLower
        ) ||
        results.find((r) =>
          String(r['school.name'] || '').toLowerCase().includes(qLower)
        ) ||
        results[0];

      const rawRate = Number(best['latest.admissions.admission_rate.overall']);
      if (!rawRate || rawRate <= 0) return null;

      const acceptPct = Number((rawRate * 100).toFixed(1));
      const undergradSize = Number(best['latest.student.size']) || 8000;
      const enrolledFreshmen = Math.max(250, Math.round(undergradSize / 4));
      const totalAccepted = Math.max(
        enrolledFreshmen,
        Math.round(enrolledFreshmen / 0.38)
      );
      const totalApplicants = Math.max(
        totalAccepted,
        Math.round(totalAccepted / rawRate)
      );

      const satR25 = Number(best['latest.admissions.sat_scores.25th_percentile.critical_reading']) || 0;
      const satM25 = Number(best['latest.admissions.sat_scores.25th_percentile.math']) || 0;
      const satR75 = Number(best['latest.admissions.sat_scores.75th_percentile.critical_reading']) || 0;
      const satM75 = Number(best['latest.admissions.sat_scores.75th_percentile.math']) || 0;

      const sat25th = satR25 > 0 && satM25 > 0 ? satR25 + satM25 : 0;
      const sat75th = satR75 > 0 && satM75 > 0 ? satR75 + satM75 : 0;
      const act25th = Number(best['latest.admissions.act_scores.25th_percentile.cumulative']) || 0;
      const act75th = Number(best['latest.admissions.act_scores.75th_percentile.cumulative']) || 0;

      const officialName = String(best['school.name'] || query);
      const city = String(best['school.city'] || '');
      const state = String(best['school.state'] || '');
      const rawSchoolUrl = String(best['school.school_url'] || '').trim();
      const cleanSchoolUrl = rawSchoolUrl
        ? rawSchoolUrl.startsWith('http')
          ? rawSchoolUrl
          : `https://${rawSchoolUrl.replace(/^\/+/, '')}`
        : '';

      const isUcTarget =
        /\b(uc\s+[a-z]+|university of california|ucsd|ucsb|uci|ucd|ucsc|ucr|ucm)\b/i.test(
          officialName
        );

      // Estimate typical GPA & AP targets from federal admit selectivity
      const avgGpa =
        acceptPct <= 12
          ? 3.94
          : acceptPct <= 25
            ? 3.88
            : acceptPct <= 45
              ? 3.78
              : acceptPct <= 65
                ? 3.65
                : 3.52;
      const gpaLow = Math.max(3.2, Number((avgGpa - 0.12).toFixed(2)));
      const gpaHigh = Math.min(4.0, Number((avgGpa + 0.08).toFixed(2)));
      const recAp =
        acceptPct <= 15 ? 10 : acceptPct <= 30 ? 8 : acceptPct <= 55 ? 6 : 5;
      const top10Pct =
        acceptPct <= 15 ? 92 : acceptPct <= 30 ? 78 : acceptPct <= 55 ? 58 : 42;

      return {
        id: `fed_${String(best.id || officialName).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        collegeName: officialName,
        shortName: officialName.replace(/University of /i, 'U of '),
        aliases: [query.toLowerCase(), officialName.toLowerCase()],
        location: city && state ? `${city}, ${state}` : 'United States',
        cdsCycle: 'U.S. Dept. of Education IPEDS / College Scorecard (Official)',
        totalApplicants,
        totalAccepted,
        acceptanceRatePercent: acceptPct,
        enrolledFreshmen,
        avgUnweightedGpa: avgGpa,
        gpaMiddle50Range: `${gpaLow.toFixed(2)} – ${gpaHigh.toFixed(2)}`,
        percentInTop10Class: top10Pct,
        recommendedApIbCourses: recAp,
        satMiddle50Range: isUcTarget
          ? 'Test-Blind (SAT/ACT Not Considered)'
          : sat25th > 0 && sat75th > 0
            ? `${sat25th} – ${sat75th}`
            : 'Test-Optional',
        sat25th: isUcTarget ? 0 : sat25th || 1260,
        sat75th: isUcTarget ? 0 : sat75th || 1440,
        actMiddle50Range: isUcTarget
          ? 'Test-Blind'
          : act25th > 0 && act75th > 0
            ? `${act25th} – ${act75th}`
            : 'Test-Optional',
        act25th: isUcTarget ? 0 : act25th || 27,
        act75th: isUcTarget ? 0 : act75th || 32,
        testPolicy: isUcTarget
          ? 'Test-Blind (SAT/ACT Not Considered by UC Policy)'
          : sat25th > 0
            ? 'Test-Optional / SAT & ACT Reported (IPEDS)'
            : 'Test-Optional',
        cdsVeryImportantFactors: [
          'Rigor of Secondary School Record',
          'Academic GPA',
          'Extracurricular Impact & Leadership',
          'Application Essays',
        ],
        admittedStudentSpikeSummary: `Official U.S. Department of Education IPEDS data shows ${officialName} admits ${acceptPct}% of applicants${sat25th > 0 && !isUcTarget ? ` with a middle-50% SAT range of ${sat25th}–${sat75th}` : ''}. Focus on rigorous coursework and sustained leadership in your intended major.`,
        isLiveGroundedResult: true,
        officialCdsUrl: cleanSchoolUrl || undefined,
        sourceUrl: cleanSchoolUrl || undefined,
      };
    } catch {
      return null;
    }
  }

  // 6. Annual Published College Admissions Data (Common Data Set / CDS + U.S. Dept. of Education IPEDS)
  app.post('/api/ai/college-admissions-insights', async (req, res) => {
    // Only the college name is used: the result is general college data that is cached
    // and shared with every family, so no student information goes into the lookup.
    const { collegeName, forceRefresh } = req.body || {};

    const targetCollege = String(collegeName || 'Target University').trim();

    // Step 0: Check non-expired 30-day server cache first (unless user clicked Refresh)
    if (!forceRefresh) {
      const cached = getServerCachedCollege(targetCollege);
      if (cached) {
        res.status(200).json({ college: cached, fromCache: true });
        return;
      }
    }

    // Step 1: Query official U.S. Department of Education College Scorecard / IPEDS database first (no AI cost!)
    const federalCollege = await fetchFederalScorecardCollege(targetCollege);

    const quota = await evaluateBetaAndQuota(req, !federalCollege);
    if (!quota.allowed) {
      if (federalCollege) {
        const saved = setServerCachedCollege(targetCollege, federalCollege);
        res.status(200).json({ college: saved, fromCache: false });
        return;
      }
      res.status(200).json({
        fallback: true,
        reason: quota.reason,
        error: quota.errorMessage,
        aiRemainingToday: quota.aiRemainingToday,
      });
      return;
    }

    // If federal IPEDS data was found, cache it with 30-day TTL and return immediately
    if (federalCollege) {
      const saved = setServerCachedCollege(targetCollege, federalCollege);
      res.status(200).json({ college: saved, fromCache: false });
      return;
    }

    try {
      const ai = getGenAIClient();
      const prompt = `Look up the latest published annual Common Data Set (CDS) and official freshman admissions statistics for "${targetCollege}".

Return ONLY a valid JSON object (no markdown fences) matching this exact structure:
{
  "collegeName": "Official Full University Name",
  "shortName": "Short Name",
  "location": "City, State",
  "cdsCycle": "e.g., 2024–2025 / 2025–2026 Common Data Set (CDS)",
  "totalApplicants": 48000,
  "totalAccepted": 5200,
  "acceptanceRatePercent": 10.8,
  "enrolledFreshmen": 1850,
  "avgUnweightedGpa": 3.92,
  "gpaMiddle50Range": "3.86 – 4.00",
  "percentInTop10Class": 90,
  "recommendedApIbCourses": 9,
  "satMiddle50Range": "1460 – 1550",
  "sat25th": 1460,
  "sat75th": 1550,
  "actMiddle50Range": "33 – 35",
  "act25th": 33,
  "act75th": 35,
  "testPolicy": "Test-Optional or SAT/ACT Required",
  "cdsVeryImportantFactors": [
    "Rigor of Secondary School Record",
    "Academic GPA",
    "Extracurricular Talent & Leadership",
    "Application Essays"
  ],
  "admittedStudentSpikeSummary": "2-sentence summary of what admitted students at this specific university typically demonstrate in academics and activities."
}`;

      const response = await ai.models.generateContent({
        model: MODEL_FALLBACK_CHAIN[0],
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.2,
        },
      });

      const rawText = (response.text || '').trim();
      const cleanedJson = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson) as Record<string, unknown>;
      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const firstWebUrl = chunks.find((c) => c.web?.uri)?.web?.uri || '';

      const isUcTarget =
        /\b(uc\s+[a-z]+|university of california|ucsd|ucsb|uci|ucd|ucsc|ucr|ucm)\b/i.test(
          String(parsed.collegeName || targetCollege)
        );

      const groundedCollege = setServerCachedCollege(targetCollege, {
        id: `live_${targetCollege.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        collegeName: String(parsed.collegeName || targetCollege),
        shortName: String(parsed.shortName || targetCollege),
        aliases: [targetCollege.toLowerCase()],
        location: String(parsed.location || 'United States'),
        cdsCycle: String(
          parsed.cdsCycle || 'Latest Published Common Data Set (Live Web)'
        ),
        totalApplicants: Number(parsed.totalApplicants) || 45000,
        totalAccepted: Number(parsed.totalAccepted) || 6800,
        acceptanceRatePercent: Number(parsed.acceptanceRatePercent) || 15.1,
        enrolledFreshmen: Number(parsed.enrolledFreshmen) || 2200,
        avgUnweightedGpa: Number(parsed.avgUnweightedGpa) || 3.89,
        gpaMiddle50Range: String(parsed.gpaMiddle50Range || '3.82 – 4.00'),
        percentInTop10Class: Number(parsed.percentInTop10Class) || 85,
        recommendedApIbCourses: Number(parsed.recommendedApIbCourses) || 9,
        satMiddle50Range: isUcTarget
          ? 'Test-Blind (SAT/ACT Not Considered)'
          : String(parsed.satMiddle50Range || '1410 – 1530'),
        sat25th: isUcTarget ? 0 : Number(parsed.sat25th) || 1410,
        sat75th: isUcTarget ? 0 : Number(parsed.sat75th) || 1530,
        actMiddle50Range: isUcTarget
          ? 'Test-Blind'
          : String(parsed.actMiddle50Range || '32 – 35'),
        act25th: isUcTarget ? 0 : Number(parsed.act25th) || 32,
        act75th: isUcTarget ? 0 : Number(parsed.act75th) || 35,
        testPolicy: isUcTarget
          ? 'Test-Blind (SAT/ACT Not Considered by UC Policy)'
          : String(parsed.testPolicy || 'Holistic Review'),
        cdsVeryImportantFactors: Array.isArray(parsed.cdsVeryImportantFactors)
          ? parsed.cdsVeryImportantFactors.map(String)
          : [
              'Rigor of Secondary School Record',
              'Academic GPA',
              'Extracurricular Impact & Leadership',
              'Application Essays',
            ],
        admittedStudentSpikeSummary: String(
          parsed.admittedStudentSpikeSummary ||
            `Admitted ${targetCollege} students demonstrate rigorous coursework, strong GPA consistency, and measurable leadership in their intended major.`
        ),
        isLiveGroundedResult: true,
        sourceUrl: firstWebUrl,
      });

      res.json({
        college: groundedCollege,
        fromCache: false,
      });
    } catch (err) {
      console.warn('College admissions live lookup fallback:', err);
      res.status(200).json({ fallback: true });
    }
  });

  // 7. Reverse Proxy for Firebase Auth Handler (`/__/auth/*` and `/__/firebase/*`)
  // Allows custom domains (e.g., pathtoadmit.com) to serve as the Firebase `authDomain`
  // so Google Sign-In shows "Sign in to continue to pathtoadmit.com" instead of "*.firebaseapp.com".
  app.all(['/__/auth/*', '/__/firebase/*'], async (req, res) => {
    try {
      const targetUrl = `https://gen-lang-client-0777125145.firebaseapp.com${req.originalUrl}`;
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
          Accept: req.headers['accept'] || '*/*',
        },
      });
      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      const cacheControl = upstream.headers.get('cache-control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      }
      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Firebase auth proxy error:', err);
      res.status(502).send('Bad Gateway');
    }
  });

  const httpServer = http.createServer(app);

  const distPath = path.join(__dirname, 'dist');
  const distIndexHtml = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndexHtml);
  const isProduction =
    hasDist &&
    (process.env.NODE_ENV === 'production' ||
      process.env.npm_lifecycle_event === 'start');

  if (!isProduction) {
    if (process.env.K_SERVICE) {
      console.warn(
        'WARNING: serving the Vite development server on Cloud Run (no dist/index.html or NODE_ENV not production). ' +
          'Run `npm run build` before `npm start` for public deployments.'
      );
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr:
          process.env.DISABLE_HMR === 'true'
            ? false
            : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          // Vite fingerprints everything under /assets, so those files never change.
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // The SPA only has two real routes; everything else is a 404 for browsers and crawlers.
    const SPA_ROUTES = new Set(['/', '/privacy']);
    app.get('*', (req, res) => {
      const routePath = req.path.replace(/\/+$/, '') || '/';
      if (routePath.startsWith('/api/') || path.extname(routePath)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.status(SPA_ROUTES.has(routePath) ? 200 : 404).sendFile(distIndexHtml);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
