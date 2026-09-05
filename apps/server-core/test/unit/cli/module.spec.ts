/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseArgs, runCommand } from 'citty';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { CLI_CONFIG_ARGS, assertNoStrayPositionals } from '../../../src/cli/commands/config';
import { defineCLIMigrationCommand } from '../../../src/cli/commands/migration';
import { createCLIEntryPointCommand } from '../../../src/cli/module';
import { PACKAGE_PATH } from '../../../src/path';

// A regressed operation guard must fail here, not against a database.
vi.mock('typeorm-extension', async (importOriginal) => ({
    ...await importOriginal<Record<string, unknown>>(),
    checkDatabase: () => {
        throw new Error('checkDatabase must not be reached from this spec.');
    },
    dropDatabase: () => {
        throw new Error('dropDatabase must not be reached from this spec.');
    },
}));

describe('src/cli/module', () => {
    it('should register the service subcommands', async () => {
        const command = await createCLIEntryPointCommand();

        const subCommands = await (typeof command.subCommands === 'function' ?
            command.subCommands() :
            command.subCommands);

        expect(Object.keys(subCommands || {})).toEqual([
            'healthcheck',
            'migration',
            'start',
        ]);
    });

    it('should read the command meta from the package, not the cwd', async () => {
        const pkg = JSON.parse(await fs.promises.readFile(
            path.join(PACKAGE_PATH, 'package.json'),
            { encoding: 'utf8' },
        ));

        const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-cli-'));
        const cwd = vi.spyOn(process, 'cwd').mockReturnValue(directory);

        try {
            const command = await createCLIEntryPointCommand();
            const meta = await (typeof command.meta === 'function' ?
                command.meta() :
                command.meta);

            expect(meta).toEqual({
                name: '@authup/server-core',
                version: pkg.version,
                description: pkg.description,
            });
        } finally {
            cwd.mockRestore();
            await fs.promises.rm(directory, { recursive: true, force: true });
        }
    });

    describe('assertNoStrayPositionals', () => {
        it('should refuse a stray positional on start', () => {
            expect(() => assertNoStrayPositionals(parseArgs(
                ['start', 'client.admin-console'],
                CLI_CONFIG_ARGS,
            ))).toThrow('Unexpected argument "client.admin-console" for command "start".');
        });

        it('should refuse a stray positional on the commands the caller names', () => {
            const commands = new Set(['dev']);

            expect(() => assertNoStrayPositionals(parseArgs(['dev', 'x'], CLI_CONFIG_ARGS), commands))
                .toThrow('Unexpected argument "x" for command "dev".');

            expect(() => assertNoStrayPositionals(parseArgs(['start', 'x'], CLI_CONFIG_ARGS), commands))
                .not.toThrow();
        });

        it('should accept the space form of the config flags on start', () => {
            expect(() => assertNoStrayPositionals(parseArgs(
                ['start', '--configDirectory', '/etc/authup'],
                CLI_CONFIG_ARGS,
            ))).not.toThrow();

            expect(() => assertNoStrayPositionals(parseArgs(
                ['start', '--configFile', 'authup.conf'],
                CLI_CONFIG_ARGS,
            ))).not.toThrow();
        });

        it('should accept the equals form of the config flags on start', () => {
            expect(() => assertNoStrayPositionals(parseArgs(
                ['start', '--configDirectory=/etc/authup'],
                CLI_CONFIG_ARGS,
            ))).not.toThrow();
        });

        it('should keep the migration operation positional', () => {
            expect(() => assertNoStrayPositionals(parseArgs(
                ['migration', 'status'],
                CLI_CONFIG_ARGS,
            ))).not.toThrow();

            expect(() => assertNoStrayPositionals(parseArgs(
                ['migration', 'run', '--configDirectory', '/etc/authup'],
                CLI_CONFIG_ARGS,
            ))).not.toThrow();
        });

        it('should ignore a bare invocation', () => {
            expect(() => assertNoStrayPositionals(parseArgs([], CLI_CONFIG_ARGS))).not.toThrow();
        });
    });

    it('should refuse a stray positional on start before the subcommand runs', async () => {
        const command = await createCLIEntryPointCommand();

        await expect(runCommand(command, { rawArgs: ['start', 'client.admin-console'] }))
            .rejects
            .toThrow('Unexpected argument "client.admin-console" for command "start".');
    });

    it('should refuse an unknown migration operation before the database is touched', async () => {
        const command = await createCLIEntryPointCommand();

        await expect(runCommand(command, { rawArgs: ['migration', 'stauts'] }))
            .rejects
            .toThrow('Unknown migration operation "stauts". Expected one of: generate, revert, status, run.');
    });

    it('should keep generate out of the migration command the operator binary composes', async () => {
        await expect(runCommand(defineCLIMigrationCommand(), { rawArgs: ['generate'] }))
            .rejects
            .toThrow('Unknown migration operation "generate". Expected one of: revert, status, run.');
    });
});
