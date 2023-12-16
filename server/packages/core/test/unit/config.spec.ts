/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { buildWorkingDirectoryPathsForConfigFile, readConfigFile } from '../../src';

describe('src/config/**', () => {
    it('should read config file', async () => {
        const config = await readConfigFile({
            cwd: 'test/data',
        });

        expect(config).toBeDefined();
        expect(config.api).toBeDefined();
        expect(config.api.host).toEqual('1.1.1.1');
        expect(config.api.port).toEqual(4010);
        expect(config.ui).toBeDefined();
        expect(config.ui.host).toEqual('1.1.1.2');
        expect(config.ui.port).toEqual(4000);
    });

    it('should read config for api', async () => {
        const config = await readConfigFile({
            cwd: 'test/data',
            name: 'api',
        });

        expect(config).toBeDefined();
        expect(config.host).toEqual('1.1.1.1');
        expect(config.port).toEqual(4010);
    });

    it('should read config for ui', async () => {
        const config = await readConfigFile({
            cwd: 'test/data',
            name: 'ui',
        });

        expect(config).toBeDefined();
        expect(config.host).toEqual('1.1.1.2');
        expect(config.port).toEqual(4000);
    });

    it('should build working directory paths for config file', () => {
        let cwd = buildWorkingDirectoryPathsForConfigFile();

        expect(cwd.length).toEqual(2);
        expect(cwd[0]).toEqual(process.cwd());
        expect(cwd[1]).toEqual(path.join(process.cwd(), 'writable'));

        process.env.WRITABLE_DIRECTORY_PATH = 'foo';
        cwd = buildWorkingDirectoryPathsForConfigFile();

        expect(cwd.length).toEqual(2);
        expect(cwd[0]).toEqual(process.cwd());
        expect(cwd[1]).toEqual(path.join(process.cwd(), 'foo'));
    });
});
