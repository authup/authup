/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../../src/app/modules/config/normalize';
import { getAppOrigins } from '../../../src/app/modules/config/origins';
import { readConfigRawFromFS } from '../../../src/app/modules/config/read';

describe('src/config/*.ts', () => {
    describe('getAppOrigins', () => {
        it('should derive the origin from publicUrl, stripping any path', () => {
            const origins = getAppOrigins({
                publicUrl: 'https://auth.example.com/sub/path',
                additionalDomains: [],
            } as any);

            expect(origins).toEqual(['https://auth.example.com']);
        });

        it('should merge publicUrl with additionalDomains and dedupe by origin', () => {
            const origins = getAppOrigins({
                publicUrl: 'https://auth.example.com',
                additionalDomains: [
                    'https://auth.example.com/ignored-path',
                    'http://localhost:3000',
                ],
            } as any);

            expect(origins).toEqual([
                'https://auth.example.com',
                'http://localhost:3000',
            ]);
        });
    });


    it('should build config with defaults', async () => {
        const config = normalizeConfig();

        expect(config).toBeDefined();
        expect(config.middlewareBody).toBeTruthy();

        config.middlewareBody = false;

        expect(config).toBeDefined();
        expect(config.middlewareBody).toBeFalsy();
    });

    it('should load config form fs', async () => {
        const config = await readConfigRawFromFS({ cwd: 'test/data/config' });

        expect(config.db).toBeDefined();
        expect(config.db.type).toEqual('mysql');
        expect(config.db.database).toEqual('core');
    });
});
