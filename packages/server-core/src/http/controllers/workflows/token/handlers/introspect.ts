/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { deserializeOAuth2Scope } from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { IdentityPermissionService } from '../../../../../services';
import {
    OAuth2TokenManager,
    loadOAuth2SubEntity,
    resolveOpenIdClaimsFromSubEntity,
} from '../../../../oauth2';
import { extractTokenFromRequest } from '../utils';

export async function introspectTokenRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const token = await extractTokenFromRequest(req);
    const tokenManager = new OAuth2TokenManager();

    const payload = await tokenManager.verify(token, {
        skipActiveCheck: true,
    });

    const dataSource = await useDataSource();
    const identityPermissionService = new IdentityPermissionService(dataSource);

    // only receive client specific permissions
    const permissions = await identityPermissionService.getFor({
        id: payload.sub,
        type: payload.sub_kind,
        clientId: payload.client_id,
        realmId: payload.realm_id,
    });

    const output : OAuth2TokenIntrospectionResponse = {
        active: await tokenManager.isActive(token),
        // todo: permissions property should be removed.
        permissions: permissions.map((permission) => pickRecord(permission, ['name', 'client_id', 'realm_id'])),
        ...payload,
        ...resolveOpenIdClaimsFromSubEntity(
            payload.sub_kind,
            await loadOAuth2SubEntity(
                payload.sub_kind,
                payload.sub,
                payload.scope ? deserializeOAuth2Scope(payload.scope) : []
                ,
            ),
        ),
    };

    return send(res, output);
}
