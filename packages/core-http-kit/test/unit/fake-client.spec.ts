/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createFakeClient, matchRoute } from '../../src/testing';
import type { FakeHandlerMap } from '../../src/testing';

describe('src/testing/matcher', () => {
    const handlers : FakeHandlerMap = {
        'GET /clients/:id': () => 'one',
        'GET /clients': () => 'many',
        'POST /clients': () => 'created',
        '*': () => 'fallthrough',
    };

    it('should match an exact path', () => {
        const match = matchRoute('GET', 'clients', handlers);
        expect(match).toBeDefined();
        expect(match!.handler({
            method: 'GET', 
            url: 'clients', 
            params: {},
        })).toEqual('many');
    });

    it('should capture :param segments', () => {
        const match = matchRoute('GET', '/clients/abc-123', handlers);
        expect(match).toBeDefined();
        expect(match!.params).toEqual({ id: 'abc-123' });
    });

    it('should distinguish methods', () => {
        const match = matchRoute('POST', 'clients', handlers);
        expect(match!.handler({
            method: 'POST', 
            url: 'clients', 
            params: {},
        })).toEqual('created');
    });

    it('should ignore query strings', () => {
        const match = matchRoute('GET', 'clients/abc?fields=%2Bsecret', handlers);
        expect(match!.params).toEqual({ id: 'abc' });
    });

    it('should reject mismatched segment counts', () => {
        const match = matchRoute('GET', 'clients/abc/roles', handlers);
        expect(match!.handler({
            method: 'GET', 
            url: '', 
            params: {},
        })).toEqual('fallthrough');
    });

    it('should prefer a specific pattern over a preceding catch-all', () => {
        const match = matchRoute('GET', 'clients/abc', {
            '*': () => 'fallthrough',
            'GET /clients/:id': () => 'one',
        });
        expect(match!.handler({
            method: 'GET', 
            url: '', 
            params: {},
        })).toEqual('one');
    });

    it('should return null without any match', () => {
        const match = matchRoute('GET', 'clients', { 'DELETE /clients': () => 'nope' });
        expect(match).toBeNull();
    });
});

describe('src/testing/module', () => {
    it('should serve a handler response through a resource api', async () => {
        const client = createFakeClient({
            handlers: {
                'GET /clients/:id': ({ params }) => ({
                    data: {
                        id: params.id,
                        name: 'test-client',
                    },
                    meta: {},
                }),
            },
        });

        const response = await client.client.getOne('abc-123');
        expect(response.data).toEqual({ id: 'abc-123', name: 'test-client' });
    });

    it('should serve the default fallback for unmatched routes', async () => {
        const client = createFakeClient();

        const output = await client.client.getMany();
        expect(output).toEqual({ data: [], meta: { total: 0 } });
    });

    it('should serve a custom fallback', async () => {
        const client = createFakeClient({ fallback: ({ url }) => ({ echoed: url }) });

        const response = await client.get('something/else');
        expect(response.data).toEqual({ echoed: 'something/else' });
        expect(response.status).toEqual(200);
        expect(response.headers).toBeInstanceOf(Headers);
    });

    it('should pass the request body to handlers', async () => {
        const client = createFakeClient({ handlers: { 'POST /clients': ({ body }) => ({ data: body, meta: {} }) } });

        const response = await client.client.create({ name: 'foo' });
        expect(response.data).toMatchObject({ name: 'foo' });
    });

    it('should record dispatched requests', async () => {
        const client = createFakeClient();

        await client.client.getOne('abc');
        await client.client.getMany();

        expect(client.requests).toHaveLength(2);
        expect(client.requests[0].method).toEqual('GET');
        expect(client.requests[0].url).toEqual('clients/abc');
    });

    it('should support async handlers', async () => {
        const client = createFakeClient({ handlers: { 'GET /realms': async () => ({ data: [{ name: 'master' }], meta: { total: 1 } }) } });

        const output = await client.realm.getMany();
        expect(output.data).toHaveLength(1);
    });
});
