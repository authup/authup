/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryTransport } from 'hapic';
import { describe, expect, it } from 'vitest';
import { Client } from '../../src';

function createClient() {
    return new Client({
        baseURL: 'http://fake.test/',
        transport: new MemoryTransport({}),
    });
}

describe('src/domains/entities/identity-provider', () => {
    it('should build the authorize uri for a device user code', () => {
        const client = createClient();

        const url = client.identityProvider.getAuthorizeUri('provider-1', { userCode: 'BCDFGHJK' });

        expect(url).toEqual('http://fake.test/identity-providers/provider-1/authorize-out?user_code=BCDFGHJK');
    });

    it('should prefer the code request over the device user code', () => {
        const client = createClient();

        const url = client.identityProvider.getAuthorizeUri('provider-1', {
            codeRequest: { response_type: 'code', realm_id: 'realm-a' },
            userCode: 'BCDFGHJK',
        });

        expect(url).toContain('?codeRequest=');
        expect(url).not.toContain('user_code');
    });

    it('should build the bare authorize uri with neither', () => {
        const client = createClient();

        expect(client.identityProvider.getAuthorizeUri('provider-1'))
            .toEqual('http://fake.test/identity-providers/provider-1/authorize-out');
    });

    it.each([
        ['createLinkRequest', 'link-request'],
        ['completeLogin', 'login-complete'],
        ['confirmLinkRequest', 'link-confirm'],
    ] as const)('should keep the id of %s one path segment', async (method, action) => {
        const transport = new MemoryTransport({ fetch: () => ({ body: {} }) });
        const client = new Client({ baseURL: 'http://fake.test/', transport });
        const id = '../../clients/11111111-1111-1111-1111-111111111111/secret#';

        await client.identityProvider[method](id, 'x');

        expect(transport.requests).toHaveLength(1);
        expect(new URL(transport.requests[0].url).pathname)
            .toEqual(`/identity-providers/${encodeURIComponent(id)}/${action}`);
    });
});
