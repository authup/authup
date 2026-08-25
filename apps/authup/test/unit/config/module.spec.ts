/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    LISTEN_HOST_DEFAULT,
    SERVER_CORE_PORT_DEFAULT,
    buildServerCoreEnv,
    readLauncherConfig,
} from '../../../src/config';
import type { LauncherConfig } from '../../../src/config';

let configDirectory : string;
let staleConfigDirectory : string;

beforeAll(() => {
    configDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-config-'));

    fs.writeFileSync(path.join(configDirectory, 'authup.conf'), [
        'server.core.port=4310',
        'server.core.host=127.0.0.1',
        'server.core.publicUrl=http://127.0.0.1:4310',
    ].join('\n'));

    staleConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-config-stale-'));

    fs.writeFileSync(path.join(staleConfigDirectory, 'authup.conf'), [
        'server.core.port=4310',
        'client.admin-console.port=4311',
        'client.admin-console.cookieDomain=example.com',
    ].join('\n'));
});

afterAll(() => {
    fs.rmSync(configDirectory, { recursive: true, force: true });
    fs.rmSync(staleConfigDirectory, { recursive: true, force: true });
});

function buildLauncherConfig(input?: Partial<LauncherConfig>) : LauncherConfig {
    return {
        serverCore: {},
        warnings: [],
        ...input,
    };
}

describe('src/config', () => {
    it('should read the section config from a config directory', async () => {
        const config = await readLauncherConfig({ directory: configDirectory });

        expect(config.serverCore).toEqual({
            port: 4310,
            host: '127.0.0.1',
            publicUrl: 'http://127.0.0.1:4310',
        });
        expect(config.warnings).toEqual([]);
    });

    // The admin console is served by server-core (plan 081). A section left
    // over from the two-process layout must be answered with a warning, never
    // silently defaulted: the `client.web` rename taught that lesson.
    it('should warn about a stale client.admin-console section', async () => {
        const config = await readLauncherConfig({ directory: staleConfigDirectory });

        expect(config.serverCore.port).toEqual(4310);
        expect(config.warnings).toHaveLength(1);
        expect(config.warnings[0]).toMatch(/client\.admin-console/);
    });

    it('should always pin PORT/HOST so an ambient PORT cannot decide the listen address', () => {
        const env = buildServerCoreEnv(buildLauncherConfig());

        expect(env.PORT).toEqual(`${SERVER_CORE_PORT_DEFAULT}`);
        expect(env.HOST).toEqual(LISTEN_HOST_DEFAULT);
    });

    it('should map the server.core section onto PORT/HOST', () => {
        const env = buildServerCoreEnv(buildLauncherConfig({ serverCore: { port: 4310, host: '127.0.0.1' } }));

        expect(env).toEqual({ PORT: '4310', HOST: '127.0.0.1' });
    });
});
