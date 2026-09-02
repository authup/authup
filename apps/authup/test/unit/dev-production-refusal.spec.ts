/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runCommand } from 'citty';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { defineCLIDevCommand } from '../../src/commands/dev.ts';

const nodeEnv = process.env.NODE_ENV;

afterEach(() => {
    // Assigning undefined to a process.env member stores the STRING
    // "undefined", which would then leak into every later test in this worker.
    if (typeof nodeEnv === 'undefined') {
        delete process.env.NODE_ENV;
    } else {
        process.env.NODE_ENV = nodeEnv;
    }
});

/**
 * The refusal is driven through citty the way the CLI drives it, not by
 * calling the guard function, because the thing worth pinning is that it is
 * WIRED and that it fires before anything is created. A guard nothing calls
 * is indistinguishable from no guard at all, and the whole point is that a
 * production image started with `dev` never reaches a vite dev server.
 */
describe('the dev command in a production environment', () => {
    it('refuses to start and names the command to run instead', async () => {
        process.env.NODE_ENV = 'production';

        await expect(runCommand(defineCLIDevCommand(), { rawArgs: [] }))
            .rejects
            .toThrow(/refuses to run with env set to production[\s\S]*Run `authup start` instead/);
    });
});
