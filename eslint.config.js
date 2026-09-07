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
    },
    {
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/only-throw-error': 'off',
            'unicorn/consistent-template-literal-escape': 'error',
            'unicorn/no-useless-iterator-to-array': 'error',
            'unicorn/prefer-simple-condition-first': 'error',
            'unicorn/switch-case-break-position': 'error',
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
