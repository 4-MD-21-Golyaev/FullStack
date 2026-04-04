import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Upgrades and additions on top of nextVitals + nextTs
  {
    rules: {
      // Upgrade warnings to errors
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'react-hooks/exhaustive-deps': 'error',

      // New: enforce explicit `import type` for type-only imports
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
    },
  },

  // FSD: shared/ui must not import from upper layers
  {
    files: ['src/shared/ui/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/widgets/*'],  message: 'shared/ui cannot import from widgets'  },
          { group: ['@/entities/*'], message: 'shared/ui cannot import from entities' },
          { group: ['@/features/*'], message: 'shared/ui cannot import from features' },
          { group: ['@/app/*'],      message: 'shared/ui cannot import from app'      },
        ],
      }],
    },
  },

  // FSD: within shared/ui, cross-group imports must use relative paths — not the barrel
  {
    files: ['src/shared/ui/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/shared/ui', '@/shared/ui/*'],
            message: 'Within shared/ui use relative paths (../../), not the barrel',
          },
        ],
      }],
    },
  },

  // FSD: domain is pure TypeScript — no outer-layer imports
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/application/*'],   message: 'domain must not import from application'   },
          { group: ['@/infrastructure/*'], message: 'domain must not import from infrastructure' },
          { group: ['@/app/*'],            message: 'domain must not import from app'            },
        ],
      }],
    },
  },

  // FSD: application layer must not reach into infrastructure or HTTP
  {
    files: ['src/application/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/infrastructure/*'], message: 'application must not import from infrastructure' },
          { group: ['@/app/*'],            message: 'application must not import from app'            },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
