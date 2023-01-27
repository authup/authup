/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

import { merge } from 'smob';

import { builtinModules } from 'node:module';
import { transform } from "@swc/core";

const extensions = [
    '.js', '.mjs', '.cjs', '.ts'
];

const swcOptions = {
    jsc: {
        target: 'es2020',
        parser: {
            syntax: 'typescript',
            decorators: true
        },
        transform: {
            decoratorMetadata: true,
            legacyDecorator: true
        },
        loose: true
    },
    sourceMaps: true
}

export function createConfig(
    {
        pkg,
        pluginsPre = [],
        pluginsPost = [],
        external = [],
        defaultExport = false,
        swc = {}
    }
) {
    external = Object.keys(pkg.dependencies || {})
        .concat(Object.keys(pkg.peerDependencies || {}))
        .concat(builtinModules)
        .concat(external);

    return {
        input: 'src/index.ts',
        external,
        output: [
            {
                format: 'cjs',
                file: pkg.main,
                exports: 'named',
                ...(defaultExport ? { footer: 'module.exports = Object.assign(exports.default, exports);' } : {}),
                sourcemap: true
            },
            {
                format: 'es',
                file: pkg.module,
                sourcemap: true
            }
        ],
        plugins: [
            ...pluginsPre,

            // Allows node_modules resolution
            resolve({ extensions}),

            // Allow bundling cjs modules. Rollup doesn't understand cjs
            commonjs(),

            // Compile TypeScript/JavaScript files
            {
                name: 'swc',
                transform(code) {
                    return transform(code, merge({}, swc, swcOptions));
                }
            },

            ...pluginsPost
        ]
    };
}
