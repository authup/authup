/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runCommand } from 'citty';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineCLIConfigCommand } from '../../src/commands/config.ts';
import { createCLIEntryPointCommand } from '../../src/module.ts';

type CLICommand = ReturnType<typeof defineCLIConfigCommand>;

async function runSubCommand(command: CLICommand, name: 'validate' | 'schema') {
    const subCommand = (command.subCommands as Record<string, any>)[name];
    await subCommand.run({
        args: { _: [] },
        rawArgs: [],
        cmd: subCommand,
    });
}

describe('defineCLIConfigCommand', () => {
    let directory : string;

    beforeEach(async () => {
        directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-cli-config-command-'));
    });

    afterEach(async () => {
        await fs.promises.rm(directory, { recursive: true, force: true });
    });

    it('should carry the two subcommands', () => {
        const command = defineCLIConfigCommand();

        expect(command.meta).toMatchObject({ name: 'config' });
        expect(Object.keys(command.subCommands ?? {}).sort()).toEqual(['schema', 'validate']);
    });

    it('should reach a nested subcommand with the root config args', async () => {
        // the whole design rests on citty running the ROOT setup before it
        // recurses, so the shared options object every subcommand closes over
        // is already populated. Drive it through the real entry point with
        // runCommand rather than calling run directly, or nothing pins that.
        await fs.promises.writeFile(
            path.join(directory, 'authup.yml'),
            'server:\n  core:\n    port: "not-a-port"\n',
        );

        const root = await createCLIEntryPointCommand();

        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            await runCommand(root, { rawArgs: ['--configDirectory', directory, 'config', 'validate'] });

            expect(exit).toHaveBeenCalledWith(1);
            expect(error.mock.calls[0][0]).toContain('port');
        } finally {
            error.mockRestore();
            exit.mockRestore();
        }
    });

    it('should refuse to call a mistyped config directory valid', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            await runSubCommand(defineCLIConfigCommand({ cwd: directory }), 'validate');

            expect(exit).toHaveBeenCalledWith(1);
            expect(error.mock.calls[0][0]).toContain('No configuration file');
        } finally {
            error.mockRestore();
            exit.mockRestore();
        }
    });

    it('should report the options the file holds that nothing reads', async () => {
        await fs.promises.writeFile(
            path.join(directory, 'authup.yml'),
            'server:\n  core:\n    publicUrl: https://idp.example.com\n',
        );

        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            await runSubCommand(defineCLIConfigCommand({ cwd: directory }), 'validate');

            expect(exit).toHaveBeenCalledWith(1);
            expect(error.mock.calls[0][0]).toContain('server.core.publicUrl');
        } finally {
            error.mockRestore();
            exit.mockRestore();
        }
    });

    it('should stay silent for a valid configuration', async () => {
        await fs.promises.writeFile(
            path.join(directory, 'authup.yml'),
            'server:\n  core:\n    port: 4050\n',
        );

        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            await runSubCommand(defineCLIConfigCommand({ cwd: directory }), 'validate');

            expect(error).not.toHaveBeenCalled();
            expect(exit).not.toHaveBeenCalled();
        } finally {
            error.mockRestore();
            exit.mockRestore();
        }
    });

    it('should report every issue and exit non-zero for an invalid configuration', async () => {
        await fs.promises.writeFile(
            path.join(directory, 'authup.yml'),
            'server:\n  core:\n    port: "not-a-port"\n    passwordMinLength: 0\n',
        );

        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            await runSubCommand(defineCLIConfigCommand({ cwd: directory }), 'validate');

            expect(exit).toHaveBeenCalledWith(1);
            expect(error).toHaveBeenCalledTimes(1);

            const message = error.mock.calls[0][0] as string;
            expect(message).toContain('port');
            expect(message).toContain('passwordMinLength');
        } finally {
            error.mockRestore();
            exit.mockRestore();
        }
    });

    /**
     * The printed document is what the docs workflow writes to
     * docs/src/public/schema/config.json, so it has to be the WHOLE
     * authup.yml (a console service's section included) and it has to be the
     * only thing on stdout: the workflow redirects the stream into the file.
     */
    it('should print the whole configuration document as json schema', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
            await runSubCommand(defineCLIConfigCommand(), 'schema');

            expect(log).toHaveBeenCalledTimes(1);

            const document = JSON.parse(log.mock.calls[0][0] as string);

            expect(document.$schema).toEqual('http://json-schema.org/draft-07/schema#');
            expect(document.properties.server.properties.core.properties.port).toBeDefined();
            expect(document.properties.server.properties.adminConsole.properties.path).toBeDefined();
            expect(document.properties.theme.properties.directoryPath).toBeDefined();
        } finally {
            log.mockRestore();
        }
    });
});
