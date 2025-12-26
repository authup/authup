/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import { OAuth2AuthorizationCodeChallengeMethod, OAuth2Error } from '@authup/specs';
import { buildOAuth2CodeChallenge } from '../../helpers.ts';

import type { IOAuth2AuthorizationCodeRepository } from '../repository/index.ts';
import type { IOAuth2AuthorizationCodeVerifier, IOAuth2AuthorizationCodeVerifyOptions } from './types.ts';

export class OAuth2AuthorizationCodeVerifier implements IOAuth2AuthorizationCodeVerifier {
    protected repository : IOAuth2AuthorizationCodeRepository;

    constructor(repository: IOAuth2AuthorizationCodeRepository) {
        this.repository = repository;
    }

    async verify(code: string, options: IOAuth2AuthorizationCodeVerifyOptions) : Promise<OAuth2AuthorizationCode> {
        const entity = await this.repository.findOneById(code);
        if (!entity) {
            throw OAuth2Error.grantInvalid();
        }

        if (entity.redirect_uri) {
            if (!options.redirectUri || entity.redirect_uri !== options.redirectUri) {
                throw OAuth2Error.redirectUriMismatch();
            }
        }

        if (entity.code_challenge) {
            if (entity.code_challenge_method === OAuth2AuthorizationCodeChallengeMethod.PLAIN) {
                if (options.codeVerifier !== entity.code_challenge) {
                    throw OAuth2Error.grantInvalid('PKCE code_verifier mismatch.');
                }
            } else {
                if (!options.codeVerifier) {
                    throw OAuth2Error.grantInvalid('Code verifier invalid.');
                }

                const codeVerifierHash = await buildOAuth2CodeChallenge(options.codeVerifier);
                if (codeVerifierHash !== entity.code_challenge) {
                    throw OAuth2Error.grantInvalid('PKCE code_verifier mismatch.');
                }
            }
        }

        return entity;
    }

    async remove(entity: OAuth2AuthorizationCode): Promise<void> {
        return this.removeById(entity.id);
    }

    async removeById(code: string): Promise<void> {
        await this.repository.removeById(code);
    }
}
