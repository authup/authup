/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2AuthorizationCodeChallengeMethod, OAuth2Error } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { OAuth2AuthorizeGrant, buildOAuth2CodeChallenge } from '../../../../core';
import type { IOAuth2AuthorizationCodeRepository } from '../../../../core';
import type { HTTPOAuth2AuthorizeGrantContext, IHTTPGrant } from './types';

export class HTTPOAuth2AuthorizeGrant extends OAuth2AuthorizeGrant implements IHTTPGrant {
    protected codeRepository : IOAuth2AuthorizationCodeRepository;

    constructor(ctx: HTTPOAuth2AuthorizeGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            refreshTokenIssuer: ctx.refreshTokenIssuer,
        });

        this.codeRepository = ctx.codeRepository;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const code = this.extractCodeParam(req);

        const entity = await this.codeRepository.findOneById(code);
        if (!entity) {
            throw OAuth2Error.grantInvalid();
        }

        if (entity.redirect_uri) {
            const redirectUri = this.extractRedirectURIParam(req);

            if (!redirectUri || entity.redirect_uri !== redirectUri) {
                throw OAuth2Error.redirectUriMismatch();
            }
        }

        if (entity.code_challenge) {
            const codeVerifier = this.extractParam(req, 'code_verifier');
            if (entity.code_challenge_method === OAuth2AuthorizationCodeChallengeMethod.PLAIN) {
                if (codeVerifier !== entity.code_challenge) {
                    throw OAuth2Error.grantInvalid('PKCE code_verifier mismatch.');
                }
            } else {
                const codeVerifierHash = await buildOAuth2CodeChallenge(codeVerifier);
                if (codeVerifierHash !== entity.code_challenge) {
                    throw OAuth2Error.grantInvalid('PKCE code_verifier mismatch.');
                }
            }
        }

        const tokenGrantResponse = await this.runWith(entity, {
            remote_address: getRequestIP(req, { trustProxy: true }),
        });

        await this.codeRepository.removeById(entity.id);

        return tokenGrantResponse;
    }

    protected extractRedirectURIParam(request: Request) : string {
        const redirectUri = this.extractParam(request, 'redirect_uri');
        if (!redirectUri) {
            throw OAuth2Error.redirectUriMismatch();
        }

        return redirectUri;
    }

    protected extractCodeParam(request: Request) : string {
        const code = this.extractParam(request, 'code');
        if (!code) {
            throw OAuth2Error.requestInvalid();
        }

        return code;
    }

    protected extractParam(req: Request, key: string) : string | undefined {
        let value : unknown = useRequestBody(req, key);
        if (!value) {
            value = useRequestQuery(req, key);
        }

        return typeof value === 'string' && value.length > 0 ?
            value :
            undefined;
    }
}
