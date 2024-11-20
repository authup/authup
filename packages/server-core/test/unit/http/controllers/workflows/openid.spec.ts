/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType } from '@authup/kit';
import { useConfig } from '../../../../../src';
import { createTestSuite } from '../../../../utils';

describe('src/http/controllers/auth/openid/*.ts', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    it('should return openid configuration', async () => {
        const config = useConfig();

        const response = await suite.client.getWellKnownOpenIDConfiguration();
        expect(response).toBeDefined();

        expect(response.issuer).toEqual(config.publicUrl);
        expect(response.authorization_endpoint).toEqual(new URL('authorize', config.publicUrl).href);
        expect(response.jwks_uri).toEqual(new URL('jwks', config.publicUrl).href);
        expect(response.response_types_supported).toEqual([
            OAuth2AuthorizationResponseType.CODE,
            OAuth2AuthorizationResponseType.TOKEN,
            OAuth2AuthorizationResponseType.NONE,
        ]);
        expect(response.token_endpoint).toEqual(new URL('token', config.publicUrl).href);
        expect(response.introspection_endpoint).toEqual(new URL('token/introspect', config.publicUrl).href);
        expect(response.userinfo_endpoint).toEqual(new URL('users/@me', config.publicUrl).href);
    });
});
