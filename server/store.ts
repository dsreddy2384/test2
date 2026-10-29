import fs from 'fs';
import type { App } from 'firebase-admin/app';
import { FieldPath, getFirestore, type DocumentData, type Firestore } from 'firebase-admin/firestore';

// ============================================================================
// Server-side state: beta access settings, daily AI usage and family-sync bundles.
//
// Production uses Firestore (collections below are server-only: the security rules'
// default deny blocks every client read and write, and the Admin SDK bypasses rules).
// The JSON-file store is the fallback for local development and AI Studio preview, or
// whenever Firestore is unreachable at startup. File state is per-instance and is lost
// on every redeploy, which is why production should run on Firestore.
// ============================================================================

export interface BetaConfig {
  inviteCode: string;
  demoLoginEnabled: boolean;
  dailyUserLimit: number;
  globalDailyLimit: number;
  approvedEmails: string[];
  approvedUids: string[];
}

export interface DayUsage {
  globalCount: number;
  users: Record<string, number>;
}

export type FamilyEntry = Record<string, unknown> & {
  familyShareCode: string;
  ownerUid?: string;
  studentEmail?: string;
  parentEmail?: string;
  parent2Email?: string;
};

export interface ServerStore {
  kind: 'firestore' | 'file';
  readBetaConfig(): Promise<Partial<BetaConfig> | null>;
  writeBetaConfig(config: BetaConfig): Promise<void>;
  readUsage(day: string): Promise<DayUsage>;
  /** Atomically adds one call for userKey unless a limit is already reached. */
  consumeIfAllowed(
    day: string,
    userKey: string,
    userLimit: number,
    globalLimit: number
  ): Promise<{ ok: boolean; usage: DayUsage }>;
  getFamily(code: string): Promise<FamilyEntry | null>;
  putFamily(code: string, entry: FamilyEntry): Promise<void>;
  /** First bundle the user created, else the first one that lists their verified email. */
  findFamilyFor(uid: string, email: string): Promise<FamilyEntry | null>;
}

export class FamilyEntryTooLargeError extends Error {}

// Firestore documents are capped at 1 MiB; keep headroom for the other fields.
const MAX_FAMILY_BUNDLE_CHARS = 900_000;

export function getLinkedEmails(entry: Record<string, unknown>): string[] {
  return [entry.studentEmail, entry.parentEmail, entry.parent2Email]
    .flatMap((v) => String(v || '').toLowerCase().split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

function emptyUsage(): DayUsage {
  return { globalCount: 0, users: {} };
}

// ---------------------------------------------------------------------------
// File store (fallback)
// ---------------------------------------------------------------------------

interface LegacyBetaFile extends Partial<BetaConfig> {
  usageByDate?: Record<string, DayUsage>;
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch (e) {
    console.warn(`Could not read ${filePath}:`, e);
  }
  return fallback;
}

function writeJson(filePath: string, data: unknown) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`Could not write ${filePath}:`, e);
  }
}

