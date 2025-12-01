/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, OAuth2AuthorizationCodeRequest, Scope,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sanitizeError } from '../../../../../utils';
import { useOAuth2AuthorizationService } from '../../../../../core/oauth2';
import { sendClientResponse } from '../../../../response';

export async function serveAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    let codeRequest : OAuth2AuthorizationCodeRequest | undefined;

    let client : Client | undefined;
    let scopes : Scope[] | undefined;

    let error : Error | undefined;

    try {
        const authorizationService = useOAuth2AuthorizationService();
        const result = await authorizationService.validateWithRequest(req);

        client = result.client;
        scopes = result.clientScopes.map((s) => s.scope);

        codeRequest = result.data;
    } catch (e) {
        const normalized = sanitizeError(e);
        error = {
            ...normalized,
            message: normalized.message,
        };
    }

    return sendClientResponse(req, res, {
        path: '/authorize',
        data: {
            codeRequest,
            error,
            client,
            scopes,
        },
    });
}
