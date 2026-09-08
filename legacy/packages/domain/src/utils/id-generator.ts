import { randomBytes, randomUUID } from 'crypto';

// ============================================================
// ID generation strategy (docs/01-skeleton.md §8)
//
//  • Internal PKs: UUID v4 (Postgres gen_random_uuid(); app-side
//    crypto.randomUUID() for Firestore doc ids — both adapters
//    therefore produce the SAME kind of id, so migration needs
//    zero id remapping).
//  • Public-facing ids: prefixed, human-legible, 12-char lower-
//    case alphanumeric — format-identical to nanoid
//    customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)
//    but implemented with node:crypto so the domain package stays
//    zero-dependency.
// ============================================================

const PUBLIC_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const PUBLIC_ID_LENGTH = 12;

/** Cryptographically-random lowercase-alphanumeric string of `length` chars. */
export function randomAlphanumeric(length = PUBLIC_ID_LENGTH): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    // Rejection sampling keeps the output uniform across 36 chars.
    let idx = bytes[i];
    while (idx >= 252) idx = randomBytes(1)[0]; // 256 - (256 % 36) = 252
    out += PUBLIC_ALPHABET[idx % PUBLIC_ALPHABET.length];
  }
  return out;
}

/** Generate a public-facing prefixed id. */
export function generatePublicId(prefix: string): string {
  return `${prefix}_${randomAlphanumeric(PUBLIC_ID_LENGTH)}`;
  // generatePublicId('app')     -> app_7c1e9b4a2f0d
  // generatePublicId('pk_live') -> pk_live_7c1e9b4a2f0d
  // generatePublicId('tst')     -> tst_7c1e9b4a2f0d (testimonial short-ref, optional)
}

export function uuidV4(): string {
  return randomUUID();
}

/** Firebase-Auth UID for prototype auth; maps 1:1 to users.id. */
export function generateUserId(): string {
  return uuidV4();
}

/** Invite / email tokens — 32 random bytes, url-safe. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export { randomUUID };
