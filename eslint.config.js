/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import eslintConfig from '@tada5hi/eslint-config';

export default eslintConfig(
    { typescript: true, vue: true },
    {
        rules: {
            'class-methods-use-this': 'off',
            'no-shadow': 'off',
            'no-use-before-define': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
            }],
            'import-x/extensions': 'off',
            'import-x/no-extraneous-dependencies': 'off',
        },
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
