/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType, OAuth2OpenIDProviderMetadata } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { useConfig } from '../../../../../config';

export async function getOpenIdConfigurationRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const config = await useConfig();

    const configuration : OAuth2OpenIDProviderMetadata = {
        issuer: config.selfUrl,

        authorization_endpoint: new URL('authorize', config.selfUrl).href,

        jwks_uri: new URL('jwks', config.selfUrl).href,

        response_type_supported: [
            OAuth2AuthorizationResponseType.CODE,
            OAuth2AuthorizationResponseType.TOKEN,
            OAuth2AuthorizationResponseType.NONE,
        ],

        subject_types_supported: [
            'public',
        ],

        id_token_signing_alg_values_supported: [
            'HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'none',
        ],

        token_endpoint: new URL('token', config.selfUrl).href,

        introspection_endpoint: new URL('token/introspect', config.selfUrl).href,

        revocation_endpoint: new URL('token', config.selfUrl).href,

        // -----------------------------------------------------------

        service_documentation: 'https://authelion.net/',

        userinfo_endpoint: new URL('users/@me', config.selfUrl).href,
    };

    return res.respond({
        data: configuration,
    });
}
