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
import postcss from 'rollup-plugin-postcss';
import { transform } from "@swc/core";
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
            {
                name: 'swc',
                transform(code) {
                    return transform(code, {
                        jsc: {
                            target: 'es2020',
                            parser: {
                                syntax: 'typescript',
                                decorators: true,
                                jsx: true
                            },
                            transform: {
                                decoratorMetadata: true,
                                legacyDecorator: true
                            },
                            loose: true
                        },
                        sourceMaps: true
                    });
                }
            },
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
