/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import resolve from '@rollup/plugin-node-resolve';
import swc from '@rollup/plugin-swc';
import vue from '@vitejs/plugin-vue';
import esmShim from '@rollup/plugin-esm-shim';
import postcss from 'rollup-plugin-postcss';

import { builtinModules } from 'node:module';

const extensions = [
    '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts',
];

export function createConfig(
    {
        pkg,
        pluginsPre = [],
        pluginsPost = [],
        external = [],
        defaultExport = false,
    },
) {
    external = Object.keys(pkg.dependencies || {})
        .concat(Object.keys(pkg.peerDependencies || {}))
        .concat(builtinModules)
        .concat(external);

    const output = [];
    if (pkg.main) {
        output.push({
            format: 'cjs',
            file: pkg.main,
            exports: 'named',
            ...(defaultExport ? { footer: 'module.exports = Object.assign(exports.default, exports);' } : {}),
            sourcemap: true,
        });
    }

    if (pkg.module) {
        output.push({
            format: 'es',
            file: pkg.module,
            sourcemap: true,
        });
    }

    return {
        input: 'src/index.ts',
        external,
        output,
        plugins: [
            ...pluginsPre,

            // Allows node_modules resolution
            resolve({ extensions }),

            esmShim(),

            vue(),

            postcss({
                extract: true,
            }),

            // Compile TypeScript/JavaScript files
            swc(),

            ...pluginsPost,
        ],
    };
}
