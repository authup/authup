/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'eldin';
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
import type { ConfigReadFsOptions } from '../../../src/app/index';
import { ConfigInjectionKey } from '../../../src/app/index';
import {
    applyCLIConfigArgs,
    createCLIConfigModule,
    defineCLIConfigCommand,
    describeConfigError,
} from '../../../src/cli/commands/config';

type CLICommand = ReturnType<typeof defineCLIConfigCommand>;

async function runSubCommand(command: CLICommand, name: 'validate' | 'schema') {
    const subCommand = (command.subCommands as Record<string, any>)[name];
    await subCommand.run({
        args: { _: [] }, 
        rawArgs: [], 
        cmd: subCommand, 
    });
}

describe('src/cli/commands/config', () => {
    describe('applyCLIConfigArgs', () => {
        it('should apply the config args onto the fs read options', () => {
            const options : ConfigReadFsOptions = {};

            applyCLIConfigArgs(options, {
                configDirectory: '/etc/authup',
                configFile: 'authup.yml',
            });

            expect(options).toEqual({
                cwd: '/etc/authup',
                file: 'authup.yml',
            });
        });

        it('should keep previously applied options when args are absent', () => {
            const options : ConfigReadFsOptions = {
                cwd: '/etc/authup',
                file: 'authup.yml',
            };

            applyCLIConfigArgs(options, {});

            expect(options).toEqual({
                cwd: '/etc/authup',
                file: 'authup.yml',
            });
        });
    });

    describe('createCLIConfigModule', () => {
        let directory : string;

        let portBackup : string | undefined;

        beforeEach(async () => {
            directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-cli-config-'));

            portBackup = process.env.PORT;
            delete process.env.PORT;
        });

        afterEach(async () => {
            await fs.promises.rm(directory, { recursive: true, force: true });

            if (typeof portBackup === 'undefined') {
                delete process.env.PORT;
            } else {
                process.env.PORT = portBackup;
            }
        });

        it('should register a config resolved from the threaded fs options', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'server:\n  core:\n    port: 4010\n',
            );

            const options : ConfigReadFsOptions = {};
            applyCLIConfigArgs(options, { configDirectory: directory });

            const module = createCLIConfigModule(options);

            const container = new Container();
            await module.setup(container);

            const config = container.resolve(ConfigInjectionKey);
            expect(config.port).toEqual(4010);
        });

        it('should pick up args applied after the module was created', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'server:\n  core:\n    port: 4030\n',
            );

            const options : ConfigReadFsOptions = {};
            const module = createCLIConfigModule(options);

            applyCLIConfigArgs(options, { configDirectory: directory });

            const container = new Container();
            await module.setup(container);

            const config = container.resolve(ConfigInjectionKey);
            expect(config.port).toEqual(4030);
        });

        it('should let env win over the threaded file config', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'server:\n  core:\n    port: 4010\n',
            );

            process.env.PORT = '5077';

            const module = createCLIConfigModule({ cwd: directory });

            const container = new Container();
            await module.setup(container);

            const config = container.resolve(ConfigInjectionKey);
            expect(config.port).toEqual(5077);
        });
    });

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

        it('should print the config file json schema', async () => {
            const log = vi.spyOn(console, 'log').mockImplementation(() => {});

            try {
                await runSubCommand(defineCLIConfigCommand(), 'schema');

                expect(log).toHaveBeenCalledTimes(1);

                const document = JSON.parse(log.mock.calls[0][0] as string);
                expect(document.$schema).toEqual('http://json-schema.org/draft-07/schema#');
                expect(document.properties.server.properties.core.properties.port).toBeDefined();
            } finally {
                log.mockRestore();
            }
        });
    });

    describe('describeConfigError', () => {
        it('should pass a plain error message through', () => {
            expect(describeConfigError(new Error('nope'))).toEqual('nope');
        });
    });
});
