/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, ClientScope, OAuth2AuthorizationCodeRequest,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useConfig } from '../../../../../config';
import { useOAuth2AuthorizationService } from '../../../../oauth2';

export async function serveAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    let codeRequest : OAuth2AuthorizationCodeRequest | undefined;

    let client : Client | undefined;
    let clientScopes : ClientScope[] | undefined;

    let error : Error | undefined;

    try {
        const authorizationService = useOAuth2AuthorizationService();
        const result = await authorizationService.validate(req);

        client = result.client;
        clientScopes = result.clientScopes;

        delete result.client;
        delete result.clientScopes;

        codeRequest = result;
    } catch (e) {
        error = e;
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
        window.error = ${error ? JSON.stringify(error) : 'undefined'};
        window.client = ${client ? JSON.stringify(client) : 'undefined'};
        window.clientScopes = ${clientScopes ? JSON.stringify(clientScopes) : 'undefined'};
        </script>
        <script type="module" src="${url.href}/client.js"></script>
    </body>
    </html>
    `;

    return send(res, content);
}
