/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType, OAuth2OpenIDProviderMetadata } from '@authelion/common';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { useConfig } from '../../../../config';
import { useDataSource } from '../../../../database';
import { RealmEntity } from '../../../../domains';

export async function getRealmOpenIdConfigurationRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const config = await useConfig();

    const configuration : OAuth2OpenIDProviderMetadata = {
        issuer: config.selfUrl,

        authorization_endpoint: new URL('authorize', config.selfUrl).href,

        jwks_uri: new URL(`realms/${entity.id}/certs`, config.selfUrl).href,

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

        introspection_endpoint: new URL('token', config.selfUrl).href,

        revocation_endpoint: new URL('token', config.selfUrl).href,

        // -----------------------------------------------------------

        service_documentation: 'https://authelion.net/',
    };

    return res.respond({
        data: configuration,
    });
}
