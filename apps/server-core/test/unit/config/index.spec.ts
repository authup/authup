/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../../src/app/modules/config/normalize';
import { expandToOrigins, getAppOrigins } from '../../../src/app/modules/config/origins';
import { parseConfig } from '../../../src/app/modules/config/parse';
import { readConfigRawFromFS } from '../../../src/app/modules/config/read';

describe('src/config/*.ts', () => {
    describe('getAppOrigins', () => {
        it('should derive the origin from publicUrl, stripping any path', () => {
            const origins = getAppOrigins({
                publicUrl: 'https://auth.example.com/sub/path',
                additionalOrigins: [],
            } as any);

            expect(origins).toEqual(['https://auth.example.com']);
        });

        it('should merge publicUrl with additionalOrigins and dedupe by origin', () => {
            const origins = getAppOrigins({
                publicUrl: 'https://auth.example.com',
                additionalOrigins: [
                    'https://auth.example.com/ignored-path',
                    'http://localhost:3000',
                ],
            } as any);

            expect(origins).toEqual([
                'https://auth.example.com',
                'http://localhost:3000',
            ]);
        });

        it('should expand a scheme-less host to both http and https origins', () => {
            const origins = getAppOrigins({
                publicUrl: 'https://auth.example.com',
                additionalOrigins: ['hub.local'],
            } as any);

            expect(origins).toEqual([
                'https://auth.example.com',
                'http://hub.local',
                'https://hub.local',
            ]);
        });
    });

    describe('expandToOrigins', () => {
        it('should keep the origin of a full URL', () => {
            expect(expandToOrigins('https://hub.local/some/path'))
                .toEqual(['https://hub.local']);
        });

        it('should expand a bare host with port', () => {
            expect(expandToOrigins('hub.local:8080'))
                .toEqual(['http://hub.local:8080', 'https://hub.local:8080']);
        });

        it('should throw on an invalid value', () => {
            expect(() => expandToOrigins('')).toThrow();
        });
    });

    describe('parseConfig', () => {
        it('should accept additionalOrigins with and without protocol', async () => {
            const config = await parseConfig({ additionalOrigins: ['https://app.example.com', 'hub.local', 'hub.local:8080'] });

            expect(config.additionalOrigins).toEqual([
                'https://app.example.com',
                'hub.local',
                'hub.local:8080',
            ]);
        });

        it('should reject invalid additionalOrigins entries', async () => {
            await expect(parseConfig({ additionalOrigins: [''] })).rejects.toThrow();
        });

        it('should strip unknown keys', async () => {
            const config = await parseConfig({ foo: 'bar', port: 3001 });

            expect(config).not.toHaveProperty('foo');
            expect(config.port).toEqual(3001);
        });
    });

    describe('normalizeConfig', () => {
        it('should canonicalize additionalOrigins to bare origins', async () => {
            const config = await normalizeConfig({
                additionalOrigins: [
                    'https://app.example.com/some/path',
                    'hub.local',
                ],
            });

            expect(config.additionalOrigins).toEqual([
                'https://app.example.com',
                'http://hub.local',
                'https://hub.local',
                'http://localhost:3000',
            ]);
        });

        it('should not accumulate the dev origin on repeated normalization', async () => {
            const input = { additionalOrigins: ['hub.local'] };

            const first = await normalizeConfig(input);
            const second = await normalizeConfig({ ...input, additionalOrigins: first.additionalOrigins });

            expect(second.additionalOrigins).toEqual(first.additionalOrigins);
        });
    });


    it('should build config with defaults', async () => {
        const config = await normalizeConfig();

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
