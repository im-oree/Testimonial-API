'use strict';

// ============================================================
// eslint-plugin-repo-boundaries
// Enforces the architecture rules from docs/01-skeleton.md §11:
//
//  1) no-db-driver-outside-infra
//     `firebase-admin`, `@prisma/client`, `prisma`, `ioredis`,
//     `bullmq`, `@google-cloud/*` may only be imported by files
//     under **/infrastructure/**. Controllers, services and the
//     domain must never reach a storage driver — they depend on
//     repository interfaces (ports) and DI tokens only.
//
//  2) no-db-adapter-outside-db-infra
//     Deep imports of the Firestore/Postgres adapter internals
//     (`.../infrastructure/database/firestore|postgres/...`) are
//     only allowed from within infrastructure/database itself.
//     The DI container (DatabaseModule) is the only bridge. Test
//     files (test/ dirs and *.spec.ts) are exempt — the Doc 6 §1.7
//     SQLi suite drives the Postgres repository with a fake Prisma
//     delegate, and no live-DB test may reach an adapter.
//
//  3) no-ai-adapter-outside-ai-infra (Doc 2 Additive A)
//     Deep imports of AI provider adapters/KMS
//     (`.../infrastructure/ai/adapters|kms/...`) are only allowed
//     from within infrastructure/ai. Business engines must call
//     AiOrchestratorService.executeTask() — never an adapter. Test
//     files (test/ dirs and *.spec.ts) are exempt so routing/registry
//     suites can drive the MockAdapter directly.
//
// CI fails the build on any violation (npm run lint).
// ============================================================

const DB_DRIVERS = [
  'firebase-admin',
  '@prisma/client',
  'prisma',
  'ioredis',
  'bullmq',
  'firebase',
  /^@google-cloud\//,
];

function matchesDriver(specifier) {
  return DB_DRIVERS.some((d) => (typeof d === 'string' ? specifier === d : d.test(specifier)));
}

const isInsideInfrastructure = (filePath = '') => filePath.split(/[\\/]/).includes('infrastructure');
const isInsideDbInfrastructure = (filePath = '') => /[\\/]infrastructure[\\/]database[\\/]/.test(filePath);
const targetsDbAdapter = (source) => /infrastructure[\\/]database[\\/](firestore|postgres)[\\/]/.test(source);

// --- AI adapter boundary (Additive A) ---
const path = require('path');
const isInsideAiInfrastructure = (filePath = '') => /[\\/]infrastructure[\\/]ai([\\/]|$)/.test(filePath);
const isTestFile = (filePath = '') => /[\\/]test[\\/]/.test(filePath) || /\.spec\.ts$/.test(filePath);
/** Resolve a specifier to an absolute path when it is relative. */
function resolveTarget(filename, specifier) {
  if (specifier.startsWith('.')) {
    return path.resolve(path.dirname(filename), specifier);
  }
  return specifier;
}
const targetsAiInternal = (target) =>
  /[\\/]ai[\\/](adapters|kms)[\\/]/.test(target) || /[\\/]ai[\\/](adapters|kms)([\\/]|$)/.test(target);

function extractImportSources(node) {
  const sources = [];
  if (node.type === 'ImportDeclaration') {
    sources.push(node.source.value);
  } else if (node.type === 'CallExpression' && node.callee.name === 'require' && node.arguments[0]) {
    sources.push(node.arguments[0].value);
  } else if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
    if (node.source) sources.push(node.source.value);
  }
  return sources;
}

module.exports = {
  rules: {
    'no-db-driver-outside-infra': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Storage drivers (firebase-admin, @prisma/client, ioredis, bullmq, ...) may only be imported inside infrastructure/',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename();
        if (isInsideInfrastructure(filename)) return {};
        return {
          ImportDeclaration(node) {
            for (const source of extractImportSources(node)) {
              if (matchesDriver(source)) {
                context.report({
                  node,
                  message: `Storage driver "${source}" must only be imported inside infrastructure/ (found in ${filename}). Use repository interfaces + DI tokens instead.`,
                });
              }
            }
          },
          CallExpression(node) {
            for (const source of extractImportSources(node)) {
              if (matchesDriver(source)) {
                context.report({
                  node,
                  message: `Storage driver "${source}" must only be imported inside infrastructure/ (found in ${filename}). Use repository interfaces + DI tokens instead.`,
                });
              }
            }
          },
          ExportNamedDeclaration(node) {
            for (const source of extractImportSources(node)) {
              if (matchesDriver(source)) {
                context.report({
                  node,
                  message: `Storage driver "${source}" must only be imported inside infrastructure/ (found in ${filename}).`,
                });
              }
            }
          },
          ExportAllDeclaration(node) {
            for (const source of extractImportSources(node)) {
              if (matchesDriver(source)) {
                context.report({
                  node,
                  message: `Storage driver "${source}" must only be imported inside infrastructure/ (found in ${filename}).`,
                });
              }
            }
          },
        };
      },
    },

    'no-ai-adapter-outside-ai-infra': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Deep imports of AI provider adapters / KMS are only allowed from within infrastructure/ai (business code must use AiOrchestratorService).',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename();
        if (isInsideAiInfrastructure(filename) || isTestFile(filename)) return {};
        function reportFor(node, source) {
          const target = resolveTarget(filename, source);
          if (targetsAiInternal(target)) {
            context.report({
              node,
              message: `Direct import of AI internals ("${source}") is not allowed outside infrastructure/ai (${filename}). Use AiOrchestratorService (DI) instead.`,
            });
          }
        }
        return {
          ImportDeclaration(node) {
            for (const source of extractImportSources(node)) reportFor(node, source);
          },
          ExportNamedDeclaration(node) {
            for (const source of extractImportSources(node)) reportFor(node, source);
          },
          ExportAllDeclaration(node) {
            for (const source of extractImportSources(node)) reportFor(node, source);
          },
        };
      },
    },

    'no-db-adapter-outside-db-infra': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Deep imports of Firestore/Postgres adapter internals are only allowed from within infrastructure/database',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename();
        if (isInsideDbInfrastructure(filename) || isTestFile(filename)) return {};
        return {
          ImportDeclaration(node) {
            for (const source of extractImportSources(node)) {
              if (targetsDbAdapter(source)) {
                context.report({
                  node,
                  message: `Direct import of DB adapter internals ("${source}") is not allowed outside infrastructure/database (${filename}). Bind repositories through DatabaseModule DI tokens.`,
                });
              }
            }
          },
          ExportNamedDeclaration(node) {
            for (const source of extractImportSources(node)) {
              if (targetsDbAdapter(source)) {
                context.report({
                  node,
                  message: `Direct import of DB adapter internals ("${source}") is not allowed outside infrastructure/database (${filename}).`,
                });
              }
            }
          },
          ExportAllDeclaration(node) {
            for (const source of extractImportSources(node)) {
              if (targetsDbAdapter(source)) {
                context.report({
                  node,
                  message: `Direct import of DB adapter internals ("${source}") is not allowed outside infrastructure/database (${filename}).`,
                });
              }
            }
          },
        };
      },
    },
  },
};
