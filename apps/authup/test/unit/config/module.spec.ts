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
    CLIENT_WEB_API_URL_FALLBACK,
    buildClientWebEnv,
    buildServerCoreEnv,
    readLauncherConfig,
} from '../../../src/config';
import type { LauncherConfig } from '../../../src/config';

let configDirectory : string;

beforeAll(() => {
    configDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-config-'));

    fs.writeFileSync(path.join(configDirectory, 'authup.conf'), [
        'server.core.port=4310',
        'server.core.host=127.0.0.1',
        'server.core.publicUrl=http://127.0.0.1:4310',
        'client.web.port=4311',
        'client.web.cookieDomain=example.com',
    ].join('\n'));
});

afterAll(() => {
    fs.rmSync(configDirectory, { recursive: true, force: true });
});

function buildLauncherConfig(input?: Partial<LauncherConfig>) : LauncherConfig {
    return {
        serverCore: {},
        clientWeb: {},
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

        expect(config.clientWeb).toEqual({
            port: 4311,
            host: undefined,
            apiUrl: undefined,
            cookieDomain: 'example.com',
        });
    });

    it('should read empty sections when no config file exists', async () => {
        const emptyDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-config-empty-'));

        try {
            const config = await readLauncherConfig({ directory: emptyDirectory });

            expect(config.serverCore.port).toBeUndefined();
            expect(config.clientWeb.port).toBeUndefined();
        } finally {
            fs.rmSync(emptyDirectory, { recursive: true, force: true });
        }
    });

    it('should map the server-core section onto PORT/HOST', () => {
        const env = buildServerCoreEnv(buildLauncherConfig({ serverCore: { port: 4310, host: '127.0.0.1' } }));

        expect(env).toEqual({
            PORT: '4310',
            HOST: '127.0.0.1',
        });
    });

    it('should keep PORT/HOST untouched when the server-core section is empty', () => {
        const env = buildServerCoreEnv(buildLauncherConfig());

        expect(env).toEqual({});
    });

    it('should map the client-web section onto PORT/HOST and nuxt runtime overrides', () => {
        const env = buildClientWebEnv(buildLauncherConfig({
            clientWeb: {
                port: 4311,
                host: '127.0.0.1',
                apiUrl: 'https://api.example.com',
                cookieDomain: 'example.com',
            },
        }));

        expect(env).toEqual({
            PORT: '4311',
            HOST: '127.0.0.1',
            NUXT_PUBLIC_API_URL: 'https://api.example.com',
            NUXT_PUBLIC_COOKIE_DOMAIN: 'example.com',
        });
    });

    it('should derive the api url from the server-core public url', () => {
        const env = buildClientWebEnv(buildLauncherConfig({ serverCore: { publicUrl: 'http://127.0.0.1:4310' } }));

        expect(env.NUXT_PUBLIC_API_URL).toEqual('http://127.0.0.1:4310');
    });

    it('should prefer the client-web api url over the derived one', () => {
        const env = buildClientWebEnv(buildLauncherConfig({
            serverCore: { publicUrl: 'http://127.0.0.1:4310' },
            clientWeb: { apiUrl: 'https://api.example.com' },
        }));

        expect(env.NUXT_PUBLIC_API_URL).toEqual('https://api.example.com');
    });

    it('should fall back to the default api url', () => {
        const env = buildClientWebEnv(buildLauncherConfig());

        expect(env.NUXT_PUBLIC_API_URL).toEqual(CLIENT_WEB_API_URL_FALLBACK);
        expect(env.NUXT_PUBLIC_COOKIE_DOMAIN).toBeUndefined();
    });
});
