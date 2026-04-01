/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';

import { createConfig } from '../../rollup.config.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), { encoding: 'utf-8' }));
const indexFile = createConfig({
    pkg,
    external: [
        'body-parser',
        'qs',
        'ldapjs',
    ],
});

const cliFile = {
    ...indexFile,
    input: 'src/cli/index.ts',
    output: [
        {
            format: 'es',
            file: './dist/cli.mjs',
            sourcemap: true,
        },
    ],
};

export default [
    indexFile,
    cliFile,
];
