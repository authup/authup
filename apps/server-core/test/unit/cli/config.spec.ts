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
import type { ConfigReadFsOptions } from '../../../src/app/index';
import { ConfigInjectionKey } from '../../../src/app/index';
import { applyCLIConfigArgs, createCLIConfigModule } from '../../../src/cli/config';

describe('src/cli/config', () => {
    describe('applyCLIConfigArgs', () => {
        it('should apply the config args onto the fs read options', () => {
            const options : ConfigReadFsOptions = {};

            applyCLIConfigArgs(options, {
                configDirectory: '/etc/authup',
                configFile: 'authup.conf',
            });

            expect(options).toEqual({
                cwd: '/etc/authup',
                file: 'authup.conf',
            });
        });

        it('should keep previously applied options when args are absent', () => {
            const options : ConfigReadFsOptions = {
                cwd: '/etc/authup',
                file: 'authup.conf',
            };

            applyCLIConfigArgs(options, {});

            expect(options).toEqual({
                cwd: '/etc/authup',
                file: 'authup.conf',
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
                path.join(directory, 'authup.server.core.conf'),
                'port=4010\n',
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
                path.join(directory, 'authup.server.core.conf'),
                'port=4030\n',
            );

            const options : ConfigReadFsOptions = {};
            const module = createCLIConfigModule(options);

            applyCLIConfigArgs(options, { configDirectory: directory });

            const container = new Container();
            await module.setup(container);

            const config = container.resolve(ConfigInjectionKey);
            expect(config.port).toEqual(4030);
        });

        it('should apply the overrides after env and file', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.server.core.conf'),
                'adminConsoleEnabled=true\naccountConsoleEnabled=true\n',
            );

            process.env.PORT = '5078';

            const module = createCLIConfigModule({ cwd: directory }, { accountConsoleEnabled: false });

            const container = new Container();
            await module.setup(container);

            // the override beats the file AND the env; everything it does not
            // name is read as before.
            const config = container.resolve(ConfigInjectionKey);
            expect(config.accountConsoleEnabled).toEqual(false);
            expect(config.adminConsoleEnabled).toEqual(true);
            expect(config.port).toEqual(5078);
        });

        it('should let env win over the threaded file config', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.server.core.conf'),
                'port=4010\n',
            );

            process.env.PORT = '5077';

            const module = createCLIConfigModule({ cwd: directory });

            const container = new Container();
            await module.setup(container);

            const config = container.resolve(ConfigInjectionKey);
            expect(config.port).toEqual(5077);
        });
    });
});
