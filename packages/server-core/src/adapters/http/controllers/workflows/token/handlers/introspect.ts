/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pickRecord } from '@authup/kit';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { IdentityPermissionService } from '../../../../../../services';
import {
    OAuth2IdentityResolver,
    OAuth2OpenIDClaimsBuilder,
    OAuth2TokenVerifier,
} from '../../../../../../core/oauth2';
import { OAuth2KeyRepository } from '../../../../../../core/oauth2/key';
import { OAuth2TokenRepository } from '../../../../../database/adapters/oauth2/token/repository';
import { extractTokenFromRequest } from '../utils';

export async function introspectTokenRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const token = await extractTokenFromRequest(req);

    const keyRepository = new OAuth2KeyRepository();
    const tokenRepository = new OAuth2TokenRepository();

    const verifier = new OAuth2TokenVerifier(
        keyRepository,
        tokenRepository,
    );

    const payload = await verifier.verify(token, {
        skipActiveCheck: true,
    });

    const dataSource = await useDataSource();
    const identityPermissionService = new IdentityPermissionService(dataSource);

    // todo: only receive client specific permissions
    const permissions = await identityPermissionService.getFor({
        id: payload.sub,
        type: payload.sub_kind,
        clientId: payload.client_id,
        realmId: payload.realm_id,
    });

    const identityResolver = new OAuth2IdentityResolver();
    const identity = await identityResolver.resolve(payload);

    const claimsBuilder = new OAuth2OpenIDClaimsBuilder();
    const claims = claimsBuilder.fromIdentity(identity);

    const output : OAuth2TokenIntrospectionResponse = {
        active: await tokenRepository.isActive(token),
        // todo: permissions property should be removed.
        permissions: permissions.map((permission) => pickRecord(permission, ['name', 'client_id', 'realm_id'])),
        ...payload,
        ...claims,
    };

    return send(res, output);
}
