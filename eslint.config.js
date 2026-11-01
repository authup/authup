/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import eslintConfig from '@tada5hi/eslint-config';

export default eslintConfig(
    {
        typescript: true,
        vue: true,
        // Above the shared defaults (40000 per file, 60000 for what CLAUDE.md
        // loads) because the core docs are still larger. Lower these as the
        // docs shrink; never raise them to make room.
        agentDocs: {
            maxBytes: 60000,
            importMaxBytes: 180000,
        },
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx,vue}'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/only-throw-error': 'off',
            // Authup keeps domain types beside their implementations and exposes
            // compatibility entry points without moving or duplicating them.
            '@tada5hi/type-declaration-location': 'off',
            '@tada5hi/no-reexport-shims': 'off',
            // Public interfaces and third-party module augmentations retain their names.
            '@typescript-eslint/naming-convention': 'off',
            'unicorn/consistent-template-literal-escape': 'error',
            'unicorn/no-useless-iterator-to-array': 'error',
            'unicorn/prefer-simple-condition-first': 'error',
            'unicorn/switch-case-break-position': 'error',
        },
    },
    {
        files: [
            'apps/client-*/**',
            'packages/access/**',
            'packages/client-*/**',
            'packages/core-*/**',
            'packages/errors/**',
            'packages/kit/**',
            'packages/specs/**',
        ],
        rules: {
            // The Node runtime floor does not raise browser API requirements.
            'unicorn/prefer-error-is-error': 'off',
            'unicorn/prefer-promise-try': 'off',
            'unicorn/prefer-regexp-escape': 'off',
            'unicorn/prefer-uint8array-base64': 'off',
            'unicorn/prefer-uint8array-hex': 'off',
        },
    },
    {
        files: ['**/test/**'],
        rules: {
            // Component harnesses and stubs intentionally share test files.
            'vue/one-component-per-file': 'off',
        },
    },
    {
        files: ['apps/server-core/scripts/*.mjs'],
        rules: {
            // These maintenance scripts report their results on stdout/stderr.
            'no-console': 'off',
        },
    },
    {
        files: ['apps/server-core/src/app/modules/**/repositories/**/*.ts'],
        ignores: ['apps/server-core/src/app/modules/database/repositories/query.ts'],
        rules: {
            'no-restricted-properties': ['error', {
                property: 'getManyAndCount',
                message: 'Read collections through fetchMany (app/modules/database/repositories/query.ts): it enforces the field visibility conditions, a bare getManyAndCount ships the gated columns (#3329).',
            }],
        },
    },
    {
        files: ['apps/server-core/src/**/*.ts'],
        ignores: [
            // per-realm pre-evaluation over the realms a check request names
            'apps/server-core/src/core/authorization/check.ts',
            // caller-supplied check data, evaluated or pre-evaluated as given
            'apps/server-core/src/core/identity/permission/checker/service.ts',
        ],
        rules: {
            'no-restricted-syntax': ['error', {
                selector: 'Property[computed=true][key.object.name="BuiltInPolicyType"][key.property.name="REALM_MATCH"]',
                message: 'Pass the record realm to evaluateRecord / reachesRecord (@authup/access) instead of a realmMatch policy data key.',
            }, {
                selector: 'MemberExpression[computed=true][property.object.name="BuiltInPolicyType"][property.property.name="REALM_MATCH"]',
                message: 'Pass the record realm to evaluateRecord / reachesRecord (@authup/access) instead of a realmMatch policy data key.',
            }, {
                selector: 'CallExpression[callee.property.name="set"] > MemberExpression.arguments:first-child[object.name="BuiltInPolicyType"][property.name="REALM_MATCH"]',
                message: 'Pass the record realm to evaluateRecord / reachesRecord (@authup/access) instead of a realmMatch policy data key.',
            }, {
                selector: 'Property[key.name="realmMatch"], Property[key.value="realmMatch"]',
                message: 'Pass the record realm to evaluateRecord / reachesRecord (@authup/access) instead of a realmMatch policy data key.',
            }, {
                selector: 'CallExpression[callee.property.name="set"] > Literal.arguments:first-child[value="realmMatch"]',
                message: 'Pass the record realm to evaluateRecord / reachesRecord (@authup/access) instead of a realmMatch policy data key.',
            }],
        },
    },
    {
        files: ['**/*.vue'],
        languageOptions: { globals: { NodeJS: 'readonly' } },
    },
    {
        ignores: [
            '**/dist/**',
            '**/.nuxt/**',
            '**/.output/**',
            '**/public/assets/**',
            'src/.vitepress/cache/**',
        ],
    },
);
