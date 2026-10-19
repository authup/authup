/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { isJWTError } from '@authup/specs';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vitest,
} from 'vitest';
import type { ITokenCache, TokenCacheEntry } from 'vouchly';
import { isVouchlyError } from 'vouchly';
import type { TokenVerifierContext } from '../../src';
import { TokenVerifier } from '../../src';
import { INTROSPECTION_ENDPOINT, TokenPayload } from '../data/token';
import { Faker } from '../utils';

const BASE_URL = 'http://localhost:3001';

function respond(status: number, body: unknown = {}) : Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

class SpyTokenCache implements ITokenCache {
    readonly items = new Map<string, TokenCacheEntry>();

    readonly ttls : number[] = [];

    async get(key: string) {
        return this.items.get(key);
    }

    async set(key: string, entry: TokenCacheEntry, ttl: number) {
        this.ttls.push(ttl);
        this.items.set(key, entry);
    }
}

function createCreator() {
    let counter = 0;
    return vitest.fn(async () => {
        counter++;
        return {
            access_token: `client-token-${counter}`,
            expires_in: 3600,
            token_type: 'Bearer',
        };
    });
}

function createRemote(input: Partial<TokenVerifierContext> = {}) {
    return new TokenVerifier({
        baseURL: BASE_URL,
        creator: createCreator(),
        cache: false,
        ...input,
    });
}

describe('verifier remote', () => {
    let faker : Faker;
    let token : string;
    let fetchMock : ReturnType<typeof vitest.fn>;

    beforeAll(async () => {
        faker = new Faker();
        token = await faker.sign(TokenPayload);
        vitest.spyOn(Client.prototype, 'getJwk').mockReturnValue(faker.useJwk());
    });

    beforeEach(() => {
        fetchMock = vitest.fn(async () => respond(200, TokenPayload));
        vitest.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vitest.unstubAllGlobals();
    });

    function authorizationHeaders() : (string | undefined)[] {
        return fetchMock.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)?.authorization);
    }

    it('introspects at the token introspection endpoint with the minted token', async () => {
        const verifier = createRemote();

        const output = await verifier.verify(token);

        expect(output.sub).toEqual(TokenPayload.sub);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0][0])).toEqual(INTROSPECTION_ENDPOINT);
        expect(authorizationHeaders()).toEqual(['Bearer client-token-1']);
    });

    it('keeps the introspection endpoint under a base path', async () => {
        const verifier = createRemote({ baseURL: 'http://localhost:3001/auth' });

        await verifier.verify(token);

        expect(String(fetchMock.mock.calls[0][0])).toEqual('http://localhost:3001/auth/token/introspect');
    });

    it('reuses the minted token across introspections', async () => {
        const creator = createCreator();
        const verifier = createRemote({ creator });

        await verifier.verify(token);
        await verifier.verify('opaque-token');

        expect(creator).toHaveBeenCalledTimes(1);
        expect(authorizationHeaders()).toEqual(['Bearer client-token-1', 'Bearer client-token-1']);
    });

    it('treats maxRemoteCacheTTL 0 as no cap, as before', async () => {
        const verifier = createRemote({ cache: new SpyTokenCache(), maxRemoteCacheTTL: 0 });

        await verifier.verify(token);
        await verifier.verify(token);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('re-mints once for concurrent introspections answered 401', async () => {
        const creator = createCreator();
        fetchMock.mockImplementation(async (_input: unknown, init?: RequestInit) => {
            await new Promise((resolve) => { setTimeout(resolve, 10); });
            const header = (init?.headers as Record<string, string>)?.authorization;
            return header === 'Bearer client-token-1' ? respond(401) : respond(200, TokenPayload);
        });
        const verifier = createRemote({ creator });

        await Promise.all(Array.from({ length: 10 }, () => verifier.verify(token)));

        expect(creator).toHaveBeenCalledTimes(2);
    });

    it('re-mints the token once after a 401', async () => {
        fetchMock.mockResolvedValueOnce(respond(401));
        const creator = createCreator();
        const verifier = createRemote({ creator });

        await expect(verifier.verify(token)).resolves.toMatchObject({ sub: TokenPayload.sub });

        expect(creator).toHaveBeenCalledTimes(2);
        expect(authorizationHeaders()).toEqual(['Bearer client-token-1', 'Bearer client-token-2']);

        await verifier.verify('opaque-token');
        expect(creator).toHaveBeenCalledTimes(2);
    });

    it('introspects an opaque token string', async () => {
        const verifier = createRemote();

        await verifier.verify('opaque-token');

        const body = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body));
        expect(body.get('token')).toEqual('opaque-token');
    });

    it('reports an inactive token as inactive', async () => {
        fetchMock.mockResolvedValueOnce(respond(200, { active: false }));
        const verifier = createRemote();

        const error = await verifier.verify(token).catch((e) => e);

        expect(isJWTError(error)).toBe(true);
        expect(isVouchlyError(error)).toBe(false);
        expect(error.code).toEqual(ErrorCode.JWT_INACTIVE);
    });

    it('reports a failed introspection as invalid, naming the status', async () => {
        fetchMock.mockResolvedValue(respond(503));
        const verifier = createRemote();

        const error = await verifier.verify(token).catch((e) => e);

        expect(isJWTError(error)).toBe(true);
        expect(isVouchlyError(error)).toBe(false);
        expect(error.code).toEqual(ErrorCode.JWT_INVALID);
        expect(error.message).toContain('503');
    });

    it('bounds the cached introspection result by maxRemoteCacheTTL', async () => {
        const cache = new SpyTokenCache();
        const verifier = createRemote({ cache, maxRemoteCacheTTL: 30 });

        await verifier.verify(token);

        expect(cache.ttls).toHaveLength(1);
        expect(cache.ttls[0]).toBeLessThanOrEqual(30);
    });

    it('keeps a local and a remote verifier sharing one cache apart', async () => {
        const cache = new SpyTokenCache();
        const local = new TokenVerifier({ baseURL: BASE_URL, cache });
        const remote = createRemote({ cache });

        await local.verify(token);
        await remote.verify(token);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(cache.items.size).toEqual(2);
    });

    it('uses a given cache namespace', async () => {
        const cache = new SpyTokenCache();
        const x = createRemote({ cache, cacheNamespace: 'shared' });
        const y = createRemote({ cache, cacheNamespace: 'shared' });

        await x.verify(token);
        await y.verify(token);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(cache.items.size).toEqual(1);
    });
});
