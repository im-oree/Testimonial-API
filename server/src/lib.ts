/**
 * Shared helpers for the Express API: errors, auth helpers, small utils.
 * The data itself lives in demo-data.ts (an in-memory store seeded with demo
 * accounts/testimonials — restarting the server resets it).
 */
import type { Request } from 'express';
import { DEMO, platformPermissionsFor, type DemoFormQuestion, type DemoPlatformStaff, type DemoTenant, type DemoTestimonial, type DemoUser } from './demo-data';
import { resolveSessionToken, type Session } from './session-tokens';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message: string): HttpError => new HttpError(400, message);
export const forbidden = (message: string): HttpError => new HttpError(403, message);
export const unauthorized = (message: string): HttpError => new HttpError(401, message);
export const notFound = (message: string): HttpError => new HttpError(404, message);

/** Converts any thrown value into an { error } JSON response. */
export function errorResponse(status: number, message: string) {
  return { error: { message, statusCode: status } };
}

// ---------------------------------------------------------------------------
// Sessions (stateless signed bearer tokens — no cookies, survive restarts)
// ---------------------------------------------------------------------------

export { createSessionToken, tokenPrefix, type Session, type SessionKind } from './session-tokens';

/** Reads the `Authorization: Bearer <token>` header from a request. */
export function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

/**
 * Finds the session token on a request no matter which channel carried it:
 *  1. `Authorization: Bearer <token>` header (conventional),
 *  2. `x-session-token: <token>` header,
 *  3. `?session_token=<token>` query param.
 *
 * The extra channels exist because embedded preview environments can strip the
 * Authorization header (and other headers) between the browser and the
 * server; the URL always gets through, so a token in the query string is the
 * reliable last resort. Demo-only tokens — acceptable trade-off here.
 */
export function requestToken(req: Request): string | undefined {
  const bearer = bearerToken(req);
  if (bearer) return bearer;
  const alt = req.headers['x-session-token'];
  const altValue = Array.isArray(alt) ? alt[0] : alt;
  if (typeof altValue === 'string' && altValue.trim()) return altValue.trim();
  const query = req.query.session_token;
  if (typeof query === 'string' && query.trim()) return query.trim();
  return undefined;
}

export function sessionOf(req: Request): Session | null {
  return resolveSessionToken(requestToken(req));
}

// ---------------------------------------------------------------------------
// App-scoping helpers. A tenant owns many apps; every app-scoped route must
// verify the requested app belongs to the signed-in tenant before touching
// data, so companies can never read another company's apps/testimonials.
// ---------------------------------------------------------------------------

/** True when the appId belongs to the signed-in session's tenant. */
export function ownsApp(req: Request, appId: string): boolean {
  const tenant = tenantOfSession(req);
  return DEMO.appsOfTenant(tenant.id).some((a) => a.id === appId);
}

export function requireTenantOfApp(req: Request, appId: string): DemoTenant {
  const tenant = tenantOfSession(req);
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === appId)) throw notFound('App not found.');
  return tenant;
}

// ---------------------------------------------------------------------------
// Auth guards for handlers
// ---------------------------------------------------------------------------

export type SessionUser = { id: string; email: string; name: string; role: string };

