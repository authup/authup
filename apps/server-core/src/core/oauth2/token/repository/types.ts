/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';

export interface IOAuth2TokenRepository {
    /**
     * Set a token inactive.
     *
     * @param id JTI
     * @param exp Expiration date in unix timestamp
     */
    setInactive(id: string, exp?: number) : Promise<void>;

    /**
     * Check if a token by its jti is active.
     *
     * @param id JTI
     */
    isInactive(id: string): Promise<boolean>;

    // -----------------------------------------------------

    /**
     * Find refresh token by jti.
     *
     * @param id JTI
     */
    findOneById(id: string) : Promise<OAuth2TokenPayload | null>;

    /**
     * Find token by signature (JWS).
     * @param token JWS
     */
    findOneBySignature(token: string) : Promise<OAuth2TokenPayload | null>;

    // -----------------------------------------------------

    /**
     * Remove refresh token by jti.
     *
     * @param id JTI
     */
    removeById(id: string) : Promise<void>;

    // -----------------------------------------------------

    /**
     * Insert token.
     *
     * @param payload
     */
    insert(payload: OAuth2TokenPayload) : Promise<OAuth2TokenPayload>;

    /**
     * Create or update token.
     *
     * @param payload
     */
    save(payload: OAuth2TokenPayload) : Promise<OAuth2TokenPayload>;

    /**
     * Save token payload with signature (JWS).
     *
     * @param payload
     * @param signature
     */
    saveWithSignature(payload: OAuth2TokenPayload, signature: string) : Promise<OAuth2TokenPayload>;
}
