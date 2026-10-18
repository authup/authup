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
import type { IVerifierCache } from './cache';

export interface ITokenVerifier {
    verify(token: string, options?: TokenVerifyOptions) : Promise<TokenVerificationData>
}

export type TokenVerifyOptions = {
    /**
     * RFC 8705: SHA-256 DER thumbprint of the client certificate presented
     * alongside the token, or a lazy provider for it (only invoked when the
     * token carries a `cnf` binding). A certificate-bound token fails
     * verification unless the resolved thumbprint matches `cnf.x5t#S256`.
     */
    certificateThumbprint?: string | (() => string | undefined | Promise<string | undefined>),
};

export type TokenVerifierContext = {
    baseURL: string,
    creator?: TokenCreator,
    cache?: IVerifierCache,
    /**
     * Maximum TTL (in seconds) for caching remote introspection results.
     * Limits how long a revoked token can remain cached as valid.
     * If not set, the remaining token lifetime is used.
     */
    maxRemoteCacheTTL?: number,
    /**
     * Caches the signing keys used for local verification per realm and key
     * id, in process memory. `false` fetches the key for every verification.
     */
    jwkCache?: {
        /**
         * Seconds a resolved key stays cached. Default 300.
         */
        ttl?: number,
        /**
         * Seconds a key fetch may take before it fails and the next
         * lookup starts a fresh one. Default 10.
         */
        timeout?: number,
    } | false,
};

export type TokenVerificationData = OAuth2TokenPayload & {
    permissions: OAuth2TokenPermission[]
};

export type TokenVerificationDataInput = OAuth2TokenPayload & {
    permissions?: OAuth2TokenPermission[]
};
