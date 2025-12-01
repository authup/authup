/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { useConfig } from '../../../config';
import { OAuth2KeyRepository } from '../key';
import type { IOAuth2TokenIssuer, IOAuth2TokenVerifier } from '../token';
import {
    OAuth2AccessTokenIssuer,
    OAuth2RefreshTokenIssuer,
    OAuth2TokenSigner,
    OAuth2TokenVerifier,
} from '../token';
import { OAuth2TokenRepository } from '../token/repository';
import type { IOAuth2TokenRevoker } from '../token/revoker';
import { OAuth2TokenRevoker } from '../token/revoker';
import type { IGrant } from './type';

export abstract class BaseGrant implements IGrant {
    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected tokenVerifier : IOAuth2TokenVerifier;

    protected tokenRevoker : IOAuth2TokenRevoker;

    // -----------------------------------------------------

    constructor() {
        const config = useConfig();
        const tokenRepository = new OAuth2TokenRepository();

        const signerRepository = new OAuth2KeyRepository();
        const tokenSigner = new OAuth2TokenSigner(signerRepository);

        this.accessTokenIssuer = new OAuth2AccessTokenIssuer(
            tokenRepository,
            tokenSigner,
            {
                maxAge: config.tokenAccessMaxAge,
            },
        );

        this.refreshTokenIssuer = new OAuth2RefreshTokenIssuer(
            tokenRepository,
            tokenSigner,
            {
                maxAge: config.tokenRefreshMaxAge,
            },
        );

        this.tokenVerifier = new OAuth2TokenVerifier(
            signerRepository,
            tokenRepository,
        );

        this.tokenRevoker = new OAuth2TokenRevoker(tokenRepository);
    }

    // -----------------------------------------------------

    abstract run(request: Request): Promise<OAuth2TokenGrantResponse>;
}
