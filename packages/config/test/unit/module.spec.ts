/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '../../src';

describe('src/read', () => {
    it('should read config from file path', async () => {
        const container = new Container({
            prefix: 'authup',
            keys: ['client/web', 'server/core'],
        });
        await container.loadFromFilePath('test/data/authup.server.conf');

        const core = container.getData('server/core');

        expect(core.port).toEqual(4010);
        expect(core.host).toBeUndefined();
    });

    it('should read config for server core app', async () => {
        const container = new Container({
            prefix: 'authup',
            keys: ['client/web', 'server/core'],
        });
        await container.loadFromPath('test/data');

        const core = container.getData('server/core');

        expect(core).toBeDefined();
        expect(core.host).toEqual('1.1.1.1');
        expect(core.port).toEqual(4010);
    });

    it('should read config for client web app', async () => {
        const container = new Container({
            prefix: 'authup',
            keys: ['client/web', 'server/core'],
        });
        await container.loadFromPath('test/data');

        const core = container.getData('client/web');

        expect(core).toBeDefined();
        expect(core.host).toEqual('1.1.1.2');
        expect(core.port).toEqual(4000);
    });
});
