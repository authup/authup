/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createCLIEntryPointCommand } from '../../src/module.ts';

type EntryPointCommand = Awaited<ReturnType<typeof createCLIEntryPointCommand>>;

function createSetupContext(command: EntryPointCommand, positionals: string[]) {
    return {
        rawArgs: positionals,
        args: {
            _: positionals,
            configDirectory: '',
            configFile: '',
        },
        cmd: command,
    };
}

describe('createCLIEntryPointCommand', () => {
    it('carries the authup meta, the four role commands and config', async () => {
        const command = await createCLIEntryPointCommand();
        expect(command.meta).toMatchObject({ name: 'authup' });
        expect(Object.keys(command.subCommands ?? {}).sort())
            .toEqual(['config', 'healthcheck', 'migration', 'start', 'worker']);
    });

    it('refuses stray positionals on start and worker but not on migration', async () => {
        const command = await createCLIEntryPointCommand();

        expect(() => command.setup?.(createSetupContext(command, ['start', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['worker', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['migration', 'run'])))
            .not.toThrow();
    });
});
