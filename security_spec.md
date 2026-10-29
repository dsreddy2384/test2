# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unspecified paths (`/{document=**}`) are strictly denied (`allow read, write: if false;`).
2. **Verified Identity**: Write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII & Family Profile Split-Collection Isolation**:
   - `/users/{userId}` and `/users/{userId}/familyProfile/{profileId}` are strictly isolated to the authenticated owner (`request.auth.uid == userId`).
   - Every sub-document in `/users/{userId}/familyProfile/{profileId}` enforces the Master Gate (`get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`) and validates all 30 household/education fields with strict `.size()` bounds.
4. **Relational Integrity (Master Gate / Global Consistency)**:
   - Every `/activities/{activityId}`, `/journals/{journalId}`, and `/honors/{honorId}` write requires an existing parent `/users/$(request.auth.uid)` profile document.
5. **Strict Common App Field Bounds**:
   - `position`: `1..50` characters
   - `organization`: `1..100` characters
   - `description`: `1..150` characters
   - `impactScore`: integer `1..5`
6. **Temporal & Ownership Immutability**:
   - `createdAt == request.time` on create; `createdAt` and `ownerId`/`uid` are immutable on update; `updatedAt == request.time` on all writes.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Activity Create**: User A attempts to create `/activities/act_1` with `ownerId: 'user_B'`. -> `PERMISSION_DENIED`
2. **Unverified Email Spoof**: User A with `email_verified: false` attempts to create `/users/user_A`. -> `PERMISSION_DENIED`
3. **Orphaned Activity Create Without Parent UserProfile**: User without `/users/{uid}` attempts to create `/activities/act_orphan`. -> `PERMISSION_DENIED`
4. **Shadow Field Injection on Update**: User A attempts to inject `isAdmin: true` into `/activities/act_1`. -> `PERMISSION_DENIED`
5. **Common App 150-Char Description Overflow**: User A attempts to save a 151-character `description`. -> `PERMISSION_DENIED`
6. **Common App 50-Char Position Overflow**: User A attempts to save a 55-character `position`. -> `PERMISSION_DENIED`
7. **Client Timestamp Forgery on Journal Create**: User A supplies a forged past `createdAt` timestamp. -> `PERMISSION_DENIED`
8. **Immutable createdAt Mutation on Journal Update**: User A attempts to mutate `createdAt` on update. -> `PERMISSION_DENIED`
9. **Ownership Transfer Attack on Honor Update**: User A attempts to change `ownerId` to `'user_B'`. -> `PERMISSION_DENIED`
10. **ID Poisoning Attack with Invalid Characters**: User A attempts to create a document with `$` or spaces in the ID. -> `PERMISSION_DENIED`
11. **Cross-Tenant Family Profile PII Read**: User A attempts to read `/users/user_B/familyProfile/main`. -> `PERMISSION_DENIED`
12. **Out-of-Range impactScore or Siblings Count**: User A attempts to write `impactScore: 99` or `siblingsCount: 50`. -> `PERMISSION_DENIED`