export function createFileStore(betaFilePath: string, familyFilePath: string): ServerStore {
  const readBeta = () => readJson<LegacyBetaFile>(betaFilePath, {});
  const writeBeta = (data: LegacyBetaFile) => {
    // Keep only the most recent 7 days of usage so the file stays small.
    const days = Object.keys(data.usageByDate || {}).sort().slice(-7);
    data.usageByDate = Object.fromEntries(days.map((d) => [d, data.usageByDate![d]]));
    writeJson(betaFilePath, data);
  };
  const readFamilies = () => readJson<Record<string, FamilyEntry>>(familyFilePath, {});

  return {
    kind: 'file',
    async readBetaConfig() {
      const raw = readBeta();
      return Object.keys(raw).length ? raw : null;
    },
    async writeBetaConfig(config) {
      writeBeta({ ...readBeta(), ...config });
    },
    async readUsage(day) {
      return readBeta().usageByDate?.[day] || emptyUsage();
    },
    async consumeIfAllowed(day, userKey, userLimit, globalLimit) {
      const data = readBeta();
      const usage = data.usageByDate?.[day] || emptyUsage();
      if (usage.globalCount >= globalLimit || (usage.users[userKey] || 0) >= userLimit) {
        return { ok: false, usage };
      }
      usage.globalCount += 1;
      usage.users[userKey] = (usage.users[userKey] || 0) + 1;
      data.usageByDate = { ...(data.usageByDate || {}), [day]: usage };
      writeBeta(data);
      return { ok: true, usage };
    },
    async getFamily(code) {
      return readFamilies()[code] || null;
    },
    async putFamily(code, entry) {
      if (JSON.stringify(entry).length > MAX_FAMILY_BUNDLE_CHARS) {
        throw new FamilyEntryTooLargeError('Family bundle too large');
      }
      const families = readFamilies();
      families[code] = entry;
      writeJson(familyFilePath, families);
    },
    async findFamilyFor(uid, email) {
      const entries = Object.values(readFamilies());
      return (
        entries.find((e) => e.ownerUid === uid) ||
        (email ? entries.find((e) => getLinkedEmails(e).includes(email)) : undefined) ||
        null
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Firestore store (production)
// ---------------------------------------------------------------------------

// Daily usage counts hold no content, only per-account call counts; keep 30 days.
const USAGE_RETENTION_DAYS = 30;
const BETA_CONFIG_DOC = 'serverConfig/betaAccess';
const USAGE_COLLECTION = 'aiUsage';
const FAMILY_COLLECTION = 'familySync';

function familyFromDoc(data: DocumentData | undefined): FamilyEntry | null {
  if (!data || typeof data.bundleJson !== 'string') return null;
  try {
    return JSON.parse(data.bundleJson) as FamilyEntry;
  } catch {
    return null;
  }
}

export function createFirestoreStore(db: Firestore): ServerStore {
  return {
    kind: 'firestore',
    async readBetaConfig() {
      const snap = await db.doc(BETA_CONFIG_DOC).get();
      return snap.exists ? (snap.data() as Partial<BetaConfig>) : null;
    },
    async writeBetaConfig(config) {
      await db.doc(BETA_CONFIG_DOC).set({ ...config, updatedAt: new Date() });
    },
    async readUsage(day) {
      const snap = await db.collection(USAGE_COLLECTION).doc(day).get();
      const data = snap.data();
      return {
        globalCount: Number(data?.globalCount) || 0,
        users: (data?.users as Record<string, number>) || {},
      };
    },
    async consumeIfAllowed(day, userKey, userLimit, globalLimit) {
      const ref = db.collection(USAGE_COLLECTION).doc(day);
      return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        const usage: DayUsage = {
          globalCount: Number(data?.globalCount) || 0,
          users: { ...((data?.users as Record<string, number>) || {}) },
        };
        if (usage.globalCount >= globalLimit || (usage.users[userKey] || 0) >= userLimit) {
          return { ok: false, usage };
        }
        usage.globalCount += 1;
        usage.users[userKey] = (usage.users[userKey] || 0) + 1;
        tx.set(ref, { ...usage, updatedAt: new Date() });
        return { ok: true, usage };
      });
    },
    async getFamily(code) {
      return familyFromDoc((await db.collection(FAMILY_COLLECTION).doc(code).get()).data());
    },
    async putFamily(code, entry) {
      // Stored as a JSON string so arbitrary client-shaped data (undefined values,
      // nested arrays) round-trips exactly; the queryable fields sit alongside it.
      const bundleJson = JSON.stringify(entry);
      if (bundleJson.length > MAX_FAMILY_BUNDLE_CHARS) {
        throw new FamilyEntryTooLargeError('Family bundle too large');
      }
      await db.collection(FAMILY_COLLECTION).doc(code).set({
        ownerUid: entry.ownerUid || '',
        linkedEmails: getLinkedEmails(entry),
        bundleJson,
        updatedAt: new Date(),
      });
    },
    async findFamilyFor(uid, email) {
      const col = db.collection(FAMILY_COLLECTION);
      const owned = await col.where('ownerUid', '==', uid).limit(1).get();
      if (!owned.empty) return familyFromDoc(owned.docs[0].data());
      if (!email) return null;
      const linked = await col.where('linkedEmails', 'array-contains', email).limit(1).get();
      return linked.empty ? null : familyFromDoc(linked.docs[0].data());
    },
  };
}

// ---------------------------------------------------------------------------
// Startup selection
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}

async function pruneOldUsage(db: Firestore) {
  const cutoff = new Date(Date.now() - USAGE_RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
  const old = await db
    .collection(USAGE_COLLECTION)
    .where(FieldPath.documentId(), '<', cutoff)
    .limit(400)
    .get();
  if (old.empty) return;
  const batch = db.batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`Server store: removed ${old.size} AI usage record(s) older than ${USAGE_RETENTION_DAYS} days.`);
}

async function migrateFileStateToFirestore(file: ServerStore, firestore: ServerStore, familyFilePath: string) {
  if (!(await firestore.readBetaConfig())) {
    const legacy = await file.readBetaConfig();
    if (legacy) {
      const { usageByDate: _usage, ...config } = legacy as LegacyBetaFile;
      await firestore.writeBetaConfig(config as BetaConfig);
      console.log('Server store: copied beta access settings from file into Firestore.');
    }
  }
  const families = readJson<Record<string, FamilyEntry>>(familyFilePath, {});
  let copied = 0;
  for (const [code, entry] of Object.entries(families)) {
    if (!(await firestore.getFamily(code))) {
      await firestore.putFamily(code, entry);
      copied += 1;
    }
  }
  if (copied) console.log(`Server store: copied ${copied} family-sync bundle(s) into Firestore.`);
}

export async function createServerStore(options: {
  adminApp: App;
  databaseId?: string;
  betaFilePath: string;
  familyFilePath: string;
}): Promise<ServerStore> {
  const fileStore = createFileStore(options.betaFilePath, options.familyFilePath);
  if (process.env.SERVER_STORE === 'file') {
    console.log('Server store: file (SERVER_STORE=file).');
    return fileStore;
  }
  try {
    const db = options.databaseId
      ? getFirestore(options.adminApp, options.databaseId)
      : getFirestore(options.adminApp);
    // Prove we can both read and write before relying on Firestore.
    await withTimeout(
      db.doc('serverConfig/_healthcheck').set({ checkedAt: new Date() }),
      8000
    );
    const firestoreStore = createFirestoreStore(db);
    try {
      await migrateFileStateToFirestore(fileStore, firestoreStore, options.familyFilePath);
    } catch (e) {
      console.warn('Server store: could not copy file state into Firestore:', e);
    }
    pruneOldUsage(db).catch((e) => console.warn('Server store: could not prune old AI usage:', e));
    console.log(`Server store: firestore (database ${options.databaseId || '(default)'}).`);
    return firestoreStore;
  } catch (e) {
    console.warn(
      'WARNING: Server store falling back to local files because Firestore is unavailable. ' +
        'AI quotas, beta approvals and family sync will reset on every redeploy. Cause:',
      e instanceof Error ? e.message : e
    );
    return fileStore;
  }
}
