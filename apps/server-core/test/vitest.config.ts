/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// The sqlite run isolates parallel workers via per-worker copies of the
// provisioned template database (see test/app/database.ts). The
// mysql/postgres runs have no equivalent (every worker shares the one
// server database), so their spec files must not run concurrently:
// concurrent files corrupt each other's rows and the suite fails on a
// different spec each run (#3405).
const databaseType = process.env.DB_TYPE;
const usesSharedServerDatabase = !!databaseType &&
    databaseType !== 'better-sqlite3' &&
    databaseType !== 'sqlite';

export default defineConfig({
    test: {
        globalSetup: ['test/setup'],
        // reflect-metadata must be loaded in every test-file context (the
        // globalSetup above runs in an isolated context): @peculiar/x509 v2
        // pulls in tsyringe, which asserts the Reflect polyfill is present at
        // import time. Production entry points already import it first.
        setupFiles: ['reflect-metadata'],
        include: ['test/unit/**/*.spec.ts'],
        fileParallelism: !usesSharedServerDatabase,
        // A shared-server run is structurally slower than the sqlite one: every
        // spec file contends for the one server database and, per the comment
        // above, they cannot run concurrently. Heavy specs (a full provisioning
        // sync) sit just under vitest's 5s default there and tip over on a
        // loaded CI runner, so the shared-server runs get a wider budget.
        ...(usesSharedServerDatabase ? { testTimeout: 30_000 } : {}),
    },
    plugins: [swc.vite()],
});
