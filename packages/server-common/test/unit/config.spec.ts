/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { readConfigFile } from '../../src';

describe('src/config/**', () => {
    it('should read config file', async () => {
        const config = await readConfigFile({
            directoryPath: 'test/data',
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
            directoryPath: 'test/data',
            name: 'api',
        });

        expect(config).toBeDefined();
        expect(config.host).toEqual('1.1.1.1');
        expect(config.port).toEqual(4010);
    });

    it('should read config for ui', async () => {
        const config = await readConfigFile({
            directoryPath: 'test/data',
            name: 'ui',
        });

        expect(config).toBeDefined();
        expect(config.host).toEqual('1.1.1.2');
        expect(config.port).toEqual(4000);
    });
});
