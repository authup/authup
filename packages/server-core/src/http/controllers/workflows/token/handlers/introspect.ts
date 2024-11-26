/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/schema';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import {
    OAuth2TokenManager,
    loadOAuth2SubEntity,
    loadOAuth2SubPermissions,
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

    const permissions = await loadOAuth2SubPermissions(payload.sub_kind, payload.sub, payload.scope);

    const output : OAuth2TokenIntrospectionResponse = {
        active: await tokenManager.isActive(token),
        permissions,
        ...payload,
        ...resolveOpenIdClaimsFromSubEntity(
            payload.sub_kind,
            await loadOAuth2SubEntity(payload.sub_kind, payload.sub, payload.scope),
        ),
    };

    return send(res, output);
}
