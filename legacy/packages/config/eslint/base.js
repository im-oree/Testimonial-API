// Shared base ESLint config — extends: ["../../packages/config/eslint/base.js"]
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'repo-boundaries'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/build/**', '**/.turbo/**'],
  rules: {
    // --- Architecture boundaries (docs/01-skeleton.md §11) ---
    'repo-boundaries/no-db-driver-outside-infra': 'error',
    'repo-boundaries/no-db-adapter-outside-db-infra': 'error',
    'repo-boundaries/no-ai-adapter-outside-ai-infra': 'error',

    // --- Doc 6 §1.2: $queryRawUnsafe is globally banned (SQL injection) ---
    // The only sanctioned escape from the ban is an explicit
    // `// eslint-disable-next-line no-restricted-syntax` comment carrying a
    // security-review justification + ticket reference (see prisma.client.ts).
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
        message:
          "$queryRawUnsafe is globally banned (Doc 6 §1.1/§1.2). Use the Prisma query builder or $queryRaw with a Prisma.sql tagged template. Any unavoidable use requires security review + an explicit eslint-disable with justification and ticket.",
      },
    ],

    // --- Sanity ---
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': 'allow-with-description' }],
  },
  overrides: [
    {
      // Doc 6 §1.1: no raw SQL anywhere in Postgres repository code. Every
      // repository method must use the Prisma query builder — never string
      // concatenation, never `sql` tagged templates, never bare $queryRaw.
      // Queries that genuinely need raw SQL live outside repositories/ (e.g.
      // a dedicated raw-query module) and use Prisma.sql exclusively (§1.2).
      files: ['**/postgres/repositories/**/*.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "TaggedTemplateExpression[tag.name='sql']",
            message:
              'Raw SQL (sql`...`) is forbidden in repositories (Doc 6 §1.1). Use the Prisma query builder.',
          },
          {
            // Prisma.sql tagged templates are the §1.2 escape hatch and belong
            // in a dedicated raw-query module, never inside repositories.
            selector: "TaggedTemplateExpression[tag.object.name='Prisma'][tag.property.name='sql']",
            message:
              'Raw SQL (Prisma.sql`...`) is forbidden in repositories (Doc 6 §1.1). Use the Prisma query builder; queries needing Prisma.sql live in a raw-query module outside repositories/ (§1.2).',
          },
          {
            selector: "CallExpression[callee.property.name='$queryRaw']",
            message:
              'Use $queryRaw with a Prisma.sql tagged template ONLY, never string interpolation — and never inside repositories (Doc 6 §1.1/§1.2).',
          },
          {
            selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
            message:
              "$queryRawUnsafe is globally banned (Doc 6 §1.1/§1.2). Use the Prisma query builder or $queryRaw with a Prisma.sql tagged template. Any unavoidable use requires security review + an explicit eslint-disable with justification and ticket.",
          },
        ],
      },
    },
  ],
};
