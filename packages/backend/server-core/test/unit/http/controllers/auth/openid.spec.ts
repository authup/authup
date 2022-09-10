/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType, OAuth2OpenIDProviderMetadata } from '@authelion/common';
import { useSuperTest } from '../../../../utils/supertest';
import { DatabaseRootSeederResult, useConfigSync } from '../../../../../src';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';

describe('src/http/controllers/auth/openid/*.ts', () => {
    const config = useConfigSync();
    const superTest = useSuperTest();

    let seederResponse : DatabaseRootSeederResult | undefined;

    beforeAll(async () => {
        seederResponse = await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should return openid configuration', async () => {
        const response = await superTest
            .get('/.well-known/openid-configuration');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        const data = response.body as OAuth2OpenIDProviderMetadata;

        expect(data.issuer).toEqual(config.selfUrl);
        expect(data.authorization_endpoint).toEqual(new URL('authorize', config.selfUrl).href);
        expect(data.jwks_uri).toEqual(new URL('jwks', config.selfUrl).href);
        expect(data.response_type_supported).toEqual([
            OAuth2AuthorizationResponseType.CODE,
            OAuth2AuthorizationResponseType.TOKEN,
            OAuth2AuthorizationResponseType.NONE,
        ]);
        expect(data.token_endpoint).toEqual(new URL('token', config.selfUrl).href);
        expect(data.introspection_endpoint).toEqual(new URL('token/introspect', config.selfUrl).href);
        expect(data.userinfo_endpoint).toEqual(new URL('users/@me', config.selfUrl).href);
    });
});
