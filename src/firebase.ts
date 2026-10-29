import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const customAuthDomain =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    ? String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN).trim()
    : 'pathtoadmit.com';

const app = initializeApp({
  ...firebaseConfig,
  authDomain: customAuthDomain || 'pathtoadmit.com',
});
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

export const BETA_CODE_STORAGE_KEY = 'pathtoadmit_beta_code_v1';
export const DEMO_SESSION_STORAGE_KEY = 'pathtoadmit_demo_session_v1';
export const ADMIN_EMAIL = 'dsreddy123@gmail.com';
export const DEMO_ACCOUNT_EMAIL = 'demo@pathtoadmit.com';
export const DEMO_ACCOUNT_UID = 'demo_family_account';

// Headers for every /api call. The server identifies the caller only from the
// Firebase ID token; demo and guest sessions send no token and get sample responses.
export async function getAiAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  const savedCode =
    typeof window !== 'undefined'
      ? localStorage.getItem(BETA_CODE_STORAGE_KEY) || ''
      : '';

  let idToken = '';
  if (currentUser) {
    try {
      idToken = await currentUser.getIdToken();
    } catch {
      // Token refresh failed (e.g. offline): the request continues unauthenticated.
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...(savedCode ? { 'x-beta-code': savedCode } : {}),
  };
}

// Family share codes gate a family's shared portfolio, so they must be unguessable.
export function generateFamilyShareCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `PF-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const SECURE_SHARE_CODE_PATTERN = /^PF-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

// Older codes were derived from grad year, ZIP or surname (e.g. PF-2030-FAMILY).
export function isSecureFamilyShareCode(code?: string | null): boolean {
  return Boolean(code) && SECURE_SHARE_CODE_PATTERN.test(String(code));
}

// Returns the first candidate that is already a random code, otherwise a new one.
export function secureFamilyShareCode(...candidates: (string | undefined | null)[]): string {
  return candidates.find((c) => isSecureFamilyShareCode(c)) || generateFamilyShareCode();
}


