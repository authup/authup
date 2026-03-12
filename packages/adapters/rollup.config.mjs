/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import resolve from '@rollup/plugin-node-resolve';
import swc from '@rollup/plugin-swc';

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
    },
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
                format: 'es',
                file: pkg.module,
                sourcemap: true,
            },
        ],
        plugins: [
            ...pluginsPre,

            // Allows node_modules resolution
            resolve({ extensions }),

            // Compile TypeScript/JavaScript files
            swc(),

            ...pluginsPost,
        ],
    };
}
