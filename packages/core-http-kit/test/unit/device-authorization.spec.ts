/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryTransport } from 'hapic';
import type { MemoryTransportFetch, TransportRequest } from 'hapic';
import { OAuth2TokenGrant } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { Client } from '../../src';

const DEVICE_AUTHORIZATION_RESPONSE = {
    device_code: 'a'.repeat(64),
    user_code: 'BCDF-GHJK',
    verification_uri: 'http://fake.test/device',
    verification_uri_complete: 'http://fake.test/device?user_code=BCDF-GHJK',
    expires_in: 600,
    interval: 5,
};

const DEVICE_AUTHORIZATION_INFO = {
    client: {
        id: 'client-id',
        name: 'tv',
        displayName: 'TV',
        builtIn: false,
        createdAt: '2026-01-01T00:00:00.000Z',
    },
    realm: {
        id: 'realm-id',
        name: 'master',
        displayName: null,
    },
    scope: 'global openid',
};

function createClient(fetch?: MemoryTransportFetch) {
    const transport = new MemoryTransport({ fetch });
    const client = new Client({
        baseURL: 'http://fake.test/',
        transport,
    });

    return { client, transport };
}

function readHeaders(request: TransportRequest) : Headers {
    return new Headers(request.headers);
}

function readForm(request: TransportRequest) : Record<string, string> {
    if (!(request.body instanceof URLSearchParams)) {
        throw new Error('The request body is not urlencoded.');
    }

    return Object.fromEntries(request.body);
}

function readJSON(request: TransportRequest) : unknown {
    if (typeof request.body !== 'string') {
        throw new Error('The request body is not a serialized document.');
    }

    return JSON.parse(request.body);
}

describe('src/domains/workflows/oauth2/device-authorization', () => {
    it('should post an urlencoded request with Accept application/json and answer every field', async () => {
        const { client, transport } = createClient(() => ({ body: DEVICE_AUTHORIZATION_RESPONSE }));

        const response = await client.deviceAuthorization.create({
            client_id: 'foo',
            scope: ['global', 'openid'],
        });

        expect(response).toEqual(DEVICE_AUTHORIZATION_RESPONSE);

        expect(transport.requests).toHaveLength(1);
        const [request] = transport.requests;
        expect(request.method).toEqual('POST');
        expect(request.url).toEqual('http://fake.test/device_authorization');

        const headers = readHeaders(request);
        expect(headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
        expect(headers.get('accept')).toEqual('application/json');

        expect(readForm(request)).toEqual({
            client_id: 'foo',
            scope: 'global openid',
        });
    });

    it('should not send the client authorization header on create', async () => {
        const { client, transport } = createClient(() => ({ body: DEVICE_AUTHORIZATION_RESPONSE }));
        client.setAuthorizationHeader({ type: 'Bearer', token: 'abc' });

        await client.deviceAuthorization.create({ client_id: 'foo' });

        expect(readHeaders(transport.requests[0]).has('authorization')).toBe(false);
    });

    it('should keep the client authorization header on create when inherited', async () => {
        const { client, transport } = createClient(() => ({ body: DEVICE_AUTHORIZATION_RESPONSE }));
        client.setAuthorizationHeader({ type: 'Bearer', token: 'abc' });

        await client.deviceAuthorization.create({ client_id: 'foo' }, { authorizationHeaderInherit: true });

        expect(readHeaders(transport.requests[0]).get('authorization')).toEqual('Bearer abc');
    });

    it('should replace the client authorization header with the request one', async () => {
        const { client, transport } = createClient(() => ({ body: DEVICE_AUTHORIZATION_RESPONSE }));
        client.setAuthorizationHeader({ type: 'Bearer', token: 'abc' });

        await client.deviceAuthorization.create({ client_id: 'foo' }, { authorizationHeader: { type: 'Bearer', token: 'other' } });

        expect(readHeaders(transport.requests[0]).get('authorization')).toEqual('Bearer other');
    });

    it('should move the client credentials from the body into a basic header', async () => {
        const { client, transport } = createClient(() => ({ body: DEVICE_AUTHORIZATION_RESPONSE }));
        client.setAuthorizationHeader({ type: 'Bearer', token: 'abc' });

        await client.deviceAuthorization.create({
            client_id: 'foo',
            client_secret: 'bar',
            scope: 'global',
        }, { clientCredentialsAsHeader: true });

        const [request] = transport.requests;
        expect(readHeaders(request).get('authorization')).toEqual('Basic Zm9vOmJhcg==');
        expect(readForm(request)).toEqual({ scope: 'global' });
    });

    it('should keep the client authorization header on lookup', async () => {
        const { client, transport } = createClient(() => ({ body: DEVICE_AUTHORIZATION_INFO }));
        client.setAuthorizationHeader({ type: 'Bearer', token: 'abc' });

        const info = await client.deviceAuthorization.lookup({ user_code: 'BCDF-GHJK' });

        expect(info).toEqual(DEVICE_AUTHORIZATION_INFO);

        const [request] = transport.requests;
        expect(request.method).toEqual('POST');
        expect(request.url).toEqual('http://fake.test/device_authorization/lookup');

        const headers = readHeaders(request);
        expect(headers.get('authorization')).toEqual('Bearer abc');
        expect(headers.get('content-type')).toContain('application/json');

        expect(readJSON(request)).toEqual({ user_code: 'BCDF-GHJK' });
    });

    it('should post approve and deny with the client authorization header', async () => {
        const { client, transport } = createClient((request) => ({ body: { status: request.url.endsWith('/approve') ? 'approved' : 'denied' } }));
        client.setAuthorizationHeader({ type: 'Bearer', token: 'abc' });

        const approved = await client.deviceAuthorization.approve({ user_code: 'BCDF-GHJK' });
        const denied = await client.deviceAuthorization.deny({ user_code: 'BCDF-GHJK' });

        expect(approved).toEqual({ status: 'approved' });
        expect(denied).toEqual({ status: 'denied' });

        expect(transport.requests).toHaveLength(2);
        expect(transport.requests[0].url).toEqual('http://fake.test/device_authorization/approve');
        expect(transport.requests[1].url).toEqual('http://fake.test/device_authorization/deny');

        for (const request of transport.requests) {
            expect(request.method).toEqual('POST');
            expect(readHeaders(request).get('authorization')).toEqual('Bearer abc');
            expect(readJSON(request)).toEqual({ user_code: 'BCDF-GHJK' });
        }
    });
});

describe('src/domains/workflows/oauth2/token', () => {
    it('should send the device code grant type', async () => {
        const { client, transport } = createClient(() => ({
            body: {
                access_token: 'at',
                expires_in: 900,
                token_type: 'Bearer',
            },
        }));

        const response = await client.token.createWithDeviceCode({
            device_code: 'a'.repeat(64),
            client_id: 'foo',
        });

        expect(response.access_token).toEqual('at');

        const [request] = transport.requests;
        expect(request.method).toEqual('POST');
        expect(request.url).toEqual('http://fake.test/token');
        expect(readForm(request)).toEqual({
            grant_type: OAuth2TokenGrant.DEVICE_CODE,
            device_code: 'a'.repeat(64),
            client_id: 'foo',
        });
    });
});
