/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { isSimpleMatch } from '@authup/kit';
import { OAuth2Error, hasOAuth2Scopes } from '@authup/specs';
import type { IOAuth2ClientRepository } from '../../../client/index.ts';
import type { IOAuth2ScopeRepository } from '../../../scope/index.ts';
import type {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestVerificationResult,
    OAuth2AuthorizationCodeRequestVerifierContext,
} from './types.ts';

export class OAuth2AuthorizationCodeRequestVerifier implements IOAuth2AuthorizationCodeRequestVerifier {
    protected clientRepository: IOAuth2ClientRepository;

    protected scopeRepository: IOAuth2ScopeRepository;

    constructor(ctx: OAuth2AuthorizationCodeRequestVerifierContext) {
        this.clientRepository = ctx.clientRepository;
        this.scopeRepository = ctx.scopeRepository;
    }

    /**
     * Verify validated authorization code request.
     * @param data
     */
    async verify(
        data: OAuth2AuthorizationCodeRequest,
    ) : Promise<OAuth2AuthorizationCodeRequestVerificationResult> {
        const client = await this.clientRepository.findOneByIdOrName(data.client_id, data.realm_id);
        if (!client) {
            throw OAuth2Error.clientInvalid();
        }

        data.client_id = client.id;
        data.realm_id = client.realm_id;

        const scopes = await this.scopeRepository.findByClientId(client.id);
        const scopeNames = scopes.map((scope) => scope.name);
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
            scopes,
        };
    }
}
