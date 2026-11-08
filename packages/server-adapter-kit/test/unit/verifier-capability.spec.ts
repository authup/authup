/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { OAuth2TokenKind, isJWTError } from '@authup/specs';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vitest,
} from 'vitest';
import { MemoryTokenCache, TokenVerifier } from '../../src';
import { TokenPayload } from '../data/token';
import { Faker } from '../utils';

const BASE_URL = 'http://localhost:3001';
const AUDIENCE = 'storage';

function buildCapabilityPayload(input: Record<string, any> = {}) {
    const now = Math.floor(Date.now() / 1000);

    return {
        jti: '58b4ce4b-42bc-4ff2-9b55-32d9a14d77f1',
        sub: TokenPayload.sub,
        sub_kind: TokenPayload.sub_kind,
        realm_id: TokenPayload.realm_id,
        kind: OAuth2TokenKind.CAPABILITY,
        aud: AUDIENCE,
        cap: ['bucket:b:read'],
        act: { sub: 'actor', sub_kind: 'client' },
        client_id: 'actor',
        iat: now,
        exp: now + 3600,
        ...input,
    };
}

describe('verifier capability tokens', () => {
    let faker : Faker;
    let getJwk : ReturnType<typeof vitest.spyOn>;

    beforeAll(() => {
        faker = new Faker();
    });

    beforeEach(async () => {
        getJwk = vitest.spyOn(Client.prototype, 'getJwk').mockResolvedValue(await faker.useJwk());
    });

    afterEach(() => {
        getJwk.mockReset();
    });

    describe('default', () => {
        it('should deny a capability token', async () => {
            const verifier = new TokenVerifier({ baseURL: BASE_URL, jwkCache: false });

            await expect(verifier.verify(await faker.sign(buildCapabilityPayload())))
                .rejects.toSatisfy(isJWTError);
        });
    });

    describe('with the capability option', () => {
        let verifier : TokenVerifier;

        beforeEach(() => {
            verifier = new TokenVerifier({
                baseURL: BASE_URL,
                jwkCache: false,
                capability: { audience: AUDIENCE },
            });
        });

        it('should verify a capability token for its audience', async () => {
            const data = await verifier.verify(await faker.sign(buildCapabilityPayload()));

            expect(data.kind).toEqual(OAuth2TokenKind.CAPABILITY);
            expect(data.cap).toEqual(['bucket:b:read']);
            expect(data.act).toEqual({ sub: 'actor', sub_kind: 'client' });
        });

        it.each([
            ['another audience', { aud: 'other' }],
            ['no audience', { aud: undefined }],
            ['an access token', { kind: OAuth2TokenKind.ACCESS }],
            ['a refresh token', { kind: OAuth2TokenKind.REFRESH }],
            ['a token without a kind', { kind: undefined }],
        ])('should deny %s', async (_label, input) => {
            await expect(verifier.verify(await faker.sign(buildCapabilityPayload(input))))
                .rejects.toSatisfy(isJWTError);
        });

        it('should deny an expired capability token', async () => {
            const token = await faker.sign(buildCapabilityPayload({ exp: Math.floor(Date.now() / 1000) - 3600 }));

            await expect(verifier.verify(token)).rejects.toSatisfy(isJWTError);
        });

        it('should deny a token signed by another key', async () => {
            await expect(verifier.verify(await new Faker().sign(buildCapabilityPayload())))
                .rejects.toSatisfy(isJWTError);
        });

        it('should keep a shared cache from serving the result to a default verifier', async () => {
            const cache = new MemoryTokenCache();
            const capabilityVerifier = new TokenVerifier({
                baseURL: BASE_URL,
                jwkCache: false,
                cache,
                capability: { audience: AUDIENCE },
            });
            const defaultVerifier = new TokenVerifier({
                baseURL: BASE_URL,
                jwkCache: false,
                cache,
            });

            const token = await faker.sign(buildCapabilityPayload());

            await expect(capabilityVerifier.verify(token)).resolves.toBeDefined();
            await expect(defaultVerifier.verify(token)).rejects.toSatisfy(isJWTError);
        });

        it('should refuse remote mode', () => {
            expect(() => new TokenVerifier({
                baseURL: BASE_URL,
                creator: async () => ({
                    access_token: 'token', 
                    expires_in: 1, 
                    token_type: 'Bearer', 
                }),
                capability: { audience: AUDIENCE },
            })).toThrow();
        });

        it('should refuse an empty audience', () => {
            expect(() => new TokenVerifier({
                baseURL: BASE_URL,
                capability: { audience: '' },
            })).toThrow();
        });
    });
});
