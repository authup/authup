/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildConfig, resetConfig, setConfig, useConfig,
} from '../../../src';

describe('src/config/*.ts', () => {
    it('should build config', async () => {
        let config = buildConfig({});

        expect(config).toBeDefined();

        expect(config.database).toBeDefined();
        expect(config.middleware).toBeDefined();

        expect(config.env).toEqual('test');
        expect(config.registration).toBeFalsy();
        expect(config.emailVerification).toBeFalsy();

        config = buildConfig({
            registration: true,
            emailVerification: true,
        });

        expect(config).toBeDefined();

        expect(config.database).toBeDefined();
        expect(config.middleware).toBeDefined();

        expect(config.registration).toBeTruthy();
        expect(config.emailVerification).toBeTruthy();
    });

    it('should set & use config', async () => {
        setConfig({
            database: {
                adminUsername: 'shino',
            },
        });

        let config = await useConfig();
        expect(config).toBeDefined();
        expect(config.database).toBeDefined();
        expect(config.database.adminUsername).toEqual('shino');

        resetConfig();

        config = await useConfig();
        expect(config).toBeDefined();
        expect(config.database).toBeDefined();
        expect(config.database.adminUsername).toEqual('admin');
    });
});
