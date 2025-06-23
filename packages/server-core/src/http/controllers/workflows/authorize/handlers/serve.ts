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
import { send } from 'routup';
import { useConfig } from '../../../../../config';
import { sanitizeError } from '../../../../../utils';
import { useOAuth2AuthorizationService } from '../../../../oauth2';

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
        error = sanitizeError(e);
    }

    // 3. pass to authorize :)
    const config = useConfig();

    const url = new URL('/public', config.publicUrl);

    const content = `
    <!DOCTYPE html>
    <html lang="">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authup</title>
        <link rel="stylesheet" type="text/css" href="${url.href}/client.css" />
    </head>
    <body>
        <div id="app"></div>
        <script>
        window.baseURL = "${config.publicUrl}";
        window.codeRequest = ${codeRequest ? JSON.stringify(codeRequest) : 'undefined'};
        window.error = ${error ? JSON.stringify({ ...error, message: error.message }) : 'undefined'};
        window.client = ${client ? JSON.stringify(client) : 'undefined'};
        window.scopes = ${scopes ? JSON.stringify(scopes) : 'undefined'};
        </script>
        <script type="module" src="${url.href}/client.js"></script>
    </body>
    </html>
    `;

    return send(res, content);
}
