/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizeCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { isSimpleMatch } from '@authup/kit';
import { OAuth2Error, hasOAuth2Scopes } from '@authup/specs';
import type { IOAuth2ClientRepository } from '../../../client';
import type { IOAuth2ClientScopeRepository } from '../../../client-scope';
import type { OAuth2AuthorizationCodeRequestContainer } from '../../types';
import type { IOAuth2AuthorizationCodeRequestVerifier, OAuth2AuthorizationCodeRequestVerifierContext } from './types';

export class OAuth2AuthorizationCodeVerifier implements IOAuth2AuthorizationCodeRequestVerifier {
    protected clientRepository: IOAuth2ClientRepository;

    protected clientScopeRepository: IOAuth2ClientScopeRepository;

    constructor(ctx: OAuth2AuthorizationCodeRequestVerifierContext) {
        this.clientRepository = ctx.clientRepository;
        this.clientScopeRepository = ctx.clientScopeRepository;
    }

    async verify(
        data: OAuth2AuthorizeCodeRequest,
    ) : Promise<OAuth2AuthorizationCodeRequestContainer> {
        const client = await this.clientRepository.findOneByIdOrName(data.client_id, data.realm_id);
        if (!client) {
            throw OAuth2Error.clientInvalid();
        }

        data.client_id = client.id;

        const clientScopes = await this.clientScopeRepository.findByClientId(client.id);
        const scopeNames = clientScopes.map((clientScope) => clientScope.scope.name);
        if (data.scope) {
            if (
                !hasOAuth2Scopes(scopeNames, data.scope) &&
                !hasOAuth2Scopes(data.scope, ScopeName.GLOBAL)
            ) {
                throw OAuth2Error.scopeInsufficient();
            }
        } else {
            data.scope = scopeNames.join(' ');
        }

        if (client.redirect_uri) {
            const redirectUris = client.redirect_uri.split(',');

            // verifying scopes
            if (!isSimpleMatch(data.redirect_uri, redirectUris)) {
                throw OAuth2Error.redirectUriMismatch();
            }
        }

        return {
            data,
            client,
            clientScopes,
        };
    }
}
