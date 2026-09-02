/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type * as ServerCore from '@authup/server-core';
import type { ArgsDef, CommandDef } from 'citty';
import { parseArgs, runCommand } from 'citty';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type * as ConsoleModule from '../../src/console/index.ts';
import { createCLIEntryPointCommand } from '../../src/module.ts';

// The refusal cases below must fail on a sentinel, never by booting a
// server inside the test worker, should one of the hand-written refusals
// in `start` regress. Reading the configuration is the first step of every
// boot path, so it is what a missed refusal would reach next.
vi.mock('@authup/server-core', async (importOriginal) => ({
    ...await importOriginal<typeof ServerCore>(),
    readConfig: () => {
        throw new Error('readConfig must not be reached from this spec.');
    },
}));

vi.mock('../../src/console/index.ts', async (importOriginal) => ({
    ...await importOriginal<typeof ConsoleModule>(),
    readConsoleConfigs: () => {
        throw new Error('readConsoleConfigs must not be reached from this spec.');
    },
}));

type EntryPointCommand = Awaited<ReturnType<typeof createCLIEntryPointCommand>>;

function createSetupContext(command: EntryPointCommand, positionals: string[]) {
    return {
        rawArgs: positionals,
        args: {
            _: positionals,
            configDirectory: '',
            configFile: '',
            worker: false,
        },
        cmd: command,
    };
}

async function resolveSubCommand(command: EntryPointCommand, name: string) : Promise<CommandDef> {
    const subCommands = await (typeof command.subCommands === 'function' ?
        command.subCommands() :
        command.subCommands);

    const subCommand = subCommands?.[name];
    if (!subCommand) {
        throw new Error(`The entry point declares no "${name}" command.`);
    }

    return typeof subCommand === 'function' ? subCommand() : subCommand;
}

async function resolveArgsDef(command: CommandDef) : Promise<ArgsDef> {
    const args = await (typeof command.args === 'function' ? command.args() : command.args);

    return args ?? {};
}

describe('createCLIEntryPointCommand', () => {
    it('carries the authup meta and every command', async () => {
        const command = await createCLIEntryPointCommand();
        expect(command.meta).toMatchObject({ name: 'authup' });
        expect(Object.keys(command.subCommands ?? {}).sort())
            .toEqual(['config', 'dev', 'healthcheck', 'migration', 'start']);
    });

    it('refuses a stray positional on dev but leaves the roles and the migration operation alone', async () => {
        const command = await createCLIEntryPointCommand();

        expect(() => command.setup?.(createSetupContext(command, ['dev', 'server.core'])))
            .toThrow(/Unexpected argument/);

        for (const positionals of [
            ['start', 'core'],
            ['start', 'worker'],
            ['start', 'console', 'admin'],
            ['migration', 'run'],
        ]) {
            expect(() => command.setup?.(createSetupContext(command, positionals)))
                .not.toThrow();
        }
    });

    describe('start', () => {
        it('declares the config flags itself, so a flag after the role is not read as a positional', async () => {
            const command = await createCLIEntryPointCommand();
            const start = await resolveSubCommand(command, 'start');

            const args = parseArgs(['worker', '--configDirectory', '/x'], await resolveArgsDef(start));

            expect(args._).toEqual(['worker']);
            expect(args.configDirectory).toEqual('/x');
        });

        it('renders the role and the console name as choices', async () => {
            const command = await createCLIEntryPointCommand();
            const args = await resolveArgsDef(await resolveSubCommand(command, 'start'));

            expect(args.role).toMatchObject({ type: 'positional', valueHint: 'core|worker|console' });
            expect(args.name).toMatchObject({ type: 'positional', valueHint: 'admin|account|auth' });
        });

        // Every case below is refused before any configuration is read and
        // before anything listens; the sentinels at the top of the file are
        // what a regressed refusal hits instead of a listener. A bare
        // `start`, `start core`, `start worker` or `start console` boots a
        // real server and must never appear in this file.
        it.each([
            [['start', 'server.core'], /Unknown role/],
            [['start', 'core', 'admin'], /only the console role/],
            [['start', 'console', 'bogus'], /Unknown console/],
            [['start', 'console', 'admin', 'extra'], /Unexpected argument/],
            [['start', '--worker'], /retired/],
            [['--worker', 'start'], /retired/],
            [['--worker', 'start', 'core'], /retired/],
        ])('refuses %j', async (rawArgs, message) => {
            const command = await createCLIEntryPointCommand();

            await expect(runCommand(command, { rawArgs })).rejects.toThrow(message);
        });
    });
});
