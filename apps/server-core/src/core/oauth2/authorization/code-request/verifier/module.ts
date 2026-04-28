/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { isSimpleMatch } from '@authup/kit';
import {
    OAuth2AuthorizationResponseType,
    OAuth2Error,
    hasOAuth2Scopes,
} from '@authup/specs';
import type { IOAuth2ClientRepository } from '../../../client/index.ts';
import type { IOAuth2ScopeRepository } from '../../../scope/index.ts';
import type {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestVerificationResult,
    OAuth2AuthorizationCodeRequestVerifierContext,
} from './types.ts';

function willIssueCode(responseType: string | undefined): boolean {
    if (!responseType) {
        return false;
    }
    return responseType.split(' ').includes(OAuth2AuthorizationResponseType.CODE);
}

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
        if (!data.client_id) {
            throw OAuth2Error.clientInvalid();
        }

        const client = await this.clientRepository.findOneByIdOrName(data.client_id, data.realm_id);
        if (!client) {
            throw OAuth2Error.clientInvalid();
        }

        if (!client.active) {
            throw OAuth2Error.clientInactive();
        }

        // Public clients MUST use PKCE for the code flow (RFC 7636 §4.4.1,
        // OAuth 2.1). Without PKCE a public client's code flow has no second
        // factor — anyone who intercepts the redirect can redeem the code at
        // /token. Only enforce when an authorization code will actually be
        // issued; implicit/id_token-only flows don't involve a code.
        if (!client.is_confidential && !data.code_challenge && willIssueCode(data.response_type)) {
            throw OAuth2Error.requestInvalid('PKCE code_challenge is required for public clients.');
        }

        // Public clients SHOULD include state to bind the redirect to the
        // initiating session and prevent CSRF (RFC 6749 §10.12). Confidential
        // clients are exempt because the /token exchange already authenticates
        // them via client_secret.
        if (!client.is_confidential && !data.state && willIssueCode(data.response_type)) {
            throw OAuth2Error.requestInvalid('state is required for public clients in the code flow.');
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

        if (client.redirect_uri && data.redirect_uri) {
            const redirectUris = client.redirect_uri.split(',');

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
