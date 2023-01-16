/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import vue from 'rollup-plugin-vue';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import pkg from './package.json' assert { type: 'json' };

function buildConfig(config) {
    return {
        input: 'src/entry.ts',
        ...config,
        plugins: [
            replace({
                'process.env.NODE_ENV': JSON.stringify('production'),
                preventAssignment: true,
            }),
            postcss({
                extract: true,
            }),
            vue(),
            resolve({
                extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
            }),
            commonjs(),
            esbuild({
                tsconfig: 'tsconfig.build.json'
            }),
            ...(config.plugins ? config.plugins : []),
        ],

    };
}

const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
];

export default [
    buildConfig({
        input: 'src/index.ts',
        external,
        output: [
            {
                file: pkg.module,
                format: 'esm',
                exports: 'named',
                assetFileNames: '[name]-[hash][extname]',
                sourcemap: true
            },
        ],
    }),
    buildConfig({
        input: 'src/index.ts',
        external,
        output: [
            {
                compact: true,
                file: pkg.main,
                format: 'cjs',
                exports: 'named',
                footer: 'module.exports = Object.assign(exports.default, exports);',
                assetFileNames: '[name]-[hash][extname]',
                sourcemap: true
            },
        ],
    }),
];
