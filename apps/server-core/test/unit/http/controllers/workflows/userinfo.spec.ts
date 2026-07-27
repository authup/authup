/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import { httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

// The OIDC userinfo endpoint is a dedicated flat route: it must never adopt
// the { data, meta } entity-record envelope, and discovery must advertise it.
describe('src/http/controllers/workflows/userinfo', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the authenticated user as a flat document', async () => {
        const response = await suite.client.userInfo.get<Record<string, any>>();

        expect(response.name).toEqual('admin');
        expect(response.id).toBeDefined();
        expect(response.data).toBeUndefined();
        expect(response.meta).toBeUndefined();
    });

    it('should reject an unauthenticated request', async () => {
        const response = await httpRequest(suite, 'GET', '/userinfo');

        expect(response.status).toEqual(401);
    });

    it('should be advertised by discovery', async () => {
        const response = await fetch(`${suite.baseURL}/realms/${REALM_MASTER_NAME}/.well-known/openid-configuration`);
        const discovery = await response.json();

        expect(discovery.userinfo_endpoint).toMatch(/\/userinfo$/);
    });
});
