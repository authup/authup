/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { readConfig } from '../../../src/app/modules/config/read.ts';
import { normalizeConfig } from '../../../src/app/modules/config/read';
import {
    expandToOrigins,
    inspectConfigFile,
    readConfigRawFromEnv,
    readConfigRawFromFS,
} from '@authup/server-config';
import { getAppOrigins } from '../../../src/app/modules/config/app-origins';
import { parseConfig } from '../../../src/app/modules/config/parse';
import { CONFIG_SCHEMA } from '../../../src/app/modules/config/constants';
import type { Config } from '../../../src/app/modules/config/types';

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
                    'http://localhost:3010',
                ],
            } as any);

            expect(origins).toEqual([
                'https://auth.example.com',
                'http://localhost:3010',
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

        it('should accept boolean process role keys and reject non-boolean values', async () => {
            const config = await parseConfig({
                worker: { enabled: false },
                migrationEnabled: false,
            });

            expect(config.worker?.enabled).toEqual(false);
            expect(config.migrationEnabled).toEqual(false);

            await expect(parseConfig({ worker: { enabled: 'nope' } })).rejects.toThrow();
            await expect(parseConfig({ migrationEnabled: 'nope' })).rejects.toThrow();
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
                'http://localhost:3010',
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

        it('should default the root path to the working directory', async () => {
            const config = await normalizeConfig();

            expect(config.rootPath).toEqual(process.cwd());
            expect(config.logDirectoryPath).toEqual(path.join(process.cwd(), 'logs'));
            expect(config.provisioningDirectoryPath).toEqual(path.join(process.cwd(), 'provisioning'));
        });

        it('should honor a configured root path', async () => {
            const config = await normalizeConfig({ rootPath: path.join(path.sep, 'srv', 'authup') });

            expect(config.rootPath).toEqual(path.join(path.sep, 'srv', 'authup'));
        });

        it('should resolve a relative logDirectoryPath against the root path', async () => {
            const config = await normalizeConfig({
                rootPath: path.join(path.sep, 'srv', 'authup'),
                logDirectoryPath: 'logs',
            });

            expect(config.logDirectoryPath).toEqual(path.join(path.sep, 'srv', 'authup', 'logs'));
        });

        it('should keep an absolute logDirectoryPath', async () => {
            const config = await normalizeConfig({
                rootPath: path.join(path.sep, 'srv', 'authup'),
                logDirectoryPath: path.join(path.sep, 'var', 'log', 'authup'),
            });

            expect(config.logDirectoryPath).toEqual(path.join(path.sep, 'var', 'log', 'authup'));
        });

        it('should resolve a relative provisioningDirectoryPath against the root path', async () => {
            const config = await normalizeConfig({
                rootPath: path.join(path.sep, 'srv', 'authup'),
                provisioningDirectoryPath: 'provisioning',
            });

            expect(config.provisioningDirectoryPath)
                .toEqual(path.join(path.sep, 'srv', 'authup', 'provisioning'));
        });

        it('should keep an absolute provisioningDirectoryPath', async () => {
            const config = await normalizeConfig({
                rootPath: path.join(path.sep, 'srv', 'authup'),
                provisioningDirectoryPath: path.join(path.sep, 'etc', 'authup', 'provisioning'),
            });

            expect(config.provisioningDirectoryPath)
                .toEqual(path.join(path.sep, 'etc', 'authup', 'provisioning'));
        });

        it('should default passwordMinLength to 10', async () => {
            const config = await normalizeConfig();

            expect(config.passwordMinLength).toEqual(10);
        });

        it('should keep trusted certificate headers disabled by default', async () => {
            const config = await normalizeConfig();

            expect(config.certificateSource).toEqual('disabled');
            expect(config.mtlsPublicUrl).toBeNull();
        });

        it('should default trustProxy to true and accept every non-function trust form', async () => {
            const config = await normalizeConfig();
            expect(config.trustProxy).toEqual(true);

            expect((await normalizeConfig({ trustProxy: false })).trustProxy).toEqual(false);
            expect((await normalizeConfig({ trustProxy: 1 })).trustProxy).toEqual(1);
            expect((await normalizeConfig({ trustProxy: 'loopback' })).trustProxy).toEqual('loopback');
            expect((await normalizeConfig({ trustProxy: ['10.0.0.1', '10.0.0.0/8'] })).trustProxy)
                .toEqual(['10.0.0.1', '10.0.0.0/8']);

            await expect(parseConfig({ trustProxy: -1 })).rejects.toThrow();
            await expect(parseConfig({ trustProxy: 1.5 })).rejects.toThrow();
        });

        it('should canonicalize string trust forms on EVERY config surface (integer wins over boolean words)', async () => {
            // proxy-addr accepts single-integer "long value" IPv4 notation, so
            // an un-canonicalized "1" (a stringifying configmap, TRUST_PROXY
            // env, quoted .conf value) would silently compile to an allowlist
            // of 0.0.0.1 instead of one trusted hop.
            expect((await normalizeConfig({ trustProxy: '1' })).trustProxy).toEqual(1);
            expect((await normalizeConfig({ trustProxy: '0' })).trustProxy).toEqual(0);
            expect((await normalizeConfig({ trustProxy: 'true' })).trustProxy).toEqual(true);
            expect((await normalizeConfig({ trustProxy: 'FALSE' })).trustProxy).toEqual(false);
            // proxy-addr matches presets case-sensitively — lowercase them
            expect((await normalizeConfig({ trustProxy: 'Loopback' })).trustProxy).toEqual('loopback');
            expect((await normalizeConfig({ trustProxy: '10.0.0.1, 10.0.0.0/8' })).trustProxy)
                .toEqual('10.0.0.1, 10.0.0.0/8');
        });

        it('should reject mis-typed scalar forms inside the explicit allowlist array', async () => {
            await expect(parseConfig({ trustProxy: ['1'] })).rejects.toThrow();
            await expect(parseConfig({ trustProxy: ['true'] })).rejects.toThrow();
            await expect(parseConfig({ trustProxy: [''] })).rejects.toThrow();
        });

        it('should canonicalize allowlist entries like the scalar form', async () => {
            // the validator compares the canonicalized entry, so an untrimmed /
            // uppercased entry passes it — proxy-addr would then reject the raw
            // value inside `new App` (presets are matched case-sensitively).
            expect((await normalizeConfig({ trustProxy: [' 10.0.0.0/8 ', 'LOOPBACK'] })).trustProxy)
                .toEqual(['10.0.0.0/8', 'loopback']);
        });

        it('should reject an out-of-range hop count on every surface', async () => {
            // the number surface is safe-integer bounded by the validator;
            // canonicalization runs after it, so the string surface must not
            // smuggle a saturated parseInt result past that bound.
            await expect(parseConfig({ trustProxy: 2 ** 53 })).rejects.toThrow();
            await expect(normalizeConfig({ trustProxy: '99999999999999999999' }))
                .rejects.toThrow(/safe integer range/);
        });

        it('should read TRUST_PROXY from the environment as the raw string form', () => {
            const previous = process.env.TRUST_PROXY;
            process.env.TRUST_PROXY = '1';
            try {
                expect(readConfigRawFromEnv<Config>(CONFIG_SCHEMA).trustProxy).toEqual('1');
            } finally {
                if (typeof previous === 'undefined') {
                    delete process.env.TRUST_PROXY;
                } else {
                    process.env.TRUST_PROXY = previous;
                }
            }
        });

        it('should validate the explicit certificate source and mTLS alias contract', async () => {
            const config = await normalizeConfig({
                certificateSource: 'standard',
                mtlsPublicUrl: 'https://mtls.example.com',
            });

            expect(config.certificateSource).toEqual('standard');
            expect(config.mtlsPublicUrl).toEqual('https://mtls.example.com');

            await expect(normalizeConfig({ mtlsPublicUrl: 'https://mtls.example.com' })).rejects.toThrow(/certificateSource/);
            await expect(parseConfig({ certificateSource: 'automatic' }))
                .rejects.toThrow();
        });

        it('should default the audit-log and login-throttle keys', async () => {
            const config = await normalizeConfig();

            expect(config.eventLogEnabled).toEqual(true);
            expect(config.eventLogRetentionDays).toEqual(90);
            expect(config.eventLogEntityEnabled).toEqual(true);
            expect(config.eventLogEntityRetentionDays).toEqual(7);
            expect(config.loginAttemptThrottleEnabled).toEqual(false);
            expect(config.loginAttemptThreshold).toEqual(5);
            expect(config.loginAttemptWindow).toEqual(900);
        });

        it('should default the process role keys to true', async () => {
            const config = await normalizeConfig();

            expect(config.worker.enabled).toEqual(true);
            expect(config.migrationEnabled).toEqual(true);
        });

        it('should accept the process role keys', async () => {
            const config = await normalizeConfig({
                worker: { enabled: false },
                migrationEnabled: false,
            });

            expect(config.worker?.enabled).toEqual(false);
            expect(config.migrationEnabled).toEqual(false);
        });

        it('should read WORKER_ENABLED and MIGRATION_ENABLED from the environment', () => {
            const previousWorker = process.env.WORKER_ENABLED;
            const previousMigration = process.env.MIGRATION_ENABLED;

            process.env.WORKER_ENABLED = 'false';
            process.env.MIGRATION_ENABLED = 'false';

            try {
                const raw = readConfigRawFromEnv<Config>(CONFIG_SCHEMA);

                expect(raw.worker?.enabled).toEqual(false);
                expect(raw.migrationEnabled).toEqual(false);

                // both are strict readers: a set-but-unrecognized value must
                // fail loud instead of silently defaulting to true.
                process.env.WORKER_ENABLED = 'maybe';
                expect(() => readConfigRawFromEnv<Config>(CONFIG_SCHEMA)).toThrow(/WORKER_ENABLED/);
            } finally {
                if (typeof previousWorker === 'undefined') {
                    delete process.env.WORKER_ENABLED;
                } else {
                    process.env.WORKER_ENABLED = previousWorker;
                }

                if (typeof previousMigration === 'undefined') {
                    delete process.env.MIGRATION_ENABLED;
                } else {
                    process.env.MIGRATION_ENABLED = previousMigration;
                }
            }
        });

        it('should enable MFA with zero key configuration', async () => {
            const config = await normalizeConfig({ mfaEnabled: true });

            expect(config.mfaEnabled).toEqual(true);
            expect(config.secretsEncryptionKey).toEqual('');
        });

        it('should reject a secretsEncryptionKey that does not decode to 32 bytes', async () => {
            // valid base64, wrong length
            await expect(normalizeConfig({ secretsEncryptionKey: Buffer.alloc(16, 1).toString('base64') })).rejects.toThrow(/32 bytes/);

            // not base64 at all
            await expect(normalizeConfig({ secretsEncryptionKey: ' '.repeat(3) })).rejects.toThrow(/secretsEncryptionKey/);
        });

        it('should accept a valid 32-byte secretsEncryptionKey', async () => {
            const config = await normalizeConfig({ secretsEncryptionKey: Buffer.alloc(32, 7).toString('base64') });

            expect(config.secretsEncryptionKey).not.toEqual('');
        });

        it('should reject the login throttle without the audit log (fail loud)', async () => {
            // the throttle counts loginFailed rows in auth_events — with the
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
        const config = await readConfigRawFromFS<Config>(CONFIG_SCHEMA, { cwd: 'test/data/config' });

        // the whole document read onto this service's config: the shared
        // section and its own at the top level, and a console section under
        // the console it belongs to.
        expect(config.db).toBeDefined();
        expect(config.db!.type).toEqual('mysql');
        expect(config.db!.database).toEqual('core');
        expect(config.publicUrl).toEqual('https://idp.example.com');
        expect(config.adminConsole!.url).toEqual('https://console.example.com/admin');
        expect(config.port).toEqual(4711);
        expect(config.host).toEqual('127.0.0.1');
        expect(config.adminConsole!.enabled).toEqual(false);
        expect(config.accountConsole!.enabled).toEqual(false);
    });

    describe('readConfig', () => {
        let directory : string;

        let portBackup : string | undefined;

        beforeEach(async () => {
            directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-config-'));

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

        it('should resolve a file value through the fs read path', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'core:\n  port: 4010\n',
            );

            const config = await readConfig({ env: true, fs: { cwd: directory } });

            expect(config.port).toEqual(4010);
        });

        it('should let an env value win over the same key from file', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'core:\n  port: 4010\n',
            );

            process.env.PORT = '5055';

            const config = await readConfig({ env: true, fs: { cwd: directory } });

            expect(config.port).toEqual(5055);
        });

        it('should resolve an explicitly selected config file', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'deployment.yml'),
                'core:\n  port: 4020\n',
            );

            const config = await readConfig({
                env: true,
                fs: { cwd: directory, file: 'deployment.yml' },
            });

            expect(config.port).toEqual(4020);
        });

        it('should refuse a retired per component file in any format', async () => {
            // the previous shape loaded authup.server.core.<ext> and nested it
            // under the name the filename carried; read as one document its
            // flat keys land at the root and almost all of them are dropped.
            await fs.promises.writeFile(
                path.join(directory, 'authup.server.core.yml'),
                'port: 4080\n',
            );

            await expect(readConfigRawFromFS<Config>(CONFIG_SCHEMA, { cwd: directory, file: 'authup.server.core.yml' }))
                .rejects.toThrow(/authup\.yml/);

            // and it is reported when it is merely left lying around
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                expect((await readConfigRawFromFS<Config>(CONFIG_SCHEMA, { cwd: directory })).port).toBeUndefined();
                expect(warn.mock.calls[0]?.[0]).toContain('authup.server.core.yml');
            } finally {
                warn.mockRestore();
            }
        });

        it('should report that no configuration file was found', async () => {
            expect((await inspectConfigFile({ cwd: directory })).files).toEqual([]);

            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'core:\n  port: 4090\n',
            );

            expect((await inspectConfigFile({ cwd: directory })).files)
                .toEqual([path.join(directory, 'authup.yml')]);
        });

        it('should name the reason a configuration file could not be parsed', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                'core:\n  port: 1\nbad: [unclosed\n',
            );

            await expect(readConfigRawFromFS<Config>(CONFIG_SCHEMA, { cwd: directory })).rejects.toSatisfy(
                (error: Error) => typeof (error as { cause?: unknown }).cause !== 'undefined',
            );
        });

        it('should refuse an explicitly named retired conf file', async () => {
            // it would load, and every key that moved out of server.core would
            // be dropped in silence, leaving the service on a derived issuer
            // and an empty database while the rest of the file applied.
            await fs.promises.writeFile(
                path.join(directory, 'legacy.conf'),
                'server.core.port=4060\npublicUrl=https://idp.example.com\n',
            );

            await expect(readConfigRawFromFS<Config>(CONFIG_SCHEMA, { cwd: directory, file: 'legacy.conf' }))
                .rejects.toThrow(/authup\.yml/);
        });

        it('should report a key the document places where nothing reads it', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.yml'),
                [
                    'core:',
                    '  port: 4070',
                    '  publicUrl: https://idp.example.com',
                    '  typo: true',
                    'x-anchors:',
                    '  shared: 1',
                    '',
                ].join('\n'),
            );

            expect((await inspectConfigFile({ cwd: directory })).unknown).toEqual([
                'core.publicUrl',
                'core.typo',
            ]);
        });

        it('should ignore a retired conf file and say so once', async () => {
            await fs.promises.writeFile(
                path.join(directory, 'authup.conf'),
                'server.core.port=4030\n',
            );
            await fs.promises.writeFile(
                path.join(directory, 'authup.server.core.conf'),
                'port=4040\n',
            );

            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

            try {
                const config = await readConfigRawFromFS<Config>(CONFIG_SCHEMA, { cwd: directory });

                expect(config.port).toBeUndefined();
                expect(warn).toHaveBeenCalledTimes(1);
                expect(warn.mock.calls[0][0]).toContain('authup.conf');
                expect(warn.mock.calls[0][0]).toContain('authup.server.core.conf');
            } finally {
                warn.mockRestore();
            }
        });
    });
});
