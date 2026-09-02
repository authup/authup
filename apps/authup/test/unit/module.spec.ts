/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseArgs } from 'citty';
import { describe, expect, it } from 'vitest';
import { createCLIEntryPointCommand } from '../../src/module.ts';

type EntryPointCommand = Awaited<ReturnType<typeof createCLIEntryPointCommand>>;

function resolveArgsDef(command: EntryPointCommand) {
    if (!command.args || typeof command.args === 'function' || command.args instanceof Promise) {
        throw new Error('The entry point declares its args statically.');
    }

    return command.args;
}

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
    it('carries the authup meta and every role command', async () => {
        const command = await createCLIEntryPointCommand();
        expect(command.meta).toMatchObject({ name: 'authup' });
        expect(Object.keys(command.subCommands ?? {}).sort())
            .toEqual(['config', 'console', 'core', 'dev', 'healthcheck', 'migration', 'start']);
    });

    it('does not read --worker as a stray positional', async () => {
        const command = await createCLIEntryPointCommand();

        for (const rawArgs of [['start', '--worker'], ['core', '--worker']]) {
            const args = parseArgs<ReturnType<typeof resolveArgsDef>>(rawArgs, resolveArgsDef(command));
            expect(args._).toEqual([rawArgs[0]]);
            expect(() => command.setup?.({
                rawArgs, 
                args, 
                cmd: command, 
            })).not.toThrow();
        }
    });

    it('refuses stray positionals on the listener roles but not on migration or console', async () => {
        const command = await createCLIEntryPointCommand();

        expect(() => command.setup?.(createSetupContext(command, ['start', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['core', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['dev', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['migration', 'run'])))
            .not.toThrow();
        expect(() => command.setup?.(createSetupContext(command, ['console', 'admin'])))
            .not.toThrow();
    });
});
