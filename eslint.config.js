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
