/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType, OAuth2OpenIDProviderMetadata } from '@authelion/common';
import { NotFoundError } from '@ebec/http';
import {
    Request, Response, send, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RealmEntity } from '@authelion/server-database';
import { useConfig } from '../../../config';

export async function getRealmOpenIdConfigurationRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const config = await useConfig();

    const configuration : OAuth2OpenIDProviderMetadata = {
        issuer: config.get('selfUrl'),

        authorization_endpoint: new URL('authorize', config.get('selfUrl')).href,

        jwks_uri: new URL(`realms/${entity.id}/jwks`, config.get('selfUrl')).href,

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

        token_endpoint: new URL('token', config.get('selfUrl')).href,

        introspection_endpoint: new URL('token/introspect', config.get('selfUrl')).href,

        revocation_endpoint: new URL('token', config.get('selfUrl')).href,

        // -----------------------------------------------------------

        service_documentation: 'https://authelion.net/',

        userinfo_endpoint: new URL('users/@me', config.get('selfUrl')).href,
    };

    return send(res, configuration);
}
