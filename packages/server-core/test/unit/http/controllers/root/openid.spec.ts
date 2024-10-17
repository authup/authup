/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2OpenIDProviderMetadata } from '@authup/kit';
import { OAuth2AuthorizationResponseType } from '@authup/kit';
import { useConfig } from '../../../../../src';
import { useSuperTest } from '../../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';

describe('src/http/controllers/auth/openid/*.ts', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should return openid configuration', async () => {
        const config = useConfig();

        const response = await superTest
            .get('/.well-known/openid-configuration');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        const data = response.body as OAuth2OpenIDProviderMetadata;

        expect(data.issuer).toEqual(config.publicUrl);
        expect(data.authorization_endpoint).toEqual(new URL('authorize', config.publicUrl).href);
        expect(data.jwks_uri).toEqual(new URL('jwks', config.publicUrl).href);
        expect(data.response_types_supported).toEqual([
            OAuth2AuthorizationResponseType.CODE,
            OAuth2AuthorizationResponseType.TOKEN,
            OAuth2AuthorizationResponseType.NONE,
        ]);
        expect(data.token_endpoint).toEqual(new URL('token', config.publicUrl).href);
        expect(data.introspection_endpoint).toEqual(new URL('token/introspect', config.publicUrl).href);
        expect(data.userinfo_endpoint).toEqual(new URL('users/@me', config.publicUrl).href);
    });
});
