/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { isSimpleMatch, isUUID } from '@authup/kit';
import {
    OAuth2ClientError,
    OAuth2GrantError,
    OAuth2RequestError,
    OAuth2ScopeError,
    hasOAuth2Scopes,
} from '@authup/specs';
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
        if (!data.client_id) {
            throw OAuth2ClientError.invalid();
        }

        // A name-identified client needs a realm hint to resolve deterministically
        // — every realm has a built-in `web` client, so `client_id=web` without a
        // realm would bind to an arbitrary realm's client (and, post realm-gate,
        // produce a confusing mismatch against a random realm). Require the hint.
        if (!isUUID(data.client_id) && !data.realm_id) {
            throw OAuth2RequestError.malformed('A realm is required to resolve a client by name.');
        }

        const client = await this.clientRepository.findOneByIdOrName(data.client_id, data.realm_id);
        if (!client) {
            throw OAuth2ClientError.invalid();
        }

        if (!client.active) {
            throw OAuth2ClientError.inactive();
        }

        // Public clients MUST use PKCE (RFC 7636 §4.4.1, OAuth 2.1). Without
        // PKCE a public client's code flow has no second factor — anyone who
        // intercepts the redirect can redeem the code at /token. The code flow
        // is the only supported response type, so this holds unconditionally.
        if (!client.is_confidential && !data.code_challenge) {
            throw OAuth2RequestError.malformed('PKCE code_challenge is required for public clients.');
        }

        // Public clients SHOULD include state to bind the redirect to the
        // initiating session and prevent CSRF (RFC 6749 §10.12). Confidential
        // clients are exempt because the /token exchange already authenticates
        // them via client_secret.
        if (!client.is_confidential && !data.state) {
            throw OAuth2RequestError.malformed('state is required for public clients in the code flow.');
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
                throw OAuth2ScopeError.insufficient();
            }
        } else {
            data.scope = scopeNames.join(' ');
        }

        // Verified only when matched against a registered, non-null pattern. A
        // pattern-less client leaves data.redirect_uri unchecked (any value
        // passes) — flag it so consumers never auto-redirect to it.
        const redirectUriVerified = !!(client.redirect_uri && data.redirect_uri);
        if (client.redirect_uri && data.redirect_uri) {
            const redirectUris = client.redirect_uri.split(',');

            if (!isSimpleMatch(data.redirect_uri, redirectUris)) {
                throw OAuth2GrantError.redirectUriMismatch();
            }
        }

        return {
            data,
            client,
            scopes,
            redirectUriVerified,
        };
    }
}
