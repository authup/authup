/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenPayload,
    OAuth2TokenPermission,
} from '@authup/specs';
import type { TokenCreator } from '@authup/core-http-kit';
import type { ITokenVerifierCache } from './cache';

export interface ITokenVerifier {
    verify(token: string) : Promise<TokenVerificationData>
}

export type TokenVerifierContext = {
    baseURL: string,
    creator?: TokenCreator,
    cache?: ITokenVerifierCache,
    /**
     * Maximum TTL (in seconds) for caching remote introspection results.
     * Limits how long a revoked token can remain cached as valid.
     * If not set, the remaining token lifetime is used.
     */
    maxRemoteCacheTTL?: number,
};

export type TokenVerificationData = OAuth2TokenPayload & {
    permissions: OAuth2TokenPermission[]
};

export type TokenVerificationDataInput = OAuth2TokenPayload & {
    permissions?: OAuth2TokenPermission[]
};
