/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2OpenIDProviderMetadata } from '@authup/core';
import { OAuth2AuthorizationResponseType } from '@authup/core';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useConfig } from '../../../../../config';

export async function getOpenIdConfigurationRouteHandler(req: Request, res: Response) : Promise<any> {
    const config = await useConfig();

    // todo: this can be cached :)

    const configuration : OAuth2OpenIDProviderMetadata = {
        issuer: config.get('publicUrl'),

        authorization_endpoint: new URL('authorize', config.get('publicUrl')).href,

        jwks_uri: new URL('jwks', config.get('publicUrl')).href,

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

        token_endpoint: new URL('token', config.get('publicUrl')).href,

        introspection_endpoint: new URL('token/introspect', config.get('publicUrl')).href,

        revocation_endpoint: new URL('token', config.get('publicUrl')).href,

        // -----------------------------------------------------------

        service_documentation: 'https://authup.org/',

        userinfo_endpoint: new URL('users/@me', config.get('publicUrl')).href,
    };

    return send(res, configuration);
}
