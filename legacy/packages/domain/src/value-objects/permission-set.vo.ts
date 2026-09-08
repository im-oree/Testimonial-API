/**
 * Permission-set value object — the primitive the RBAC engine (Doc 2) is built on.
 *
 * Permissions are dot-strings: "tenant.testimonials.approve", "platform.tenants.view", etc.
 * A subject's EFFECTIVE permission set = roleDefaults ∪ overrides.
 * Wildcards ("tenant.*", "*.read") are honored by `has()`.
 */
export class PermissionSet {
  private readonly set: ReadonlySet<string>;

  private constructor(set: ReadonlySet<string>) {
    this.set = set;
  }

  static empty(): PermissionSet {
    return new PermissionSet(new Set());
  }

  static of(...permissions: string[]): PermissionSet {
    return new PermissionSet(new Set(permissions.filter(Boolean)));
  }

  /** effective = roleDefaults ∪ explicitOverrides (never subtractive in v1 — Doc 2 may add deny-list). */
  static merge(roleDefaults: string[], explicitOverrides: string[]): PermissionSet {
    return PermissionSet.of(...roleDefaults, ...explicitOverrides);
  }

  add(permission: string): PermissionSet {
    const next = new Set(this.set);
    next.add(permission);
    return new PermissionSet(next);
  }

  union(other: PermissionSet): PermissionSet {
    return new PermissionSet(new Set([...this.set, ...other.set]));
  }

  /** Exact or wildcard match. "tenant.testimonials.*" matches "tenant.testimonials.approve". */
  has(permission: string): boolean {
    if (this.set.has(permission)) return true;
    const segments = permission.split('.');
    // Try progressively broader wildcards: a.b.c → a.b.* → a.* → *
    for (let i = segments.length - 1; i >= 0; i--) {
      const wildcard = [...segments.slice(0, i), '*'].join('.');
      if (this.set.has(wildcard)) return true;
    }
    return false;
  }

  /** True if every required permission is present. */
  hasAll(required: string[]): boolean {
    return required.every((p) => this.has(p));
  }

  /** True if at least one of the given permissions is present. */
  hasAny(candidates: string[]): boolean {
    return candidates.some((p) => this.has(p));
  }

  toArray(): string[] {
    return [...this.set].sort();
  }

  get size(): number {
    return this.set.size;
  }
}
