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
} from 'vitest';
import type { ConfigReadFsOptions } from '@authup/server-config';
import type { Config } from '../../../src/app/index';
import { ConfigInjectionKey } from '../../../src/app/index';
import {
    applyCLIConfigArgs,
    createCLIConfigModule,
    describeConfigError,
} from '../../../src/cli/commands/config';

describe('src/cli/commands/config', () => {
    describe('applyCLIConfigArgs', () => {
        it('should apply the config args onto the fs read options', () => {
            const options : ConfigReadFsOptions<Config> = {};

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
            const options : ConfigReadFsOptions<Config> = {
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
                'core:\n  port: 4010\n',
            );

            const options : ConfigReadFsOptions<Config> = {};
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
                'core:\n  port: 4030\n',
            );

            const options : ConfigReadFsOptions<Config> = {};
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
                'core:\n  port: 4010\n',
            );

            process.env.PORT = '5077';

            const module = createCLIConfigModule({ cwd: directory });

            const container = new Container();
            await module.setup(container);

            const config = container.resolve(ConfigInjectionKey);
            expect(config.port).toEqual(5077);
        });
    });

    describe('describeConfigError', () => {
        it('should pass a plain error message through', () => {
            expect(describeConfigError(new Error('nope'))).toEqual('nope');
        });

        it('should name the reason behind a wrapped failure', () => {
            // confinity wraps a parse failure so the FILE is always named,
            // which leaves the reason one level down; without the chain the
            // command says a file could not be loaded and nothing else.
            const error = new Error('The file "authup.yml" could not be loaded.', { cause: new Error('Nested mappings are not allowed at line 4') });

            expect(describeConfigError(error)).toContain('line 4');
        });
    });
});
