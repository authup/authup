/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import { OAuth2AuthorizationCodeChallengeMethod, OAuth2GrantError } from '@authup/specs';
import { buildOAuth2CodeChallenge } from '../../helpers.ts';

import type { IOAuth2AuthorizationCodeRepository } from '../repository/index.ts';
import type { IOAuth2AuthorizationCodeVerifier, IOAuth2AuthorizationCodeVerifyOptions } from './types.ts';

export class OAuth2AuthorizationCodeVerifier implements IOAuth2AuthorizationCodeVerifier {
    protected repository : IOAuth2AuthorizationCodeRepository;

    constructor(repository: IOAuth2AuthorizationCodeRepository) {
        this.repository = repository;
    }

    async verify(code: string, options: IOAuth2AuthorizationCodeVerifyOptions) : Promise<OAuth2AuthorizationCode> {
        const entity = await this.repository.popOneById(code);
        if (!entity) {
            throw OAuth2GrantError.invalid();
        }

        // RFC 6749 §4.1.3: if the client was issued a client_id, verify the
        // authorization code was issued to the authenticated client. Always
        // require a clientId to be supplied so a malformed token request can't
        // bypass the binding by omitting it.
        if (entity.client_id) {
            if (!options.clientId || options.clientId !== entity.client_id) {
                throw OAuth2GrantError.invalid();
            }
        }

        // Realm binding (defense in depth): the code's realm (the authorizing
        // identity's realm) must match the authenticated client's realm. Blocks
        // redeeming a realm-A identity's code against a realm-B client — covers
        // codes minted outside OAuth2Authorization.authorize() (identity-provider
        // callback) and any in-flight codes issued before the authorize-side gate.
        if (options.realmId && entity.realm_id && entity.realm_id !== options.realmId) {
            throw OAuth2GrantError.invalid();
        }

        if (entity.redirect_uri) {
            if (!options.redirectUri || entity.redirect_uri !== options.redirectUri) {
                throw OAuth2GrantError.redirectUriMismatch();
            }
        }

        // Public clients MUST use PKCE (RFC 7636). Defense in depth in case
        // the authorize-side check was bypassed or the client's
        // is_confidential flag changed between authorize and token.
        if (options.clientIsPublic && !entity.code_challenge) {
            throw OAuth2GrantError.invalid('PKCE is required for public clients.');
        }

        if (entity.code_challenge) {
            if (!options.codeVerifier) {
                throw OAuth2GrantError.invalid('Code verifier invalid.');
            }

            // RFC 7636 §4.3: code_challenge_method defaults to "plain" when
            // absent. Only treat the challenge as S256 when the client
            // explicitly sent code_challenge_method=S256.
            if (entity.code_challenge_method === OAuth2AuthorizationCodeChallengeMethod.SHA_256) {
                const codeVerifierHash = await buildOAuth2CodeChallenge(options.codeVerifier);
                if (codeVerifierHash !== entity.code_challenge) {
                    throw OAuth2GrantError.invalid('PKCE code_verifier mismatch.');
                }
            } else if (options.codeVerifier !== entity.code_challenge) {
                throw OAuth2GrantError.invalid('PKCE code_verifier mismatch.');
            }
        }

        return entity;
    }
}
