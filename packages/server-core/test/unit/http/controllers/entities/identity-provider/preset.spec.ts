/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderPreset } from '@authup/core-kit';
import { createOAuth2IdentityProviderFlow } from '../../../../../../src';
import { createTestSuite } from '../../../../../utils';

describe('src/http/controllers/identity-provider', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
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

        const response = await suite.client
            .identityProvider
            .create(data);

        expect(response).toBeDefined();

        const flow = createOAuth2IdentityProviderFlow(response);
        expect(flow.buildAuthorizeURL()).toMatch(/^https:\/\/accounts.google.com\/o\/oauth2\/v2\//);
    });
});
