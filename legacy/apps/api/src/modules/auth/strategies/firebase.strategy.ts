/**
 * Firebase ID-token strategy — verifies Firebase Auth JWTs (README §7.1).
 * Full engine: Doc 2 (Auth Engine) uses firebase-admin to verify the ID
 * token, looks the user up in users + tenant_staff/platform_admins, and
 * produces the AuthContext + session cookie. Structure reserved here.
 */
export class FirebaseStrategy {
  // verifyIdToken(idToken: string): Promise<DecodedIdToken> — Doc 2
}
