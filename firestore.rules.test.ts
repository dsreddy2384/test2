/**
 * Firestore Rules Security Verification Suite — "Dirty Dozen" Payloads
 * Verifies that all 12 adversarial payloads defined in security_spec.md return PERMISSION_DENIED.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Activity Create',
    collection: '/activities/act_1',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: { ownerId: 'user_B', position: 'Captain', organization: 'Robotics' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    collection: '/users/user_A',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: false,
    payload: { uid: 'user_A', displayName: 'Alex' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Orphaned Activity Create Without Parent UserProfile',
    collection: '/activities/act_orphan',
    operation: 'create',
    authUid: 'user_without_profile',
    emailVerified: true,
    payload: { ownerId: 'user_without_profile', position: 'Member', organization: 'Debate' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Update',
    collection: '/activities/act_1',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    payload: { isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Common App 150-Char Description Overflow',
    collection: '/activities/act_1',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: { description: 'A'.repeat(151) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Common App 50-Char Position Overflow',
    collection: '/activities/act_1',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    payload: { position: 'P'.repeat(55) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Client Timestamp Forgery on Journal Create',
    collection: '/journals/j_1',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable createdAt Mutation on Journal Update',
    collection: '/journals/j_1',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    payload: { createdAt: '2025-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Ownership Transfer Attack on Honor Update',
    collection: '/honors/h_1',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    payload: { ownerId: 'user_B' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack with Invalid Characters',
    collection: '/activities/invalid$id!spaces',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: { ownerId: 'user_A' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Tenant Profile & Journal Read',
    collection: '/users/user_A',
    operation: 'get',
    authUid: 'user_B',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered List Query Scraping on Activities',
    collection: '/activities',
    operation: 'list',
    authUid: 'user_B',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
