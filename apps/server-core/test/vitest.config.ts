/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globalSetup: ['test/setup'],
        // reflect-metadata must be loaded in every test-file context (the
        // globalSetup above runs in an isolated context): @peculiar/x509 v2
        // pulls in tsyringe, which asserts the Reflect polyfill is present at
        // import time. Production entry points already import it first.
        setupFiles: ['reflect-metadata'],
        include: ['test/unit/**/*.spec.ts'],
    },
    plugins: [swc.vite()],
});
