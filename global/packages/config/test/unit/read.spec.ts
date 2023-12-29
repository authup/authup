/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractFor, read } from '../../src';

describe('src/read', () => {
    it('should read config file', async () => {
        const config = await read({
            directory: 'test/data',
        });

        expect(config.server).toBeDefined();
        expect(config.server.core).toBeDefined();
        expect(config.server.core.host).toEqual('1.1.1.1');
        expect(config.server.core.port).toEqual(4010);
        expect(config.client.web).toBeDefined();
        expect(config.client.web.host).toEqual('1.1.1.2');
        expect(config.client.web.port).toEqual(4000);
    });

    it('should read config for server core app', async () => {
        const config = await read({
            directory: 'test/data',
        });

        const core = extractFor(config, 'server', 'core');

        expect(core).toBeDefined();
        expect(core.host).toEqual('1.1.1.1');
        expect(core.port).toEqual(4010);
    });

    it('should read config for client web app', async () => {
        const config = await read({
            directory: 'test/data',
        });

        const core = extractFor(config, 'client', 'web');

        expect(core).toBeDefined();
        expect(core.host).toEqual('1.1.1.2');
        expect(core.port).toEqual(4000);
    });
});
