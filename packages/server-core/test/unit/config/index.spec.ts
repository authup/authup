/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    normalizeConfig,
    readConfigRawFromFS,
} from '../../../src';

describe('src/config/*.ts', () => {
    it('should build config with defaults', async () => {
        const config = normalizeConfig();

        expect(config).toBeDefined();
        expect(config.middlewareBody).toBeTruthy();

        config.middlewareBody = false;

        expect(config).toBeDefined();
        expect(config.middlewareBody).toBeFalsy();
    });

    it('should load config form fs', async () => {
        const config = await readConfigRawFromFS({
            cwd: 'test/data/config',
        });

        expect(config.db).toBeDefined();
        expect(config.db.type).toEqual('mysql');
        expect(config.db.database).toEqual('core');
    });
});
