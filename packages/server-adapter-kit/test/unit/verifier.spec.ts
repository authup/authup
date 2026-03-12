/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { JWTError } from '@authup/specs';
import {
    beforeAll, describe, expect, it, vitest,
} from 'vitest';
import { Client } from '@authup/core-http-kit';
import { TokenAPI } from '@hapic/oauth2';
import { MemoryTokenVerifierCache, TokenVerifier } from '../../src';
import { TokenPayload, introspectToken } from '../data/token';
import { Faker } from '../utils';

describe('verifier', () => {
    let token : string;
    beforeAll(async () => {
        const faker = new Faker();

        token = await faker.sign(TokenPayload);

        vitest.spyOn(TokenAPI.prototype, 'introspect').mockImplementation((options) => introspectToken(options));
        vitest.spyOn(Client.prototype, 'getJwk').mockReturnValue(faker.useJwk());
    });

    it('should verify token local', async () => {
        const cache = new MemoryTokenVerifierCache();
        const tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            cache,
        });

        const output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();

        const outputCached = await cache.get(token);
        expect(output).toEqual(outputCached);
    });

    it('should not verify token local', async () => {
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        try {
            await tokenVerifier.verify(ErrorCode.JWT_INVALID);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(JWTError);
        }
    });

    it('should verify token remote', async () => {
        const cache = new MemoryTokenVerifierCache();
        const tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            cache,
            creator: () => Promise.resolve({
                access_token: 'foo',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        });

        const output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();

        const outputCached = await cache.get(token);
        expect(output).toEqual(outputCached);
    });

    it('should not verify token remote', async () => {
        const tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            creator: () => Promise.resolve({
                access_token: 'foo',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        });

        try {
            await tokenVerifier.verify(ErrorCode.JWT_INVALID);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(JWTError);
        }
    });
});
