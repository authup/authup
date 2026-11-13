/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { isUpstreamTimeoutError } from '@authup/errors';
import { isJWTError } from '@authup/specs';
import type { TransportRequest } from 'hapic';
import { MemoryTransport } from 'hapic';
import {
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vitest,
} from 'vitest';
import { TokenVerifier } from '../../src';
import { TokenPayload } from '../data/token';
import { Faker } from '../utils';

const BASE_URL = 'http://localhost:3001';

function stall(signal: AbortSignal | null | undefined) : Promise<never> {
    return new Promise<never>((_resolve, reject) => {
        if (!signal) {
            return;
        }

        if (signal.aborted) {
            reject(signal.reason);

            return;
        }

        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
}

function createCreator() {
    return vitest.fn(async () => ({
        access_token: 'client-token',
        expires_in: 3600,
        token_type: 'Bearer',
    }));
}

const { getJwk } = Client.prototype;

/**
 * Answers every key fetch of a verifier's client through a transport that
 * never answers, with the options that client was configured with.
 */
function useStalledClient() : MemoryTransport {
    const transport = new MemoryTransport({ fetch: (request: TransportRequest) => stall(request.signal) });

    vitest.spyOn(Client.prototype, 'getJwk').mockImplementation(function (this: Client, id: string, realmId?: string) {
        return getJwk.call(new Client({ ...this.toOptions(), transport }), id, realmId);
    });

    return transport;
}

describe('verifier timeout', () => {
    let faker : Faker;
    let token : string;

    beforeAll(async () => {
        faker = new Faker();
        token = await faker.sign(TokenPayload);
    });

    afterEach(() => {
        vitest.unstubAllGlobals();
        vitest.restoreAllMocks();
    });

    it('reports an introspection that does not answer in time as an upstream timeout', async () => {
        const fetchMock = vitest.fn((_input: string | URL | Request, init?: RequestInit) => stall(init?.signal));

        vitest.stubGlobal('fetch', fetchMock);

        const verifier = new TokenVerifier({
            baseURL: BASE_URL,
            creator: createCreator(),
            timeout: 0.05,
        });

        const error = await verifier.verify(token).catch((e: unknown) => e);

        expect(fetchMock).toHaveBeenCalled();
        expect(isUpstreamTimeoutError(error)).toBe(true);
        expect(isJWTError(error)).toBe(false);
    });

    it('reports a key fetch that does not answer in time as an upstream timeout', async () => {
        const verifier = new TokenVerifier({
            baseURL: BASE_URL,
            timeout: 0.05,
            jwkCache: false,
        });

        const transport = useStalledClient();

        const error = await verifier.verify(token).catch((e: unknown) => e);

        expect(transport.requests.length).toEqual(1);
        expect(isUpstreamTimeoutError(error)).toBe(true);
        expect(isJWTError(error)).toBe(false);
    });

    it('reports a cached key load that does not answer in time as an upstream timeout', async () => {
        const verifier = new TokenVerifier({
            baseURL: BASE_URL,
            timeout: 0.05,
        });

        useStalledClient();

        const error = await verifier.verify(token).catch((e: unknown) => e);

        expect(isUpstreamTimeoutError(error)).toBe(true);
        expect(isJWTError(error)).toBe(false);
    });

    it('rejects with the reason of the caller signal', async () => {
        const fetchMock = vitest.fn((_input: string | URL | Request, init?: RequestInit) => stall(init?.signal));

        vitest.stubGlobal('fetch', fetchMock);

        const verifier = new TokenVerifier({
            baseURL: BASE_URL,
            creator: createCreator(),
        });

        const controller = new AbortController();
        const reason = new Error('the caller went away');

        const pending = verifier.verify(token, { signal: controller.signal }).catch((e: unknown) => e);

        await vitest.waitFor(() => expect(fetchMock).toHaveBeenCalled());
        controller.abort(reason);

        const error = await pending;

        expect(error).toBe(reason);
        expect(isUpstreamTimeoutError(error)).toBe(false);
        expect(isJWTError(error)).toBe(false);
    });

    it('rejects at once for a signal aborted before the call', async () => {
        const verifier = new TokenVerifier({ baseURL: BASE_URL, jwkCache: false });
        const transport = useStalledClient();
        const reason = new Error('aborted early');

        const error = await verifier.verify(token, { signal: AbortSignal.abort(reason) }).catch((e: unknown) => e);

        expect(error).toBe(reason);
        expect(transport.requests.length).toEqual(0);
    });

    it('keeps an invalid token a JWTError when a timeout is set', async () => {
        vitest.spyOn(Client.prototype, 'getJwk').mockReturnValue(faker.useJwk());

        const verifier = new TokenVerifier({
            baseURL: BASE_URL,
            timeout: 0.05,
            jwkCache: false,
        });

        const error = await verifier.verify(`${token}x`).catch((e: unknown) => e);

        expect(isJWTError(error)).toBe(true);
        expect(isUpstreamTimeoutError(error)).toBe(false);
    });
});
