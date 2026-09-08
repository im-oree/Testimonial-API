// Schema-driven PostgreSQL mapper factory (mirror of the Firestore factory).
// Each ./<entity>.mapper.ts is a declarative snake_case column → camelCase
// domain-field map. Rows come from the Prisma-generated types.

type PgKind =
  | 'string'
  | 'stringOrNull'
  | 'stringArray' // TEXT[]
  | 'stringArrayOrNull'
  | 'number' // INTEGER / SMALLINT
  | 'numberOrNull'
  | 'decimal' // NUMERIC → number
  | 'decimalOrNull' // NUMERIC → number | null
  | 'boolean'
  | 'date' // TIMESTAMPTZ
  | 'dateOrNull'
  | 'jsonStringMap' // JSONB Record<string,string>
  | 'jsonRecord' // JSONB Record<string,unknown>
  | 'jsonRecordOrNull' // JSONB Record<string,unknown> | null
  | 'jsonArray' // JSONB array
  | 'raw'; // anything (payload JsonValue passthrough)

export interface PgFieldSpec {
  domain: string;
  column: string;
  kind: PgKind;
}

const toDate = (v: unknown): Date | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return new Date(String(v));
};

const jsonValue = (v: unknown): unknown => {
  // Prisma returns Json as parsed JS values already.
  return v;
};

const convert = (kind: PgKind, v: unknown): unknown => {
  switch (kind) {
    case 'string':
      if (v === null || v === undefined) return '';
      if (typeof v === 'bigint') return v.toString();
      return String(v);
    case 'stringOrNull':
      if (v === null || v === undefined) return null;
      if (typeof v === 'bigint') return v.toString();
      return String(v);
    case 'stringArray':
      return Array.isArray(v) ? v.map(String) : [];
    case 'stringArrayOrNull':
      if (v === null || v === undefined) return null;
      return Array.isArray(v) ? v.map(String) : [];
    case 'number':
      return v === null || v === undefined ? 0 : Number(v);
    case 'numberOrNull':
      return v === null || v === undefined ? null : Number(v);
    case 'decimal':
      return v === null ? 0 : Number(v);
    case 'decimalOrNull':
      return v === null || v === undefined ? null : Number(v);
    case 'boolean':
      return Boolean(v ?? false);
    case 'date':
      return toDate(v);
    case 'dateOrNull':
      return toDate(v);
    case 'jsonStringMap': {
      const parsed = jsonValue(v);
      if (parsed === null || parsed === undefined) return {};
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed) as Record<string, string>;
        } catch {
          return { raw: parsed };
        }
      }
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = {};
        for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) out[k] = String(val);
        return out;
      }
      return {};
    }
    case 'jsonRecord': {
      const parsed = jsonValue(v);
      if (parsed === null || parsed === undefined) return {};
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      return {};
    }
    case 'jsonRecordOrNull': {
      const parsed = jsonValue(v);
      if (parsed === null || parsed === undefined) return null;
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      return null;
    }
    case 'jsonArray': {
      const parsed = jsonValue(v);
      if (parsed === null || parsed === undefined) return [];
      if (Array.isArray(parsed)) return parsed;
      return [];
    }
    default:
      return v;
  }
};

export interface PgMappers<T> {
  toDomain(row: Record<string, unknown>): T;
  toPersistence(partial: Partial<T>): Record<string, unknown>;
}

export function createPgMappers<T>(specs: PgFieldSpec[]): PgMappers<T> {
  return {
    toDomain(row) {
      const out: Record<string, unknown> = {};
      for (const spec of specs) {
        out[spec.domain] = convert(spec.kind, row[spec.column]);
      }
      return out as T;
    },
    toPersistence(partial) {
      const rec = partial as unknown as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const spec of specs) {
        const v = rec[spec.domain];
        if (v === undefined) continue;
        switch (spec.kind) {
          case 'date':
          case 'dateOrNull': {
            out[spec.column] = v instanceof Date ? v : v === null ? null : new Date(String(v));
            break;
          }
          case 'jsonStringMap':
          case 'jsonRecord':
          case 'jsonRecordOrNull':
          case 'jsonArray':
          case 'raw':
            out[spec.column] = v as never;
            break;
          default:
            out[spec.column] = v;
        }
      }
      return out;
    },
  };
}
