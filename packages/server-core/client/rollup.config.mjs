/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import resolve from '@rollup/plugin-node-resolve';
import swc from '@rollup/plugin-swc';
import replace from '@rollup/plugin-replace';
import vue from '@vitejs/plugin-vue';
import postcss from 'rollup-plugin-postcss';

import postcssImport from 'postcss-import';
import postcssURL from 'postcss-url';

export default {
    input: 'client/src/index.js',
    external: [],
    output: [
        {
            format: 'es',
            file: 'public/client.js',
        },
    ],
    plugins: [
        // Allows node_modules resolution
        resolve({ browser: true }),

        vue(),

        postcss({
            extract: true,
            plugins: [
                postcssImport(),
                postcssURL({
                    url: 'inline',
                }),
            ],
        }),

        replace({
            'process.env.NODE_ENV': JSON.stringify('development'),
        }),

        // Compile TypeScript/JavaScript files
        swc(),
    ],
};
