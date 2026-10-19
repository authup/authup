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
import type { ITokenCache } from 'vouchly';

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
    /**
     * Mints the client-credentials token remote mode introspects with.
     * Present: every token is verified by introspection (remote mode).
     */
    creator?: TokenCreator,
    /**
     * Caches verification results until the token's exp (remote: at most
     * maxRemoteCacheTTL). Default: no cache. A cached result is served
     * without asking authup again, so it outlives a disabled signing key
     * and a revoked token.
     */
    cache?: ITokenCache | false,
    /**
     * Separates the entries of verifiers sharing a cache passed in. Only
     * verifiers with the same configuration may share one namespace.
     * Default: `authup:<local|remote>:<baseURL>`.
     */
    cacheNamespace?: string,
    /**
     * Maximum TTL (in seconds) for caching remote introspection results.
     * Limits how long a revoked token can remain cached as valid.
     * If not set, or 0, the remaining token lifetime is used.
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
