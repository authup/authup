/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryTransport } from 'hapic';
import type { TransportRequest } from 'hapic';
import { OAuth2TokenGrant } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { Client } from '../../src';

const TOKEN_RESPONSE = {
    access_token: 'access',
    expires_in: 900,
    token_type: 'Bearer',
};

function readForm(request: TransportRequest) : Record<string, string> {
    if (!(request.body instanceof URLSearchParams)) {
        throw new Error('The request body is not urlencoded.');
    }

    return Object.fromEntries(request.body);
}

describe('src/domains/workflows/oauth2/token', () => {
    it('should send the otp of a password grant as a form field', async () => {
        const transport = new MemoryTransport({ fetch: () => ({ body: TOKEN_RESPONSE }) });
        const client = new Client({
            baseURL: 'http://fake.test/',
            transport,
        });

        const response = await client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
            otp: '123456',
        });

        expect(response.access_token).toEqual('access');
        expect(transport.requests).toHaveLength(1);

        const [request] = transport.requests;
        expect(request.url).toEqual('http://fake.test/token');
        expect(readForm(request)).toEqual({
            grant_type: OAuth2TokenGrant.PASSWORD,
            username: 'admin',
            password: 'start123',
            otp: '123456',
        });
    });
});
