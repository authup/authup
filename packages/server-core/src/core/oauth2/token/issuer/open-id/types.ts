/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import type { Identity } from '@authup/core-kit';
import type { IOAuth2TokenRepository } from '../../repository';
import type { IOAuth2TokenSigner } from '../../signer';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types';
import type { IIdentityResolver } from '../../../../identity';

export type OAuth2OpenIDTokenIssuerContext = {
    options?: OAuth2TokenIssuerOptions,

    repository: IOAuth2TokenRepository,
    signer: IOAuth2TokenSigner,

    identityResolver: IIdentityResolver
};

export interface IOAuth2OpenIDTokenIssuer extends IOAuth2TokenIssuer {
    issueWithIdentity(
        input: OAuth2TokenPayload,
        identity: Identity,
        options?: OAuth2TokenIssuerOptions
    ) : Promise<OAuth2TokenIssuerResponse>;
}
