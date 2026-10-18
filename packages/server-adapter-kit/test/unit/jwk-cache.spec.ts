/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { OAuth2JsonWebKey } from '@authup/specs';
import { JWTError } from '@authup/specs';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { TokenVerifierContext } from '../../src';
import { RedisTokenCache, TokenVerifier } from '../../src';
import { TokenPayload } from '../data/token';
import { Faker } from '../utils';

const KID_A = '0b6c3f0e-2a51-4d8e-9f3b-7a1c5e2d4f60';
const KID_B = '1c7d4a1f-3b62-4e9f-a04c-8b2d6f3e5a71';
const REALM_A = 'e0aefc0c-3396-471e-ab81-f84779978223';
const REALM_B = '8b3f6d4c-5e2a-4c7b-9d0f-1a2b3c4d5e6f';

// the token cache is off, so every verify reaches the key source.
function create(jwkCache?: TokenVerifierContext['jwkCache']) {
    return new TokenVerifier({
        baseURL: 'http://localhost:3001', 
        jwkCache, 
        cache: false, 
    });
}

describe('jwk cache', () => {
    let faker : Faker;
    let jwk : OAuth2JsonWebKey;
    let getJwk : ReturnType<typeof vi.spyOn>;

    async function sign(kid = KID_A, realmId = REALM_A) {
        const now = Math.floor(Date.now() / 1000);
        return faker.sign({
            ...TokenPayload,
            realm_id: realmId,
            iat: now,
            exp: now + 3600,
        }, kid);
    }

    beforeAll(async () => {
        faker = new Faker();
        jwk = await faker.useJwk();
    });

    beforeEach(() => {
        getJwk = vi.spyOn(Client.prototype, 'getJwk').mockImplementation(async () => jwk);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('loads once and serves hits', async () => {
        const verifier = create();

        await verifier.verify(await sign());
        await verifier.verify(await sign());

        expect(getJwk).toHaveBeenCalledTimes(1);
    });

    it('keeps realms apart', async () => {
        const verifier = create();

        await verifier.verify(await sign(KID_A, REALM_A));
        await verifier.verify(await sign(KID_A, REALM_B));

        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it('loads a new kid', async () => {
        const verifier = create();

        await verifier.verify(await sign(KID_A));
        await verifier.verify(await sign(KID_B));

        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it('expires an entry at exactly ttl', async () => {
        let now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now);

        const verifier = create({ ttl: 10 });
        const token = await sign();

        await verifier.verify(token);
        expect(getJwk).toHaveBeenCalledTimes(1);

        now += 9_999;
        await verifier.verify(token);
        expect(getJwk).toHaveBeenCalledTimes(1);

        now += 1;
        await verifier.verify(token);
        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it('caches nothing with ttl 0', async () => {
        const verifier = create({ ttl: 0 });
        const token = await sign();

        await verifier.verify(token);
        await verifier.verify(token);

        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it('keeps keys in memory for the redis cache', async () => {
        const cache = new RedisTokenCache({} as ConstructorParameters<typeof RedisTokenCache>[0]);
        vi.spyOn(cache, 'get').mockResolvedValue(undefined);
        vi.spyOn(cache, 'set').mockResolvedValue(undefined);

        const verifier = new TokenVerifier({ baseURL: 'http://localhost:3001', cache });
        const token = await sign();

        await verifier.verify(token);
        await verifier.verify(token);

        expect(getJwk).toHaveBeenCalledTimes(1);
    });

    it('shares one flight between concurrent misses', async () => {
        const { promise: deferred, resolve: release } = Promise.withResolvers<OAuth2JsonWebKey>();
        getJwk.mockImplementation(() => deferred);
        const verifier = create();
        const token = await sign();

        const x = verifier.verify(token);
        const y = verifier.verify(token);

        await vi.waitFor(() => expect(getJwk).toHaveBeenCalled());
        release(jwk);

        await expect(x).resolves.toBeDefined();
        await expect(y).resolves.toBeDefined();
        expect(getJwk).toHaveBeenCalledTimes(1);
    });

    it('shares one rejected flight and stores nothing', async () => {
        const { promise: deferred, reject } = Promise.withResolvers<OAuth2JsonWebKey>();
        getJwk.mockImplementationOnce(() => deferred);
        const verifier = create();
        const token = await sign();

        const pending = Promise.allSettled([
            verifier.verify(token),
            verifier.verify(token),
        ]);

        await vi.waitFor(() => expect(getJwk).toHaveBeenCalled());
        reject(new Error('ECONNRESET'));

        const [x, y] = await pending;
        expect(x.status).toBe('rejected');
        expect(y.status).toBe('rejected');
        expect(getJwk).toHaveBeenCalledTimes(1);

        await expect(verifier.verify(token)).resolves.toBeDefined();
        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it('bounds a stalled flight by the timeout', async () => {
        const token = await sign();
        vi.useFakeTimers();
        getJwk.mockImplementationOnce(() => new Promise<OAuth2JsonWebKey>(() => {}));
        const verifier = create({ timeout: 5 });

        const first = verifier.verify(token);
        const joined = verifier.verify(token);
        const firstSettled = expect(first).rejects.toBeInstanceOf(JWTError);
        const joinedSettled = expect(joined).rejects.toBeInstanceOf(JWTError);

        // the key is requested after the token hash, which settles off the timer queue
        await vi.waitFor(() => expect(getJwk).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(5_000);
        await firstSettled;
        await joinedSettled;

        await expect(verifier.verify(token)).resolves.toBeDefined();
        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it('does not store the late result of a timed-out flight', async () => {
        const token = await sign();
        vi.useFakeTimers();
        const { promise: late, resolve: release } = Promise.withResolvers<OAuth2JsonWebKey>();
        getJwk.mockImplementationOnce(() => late);
        const verifier = create({ timeout: 5 });

        const first = verifier.verify(token);
        const settled = expect(first).rejects.toBeInstanceOf(JWTError);
        await vi.waitFor(() => expect(getJwk).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(5_000);
        await settled;

        release(jwk);
        await vi.advanceTimersByTimeAsync(0);

        await verifier.verify(token);
        expect(getJwk).toHaveBeenCalledTimes(2);
    });

    it.each([
        { ttl: -1 },
        { ttl: NaN },
        { ttl: Infinity },
        { timeout: 0 },
        { timeout: NaN },
        { timeout: 2_147_484 },
    ])('rejects invalid options %o', (options) => {
        expect(() => create(options)).toThrow(TypeError);
    });
});
