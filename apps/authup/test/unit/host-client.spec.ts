/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { createHostClient, tokensFromGrant } from '../../src/host/client.ts';
import { openHost } from '../../src/host/module.ts';
import {
    createFileTokenStorage,
    createHostStore,
    resolveHostsDirectory,
} from '../../src/host/store/index.ts';
import type { HostTokens, IHostStore } from '../../src/host/store/index.ts';
import { createHostTransport } from '../utils/host.ts';

const host = 'https://auth.example.com';

const expired = {
    status: 401,
    body: {
        code: 'expired_token', 
        message: 'The token expired.', 
        '@instanceof': ['@ebec/core/BaseError', '@authup/errors/AuthupError'], 
    }, 
};

function bearerOf(headers: HeadersInit | undefined) : string | null {
    return new Headers(headers ?? {}).get('authorization');
}

describe('createHostClient', () => {
    let root : string;
    let store : IHostStore;
    let tokens : HostTokens;

    beforeEach(async () => {
        root = await fs.mkdtemp('/tmp/authup-cli-client-');
        vi.stubEnv('XDG_CONFIG_HOME', root);
        store = createHostStore(resolveHostsDirectory());
        tokens = {
            accessToken: 'old-access', 
            refreshToken: 'old-refresh', 
            expiresAt: Date.now() - 1, 
        };
        await store.write({
            current: host,
            hosts: {
                [host]: {
                    clientId: 'cli', 
                    storage: 'file', 
                    ...tokens, 
                }, 
            }, 
        });
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await fs.rm(root, { recursive: true, force: true });
    });

    it('refreshes once on a dead bearer, replays the request and keeps the rotated pair', async () => {
        const bearers : (string | null)[] = [];
        const transport = createHostTransport({
            'GET /users': (request) => {
                bearers.push(bearerOf(request.headers));
                return bearers.length === 1 ? expired : { body: { data: [{ id: 'u1' }], meta: { total: 1 } } };
            },
            'POST /token': (_request, form) => {
                expect(form).toEqual({
                    grant_type: 'refresh_token', 
                    client_id: 'cli', 
                    refresh_token: 'old-refresh', 
                });
                return {
                    body: {
                        access_token: 'new-access', 
                        refresh_token: 'new-refresh', 
                        expires_in: 900, 
                        token_type: 'Bearer',
                    },
                };
            },
        });
        const storage = createFileTokenStorage(store);
        const client = createHostClient({
            host, 
            entry: { clientId: 'cli', storage: 'file' }, 
            tokens, 
            storage, 
            directory: store.directory, 
            transport,
        });

        const response = await client.user.getMany();

        expect(response.data).toEqual([{ id: 'u1' }]);
        expect(bearers).toEqual(['Bearer old-access', 'Bearer new-access']);
        expect(await storage.read(host)).toMatchObject({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });

    it('adopts a rotation another process saved instead of replaying its own refresh token', async () => {
        const storage = createFileTokenStorage(store);
        await storage.write(host, {
            accessToken: 'other-access', 
            refreshToken: 'other-refresh', 
            expiresAt: Date.now() + 900_000, 
        });

        let tokenCalls = 0;
        const bearers : (string | null)[] = [];
        const transport = createHostTransport({
            'GET /users': (request) => {
                bearers.push(bearerOf(request.headers));
                return bearers.length === 1 ? expired : { body: { data: [], meta: { total: 0 } } };
            },
            'POST /token': () => {
                tokenCalls += 1;
                return { status: 400, body: { code: 'invalid_grant', message: 'replayed' } };
            },
        });
        const client = createHostClient({
            host, 
            entry: { clientId: 'cli', storage: 'file' }, 
            tokens, 
            storage, 
            directory: store.directory, 
            transport,
        });

        await client.user.getMany();

        expect(tokenCalls).toBe(0);
        expect(bearers).toEqual(['Bearer old-access', 'Bearer other-access']);
    });

    it('asks for a new sign-in when no refresh token exists', async () => {
        const transport = createHostTransport({ 'GET /users': () => expired });
        const client = createHostClient({
            host,
            entry: { clientId: 'cli', storage: 'file' },
            tokens: { accessToken: 'old-access', expiresAt: 0 },
            storage: createFileTokenStorage(store),
            directory: store.directory,
            transport,
        });

        await expect(client.user.getMany()).rejects.toThrow(/issued no refresh token/);
    });

    it('does not deadlock when the refresh itself answers 401', async () => {
        const transport = createHostTransport({
            'GET /users': () => expired,
            'POST /token': () => ({ status: 401, body: { code: 'invalid_client', message: 'The client is unknown.' } }),
        });
        const client = createHostClient({
            host, 
            entry: { clientId: 'cli', storage: 'file' }, 
            tokens, 
            storage: createFileTokenStorage(store), 
            directory: store.directory, 
            transport,
        });

        await expect(client.user.getMany()).rejects.toThrow(/unknown/);
    });

    it('derives the tokens from a grant', () => {
        expect(tokensFromGrant({
            access_token: 'a', 
            refresh_token: 'r', 
            expires_in: 60, 
            token_type: 'Bearer',
        }, 1000)).toEqual({
            accessToken: 'a', 
            refreshToken: 'r', 
            expiresAt: 61_000, 
        });
    });
});

describe('openHost', () => {
    let root : string;

    beforeEach(async () => {
        root = await fs.mkdtemp('/tmp/authup-cli-open-');
        vi.stubEnv('XDG_CONFIG_HOME', root);
        vi.stubEnv('AUTHUP_SERVER_URL', '');
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await fs.rm(root, { recursive: true, force: true });
    });

    it('refuses a host without a sign-in', async () => {
        await expect(openHost(host)).rejects.toThrow(/Not signed in to https:\/\/auth.example.com/);
    });

    it('opens the current host with its stored tokens', async () => {
        const store = createHostStore(resolveHostsDirectory());
        await store.write({
            current: host,
            hosts: {
                [host]: {
                    clientId: 'cli', 
                    storage: 'file', 
                    accessToken: 'a', 
                    refreshToken: 'r', 
                    expiresAt: 5, 
                }, 
            },
        });

        const opened = await openHost(undefined);

        expect(opened.host).toEqual(host);
        expect(opened.tokens).toEqual({
            accessToken: 'a', 
            refreshToken: 'r', 
            expiresAt: 5, 
        });
        expect(opened.entry.clientId).toEqual('cli');
    });
});