function userLite(user: DemoUser | undefined): SessionUser | undefined {
  if (!user) return undefined;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Requires a signed-in company (tenant) user; returns the user or throws 401. */
export function requireCompany(req: Request): SessionUser {
  const session = sessionOf(req);
  if (!session || session.kind !== 'company') throw unauthorized('No active session.');
  const user = DEMO.companyUsers().find((u) => u.email === session.email);
  if (!user) throw unauthorized('No active session.');
  if (user.tenantId) {
    const member = DEMO.teamOfTenant(user.tenantId).find((m) => m.email === user.email);
    if (member && member.status === 'suspended') throw forbidden('This account has been suspended. Contact the workspace owner.');
  }
  return userLite(user)!;
}

/** Requires a signed-in platform session; throws 401 otherwise. */
export function requirePlatform(req: Request): void {
  const session = sessionOf(req);
  if (!session || session.kind !== 'platform') throw unauthorized('No active session.');
  const staff = DEMO.platformStaffByEmail(session.email);
  if (staff && staff.status === 'suspended') throw forbidden('This account has been suspended.');
}

/** Platform staff account behind the session (401 when the account vanished). */
export function platformStaffOfSession(req: Request): DemoPlatformStaff {
  requirePlatform(req);
  const staff = DEMO.platformStaffByEmail(sessionOf(req)!.email);
  if (!staff) throw unauthorized('No active session.');
  return staff;
}

/**
 * Requires one platform permission for the signed-in platform staff member.
 * Permissions come from the staff account's role template, and reads/writes
 * are independent grants, so console routes never accidentally rely on role
 * strings alone.
 */
export function requirePlatformPermission(req: Request, permission: string): DemoPlatformStaff {
  const staff = platformStaffOfSession(req);
  const perms = platformPermissionsFor(staff.role);
  if (!perms.includes(permission)) throw forbidden('You do not have permission to do that.');
  return staff;
}

/** Requires one of the given permissions for the signed-in company user. */
export function requirePermission(req: Request, permission: string): void {
  const user = DEMO.companyUsers().find((u) => u.email === requireCompany(req).email);
  if (!user) throw unauthorized('No active session.');
  const perms = DEMO.permissionsFor(user.role);
  if (!perms.includes(permission)) throw unauthorized('You do not have permission to do that.');
}

// ---------------------------------------------------------------------------
// Tenant / app scoping helpers
// ---------------------------------------------------------------------------

export function tenantOfSession(req: Request): DemoTenant {
  const email = requireCompany(req).email;
  const user = DEMO.companyUsers().find((u) => u.email === email);
  if (!user) throw unauthorized('No active session.');
  return DEMO.tenantForUser(user);
}

/** Default app of the session's tenant (used when a route has no appId). */
export function appOfSession(req: Request): string {
  const tenant = tenantOfSession(req);
  return DEMO.appsOfTenant(tenant.id)[0]?.id ?? '';
}

/**
 * Testimonials for an app of the session's tenant. Accessing any app the
 * session does not own is a 404 (not an empty 200): it must not even confirm
 * the app exists (DOC 6 §2.4 IDOR).
 */
export function rowsForApp(req: Request, appId: string): DemoTestimonial[] {
  requireTenantOfApp(req, appId);
  return DEMO.testimonialsOfApp(appId);
}

export function rowOr404(req: Request, appId: string, id: string): DemoTestimonial {
  const row = rowsForApp(req, appId).find((r) => r.id === id);
  if (!row) throw notFound('Testimonial not found.');
  return row;
}

/** Form inside an app the session's tenant owns (404 for foreign apps). */
export function formOr404(req: Request, appId: string, formId: string) {
  requireTenantOfApp(req, appId);
  const form = DEMO.findForm(appId, formId);
  if (!form) throw notFound('Form not found.');
  return form;
}

// ---------------------------------------------------------------------------
// Pagination + request parsing helpers
// ---------------------------------------------------------------------------

export interface Paging {
  status?: string;
  q?: string;
  perPage?: number;
  page?: number;
}

export function paginate<T>(rows: T[], query: Paging): T[] {
  const perPage = Math.min(Math.max(Number(query.perPage ?? 50) || 50, 1), 200);
  const page = Math.max(Number(query.page ?? 1) || 1, 1);
  return rows.slice((page - 1) * perPage, page * perPage);
}

/** Reads a query string value (single or repeated) as a plain string. */
export function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : undefined;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const MODERATION_ACTIONS: Record<string, DemoTestimonial['status']> = {
  approve: 'approved',
  reject: 'rejected',
  archive: 'archived',
};

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled-form'
  );
}

const QUESTION_TYPES = new Set(['text', 'rating', 'video', 'select']);

export interface RawQuestion {
  id?: string;
  type?: string;
  label?: string;
  required?: boolean;
  options?: string[];
}

export function normalizeQuestions(raw?: RawQuestion[]): DemoFormQuestion[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.slice(0, 20); // hard cap on questions per form (DOC 6 §2.9)
  return rows.map((q, idx) => ({
    id: (q.id ?? `q${idx + 1}`).toString().slice(0, 40),
    type: (QUESTION_TYPES.has(q.type ?? '') ? q.type : 'text') as DemoFormQuestion['type'],
    label: (q.label?.trim() || `Question ${idx + 1}`).slice(0, 200),
    required: Boolean(q.required),
    options: Array.isArray(q.options) ? q.options.map((o) => o.toString().slice(0, 80)).slice(0, 20) : undefined,
  }));
}
