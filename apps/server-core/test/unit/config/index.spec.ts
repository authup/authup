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
                trustedOrigins: [],
            } as any);

            expect(origins).toEqual(['https://auth.example.com']);
        });

        it('should merge publicUrl with trustedOrigins and dedupe by origin', () => {
            const origins = getAppOrigins({
                publicUrl: 'https://auth.example.com/sub/path',
                trustedOrigins: [
                    'https://auth.example.com',
                    'http://localhost:3000',
                ],
            } as any);

            expect(origins).toEqual([
                'https://auth.example.com',
                'http://localhost:3000',
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

        it('should reject non-http(s) protocols', () => {
            expect(() => expandToOrigins('myapp://hub.local')).toThrow();
            expect(() => expandToOrigins('ftp://hub.local')).toThrow();
        });
    });

    describe('parseConfig', () => {
        it('should accept trustedOrigins with and without protocol', async () => {
            const config = await parseConfig({ trustedOrigins: ['https://app.example.com', 'hub.local', 'hub.local:8080'] });

            expect(config.trustedOrigins).toEqual([
                'https://app.example.com',
                'hub.local',
                'hub.local:8080',
            ]);
        });

        it('should reject invalid trustedOrigins entries', async () => {
            await expect(parseConfig({ trustedOrigins: [''] })).rejects.toThrow();
            await expect(parseConfig({ trustedOrigins: ['myapp://hub.local'] })).rejects.toThrow();
        });

        it('should reject non-object input', async () => {
            await expect(parseConfig('port=3001')).rejects.toThrow();
            await expect(parseConfig(null)).rejects.toThrow();
            await expect(parseConfig([])).rejects.toThrow();
        });

        it('should strip unknown keys', async () => {
            const config = await parseConfig({ foo: 'bar', port: 3001 });

            expect(config).not.toHaveProperty('foo');
            expect(config.port).toEqual(3001);
        });

        it('should accept a bounded passwordMinLength and reject out-of-bounds values', async () => {
            const config = await parseConfig({ passwordMinLength: 12 });
            expect(config.passwordMinLength).toEqual(12);

            await expect(parseConfig({ passwordMinLength: 0 })).rejects.toThrow();
            await expect(parseConfig({ passwordMinLength: 513 })).rejects.toThrow();
            await expect(parseConfig({ passwordMinLength: 10.5 })).rejects.toThrow();
        });
    });

    describe('normalizeConfig', () => {
        it('should canonicalize trustedOrigins to bare origins', async () => {
            const config = await normalizeConfig({
                trustedOrigins: [
                    'https://app.example.com/some/path',
                    'hub.local',
                ],
            });

            expect(config.trustedOrigins).toEqual([
                'https://app.example.com',
                'http://hub.local',
                'https://hub.local',
                'http://localhost:3000',
            ]);
        });

        it('should not accumulate the dev origin on repeated normalization', async () => {
            const input = { trustedOrigins: ['hub.local'] };

            const first = await normalizeConfig(input);
            const second = await normalizeConfig({ ...input, trustedOrigins: first.trustedOrigins });

            expect(second.trustedOrigins).toEqual(first.trustedOrigins);
        });

        it('should not seed the dev origin when the supplied env is production', async () => {
            const config = await normalizeConfig({
                env: 'production',
                trustedOrigins: ['https://app.example.com'],
            });

            expect(config.env).toEqual('production');
            expect(config.trustedOrigins).toEqual(['https://app.example.com']);
        });

        it('should keep an explicit port of 0', async () => {
            const config = await normalizeConfig({ port: 0 });

            expect(config.port).toEqual(0);
        });

        it('should default passwordMinLength to 10', async () => {
            const config = await normalizeConfig();

            expect(config.passwordMinLength).toEqual(10);
        });

        it('should default the audit-log and login-throttle keys', async () => {
            const config = await normalizeConfig();

            expect(config.eventLogEnabled).toEqual(true);
            expect(config.eventLogRetentionDays).toEqual(365);
            expect(config.loginAttemptThrottleEnabled).toEqual(false);
            expect(config.loginAttemptThreshold).toEqual(5);
            expect(config.loginAttemptWindow).toEqual(900);
        });

        it('should reject the login throttle without the audit log (fail loud)', async () => {
            // the throttle counts login_failed rows in auth_events — with the
            // audit log disabled it would silently no-op.
            await expect(normalizeConfig({
                loginAttemptThrottleEnabled: true,
                eventLogEnabled: false,
            })).rejects.toThrow();
        });

        it('should accept the login throttle alongside the audit log', async () => {
            const config = await normalizeConfig({
                loginAttemptThrottleEnabled: true,
                eventLogEnabled: true,
            });

            expect(config.loginAttemptThrottleEnabled).toEqual(true);
            expect(config.eventLogEnabled).toEqual(true);
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
        expect(config.db!.type).toEqual('mysql');
        expect(config.db!.database).toEqual('core');
    });
});
