/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, TokenError } from '@authup/kit';
import { Client } from '@authup/core-http-kit';
import { TokenAPI } from '@hapic/oauth2';
import { TokenVerifier } from '../../src';
import { TokenPayload, introspectToken } from '../data/token';
import { Faker } from '../utils';

describe('src/oauth2/**', () => {
    let token : string;
    beforeAll(async () => {
        const faker = new Faker();

        token = await faker.sign(TokenPayload);

        jest.spyOn(TokenAPI.prototype, 'introspect').mockImplementation(introspectToken);
        jest.spyOn(Client.prototype, 'getJwk').mockReturnValue(faker.useJwk());
    });

    it('should verify token local', async () => {
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        let output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();

        // access cache
        output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();
    });

    it('should not verify token local', async () => {
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        try {
            await tokenVerifier.verify(ErrorCode.TOKEN_INVALID);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(TokenError);
        }
    });

    it('should verify token remote', async () => {
        let tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            creator: () => Promise.resolve({
                access_token: 'foo',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        });

        let output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();

        tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            creator: {
                type: 'robot',
                id: 'foo',
                secret: 'bar',
            },
        });

        // access cache
        output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();
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
            await tokenVerifier.verify(ErrorCode.TOKEN_INVALID);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(TokenError);
        }
    });
});
