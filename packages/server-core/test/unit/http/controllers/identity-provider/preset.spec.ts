/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderPreset } from '@authup/core-kit';
import { createOAuth2IdentityProviderFlow } from '../../../../../src';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import { useSuperTest } from '../../../../utils/supertest';

describe('src/http/controllers/identity-provider', () => {
    let superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should work with protocol config', async () => {
        const data : Partial<OAuth2IdentityProvider> = {
            slug: 'google',
            name: 'google',
            enabled: true,
            preset: IdentityProviderPreset.GOOGLE,
            client_id: 'client',
            client_secret: 'start123',
        };
        const response = await superTest
            .post('/identity-providers')
            .send(data)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        const flow = createOAuth2IdentityProviderFlow(response.body);
        expect(flow.buildAuthorizeURL()).toMatch(/^https:\/\/accounts.google.com\/o\/oauth2\/v2\//);
    });
});
