/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    describe,
    expect,
    it,
} from 'vitest';
import { API_URL_DEFAULT, Client } from '@authup/core-http-kit';
import type { RuntimeConfig } from 'nuxt/schema';
import { buildHTTPClientOptions } from '../../src/runtime/helpers/http-client';
import type { HTTPClientOptions } from '../../src/runtime/helpers/http-client';

const PUBLIC_URL = 'https://auth.example.com/api';
const SERVER_URL = 'http://authup:3000';

/**
 * The client the kit builds from these options, at each of its three sites.
 */
function buildClient(options: HTTPClientOptions) : Client {
    return new Client({ baseURL: options.baseURL, transport: options.transport });
}

function buildRuntimeConfig(
    publicOptions: Record<string, unknown>,
    privateOptions: Record<string, unknown> = {},
) : RuntimeConfig {
    return {
        ...privateOptions,
        public: { authup: publicOptions },
    } as unknown as RuntimeConfig;
}

async function listen() : Promise<{
    url: string, 
    paths: string[], 
    close: () => Promise<void> 
}> {
    const paths : string[] = [];
    const server = createServer((req, res) => {
        paths.push(req.url || '');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: [], meta: {} }));
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
    });

    const { port } = server.address() as AddressInfo;

    return {
        url: `http://127.0.0.1:${port}/internal`,
        paths,
        close: () => new Promise<void>((resolve) => {
            server.close(() => resolve());
        }),
    };
}

describe('runtime/helpers/http-client', () => {
    it('keeps the public url as the base of a server render with serverApiURL', () => {
        const options = buildHTTPClientOptions(
            buildRuntimeConfig({ apiURL: PUBLIC_URL }, { authup: { serverApiURL: SERVER_URL } }),
            true,
        );

        expect(options.baseURL).toEqual(PUBLIC_URL);
        expect(options.transport).toBeDefined();
        expect(buildClient(options).getBaseURL()).toEqual(PUBLIC_URL);
    });

    it('renders identity provider links with the public url', () => {
        const options = buildHTTPClientOptions(
            buildRuntimeConfig({ apiURL: PUBLIC_URL }, { authup: { serverApiURL: SERVER_URL } }),
            true,
        );

        const href = buildClient(options).identityProvider.getAuthorizeUri('e8c7d1a4-2b0f-4f8e-9c3a-1d2e3f4a5b6c');
        expect(href.startsWith(`${PUBLIC_URL}/identity-providers/`)).toBe(true);
        expect(href).not.toContain(SERVER_URL);
    });

    it('dials serverApiURL for server-side calls', async () => {
        const upstream = await listen();

        try {
            const options = buildHTTPClientOptions(
                buildRuntimeConfig({ apiURL: PUBLIC_URL }, { authup: { serverApiURL: upstream.url } }),
                true,
            );

            await buildClient(options).realm.getMany();

            expect(upstream.paths).toHaveLength(1);
            expect(upstream.paths[0]?.startsWith('/internal/realms')).toBe(true);
        } finally {
            await upstream.close();
        }
    });

    it('dials the server url from a private runtime key on the server', async () => {
        const upstream = await listen();

        try {
            const options = buildHTTPClientOptions(
                {
                    apiUrl: upstream.url,
                    public: { apiUrl: PUBLIC_URL, authup: { apiURLRuntimeKey: 'apiUrl' } },
                } as unknown as RuntimeConfig,
                true,
            );

            expect(options.baseURL).toEqual(PUBLIC_URL);

            await buildClient(options).realm.getMany();

            expect(upstream.paths).toHaveLength(1);
            expect(upstream.paths[0]?.startsWith('/internal/realms')).toBe(true);
        } finally {
            await upstream.close();
        }
    });

    it('dials the public url when the server url is the same', () => {
        const options = buildHTTPClientOptions(
            buildRuntimeConfig({ apiURL: PUBLIC_URL }, { authup: { serverApiURL: PUBLIC_URL } }),
            true,
        );

        expect(options).toEqual({ baseURL: PUBLIC_URL });
    });

    it('dials the public url without a server url', () => {
        const options = buildHTTPClientOptions(buildRuntimeConfig({ apiURL: PUBLIC_URL }), true);

        expect(options).toEqual({ baseURL: PUBLIC_URL });
    });

    it('ignores serverApiURL in the browser', () => {
        const options = buildHTTPClientOptions(
            buildRuntimeConfig({ apiURL: PUBLIC_URL }, { authup: { serverApiURL: SERVER_URL } }),
            false,
        );

        expect(options).toEqual({ baseURL: PUBLIC_URL });
    });

    it('prefers the public runtime key over apiURL', () => {
        const options = buildHTTPClientOptions(
            {
                public: {
                    apiUrl: PUBLIC_URL,
                    authup: { apiURL: 'https://other.example.com', apiURLRuntimeKey: 'apiUrl' },
                },
            } as unknown as RuntimeConfig,
            false,
        );

        expect(options).toEqual({ baseURL: PUBLIC_URL });
    });

    it('falls back to the default api url', () => {
        expect(buildHTTPClientOptions(buildRuntimeConfig({}), false))
            .toEqual({ baseURL: API_URL_DEFAULT });
    });
});
