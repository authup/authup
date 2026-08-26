/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { assertNoStrayPositionals } from '@authup/server-core';
import { describe, expect, it } from 'vitest';
import { createCLIEntryPointCommand } from '../../src/module.ts';

describe('createCLIEntryPointCommand', () => {
    it('carries the authup meta and the four role commands', async () => {
        const command = await createCLIEntryPointCommand();
        expect(command.meta).toMatchObject({ name: 'authup' });
        expect(Object.keys(command.subCommands ?? {}).sort())
            .toEqual(['healthcheck', 'migration', 'start', 'worker']);
    });

    it('refuses stray positionals on start and worker', () => {
        expect(() => assertNoStrayPositionals({ _: ['start', 'server.core'] }))
            .toThrow(/Unexpected argument/);
        expect(() => assertNoStrayPositionals({ _: ['migration', 'run'] }))
            .not.toThrow();
    });
});
