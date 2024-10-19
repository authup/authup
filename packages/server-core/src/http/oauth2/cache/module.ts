/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/kit';
import type { Cache, CacheSetOptions } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { OAuth2CachePrefix } from './constants';

export class OAuth2Cache {
    protected instance : Cache;

    // -----------------------------------------------------

    constructor(cache: Cache) {
        this.instance = cache;
    }

    // -----------------------------------------------------

    /**
     * Cache token payload by JTI.
     *
     * @param data
     * @param options
     */
    async setClaims(
        data: OAuth2TokenPayload,
        options: CacheSetOptions = {},
    ): Promise<void> {
        if (
            data.exp &&
            !options.ttl
        ) {
            options.ttl = this.transformExpToTTL(data.exp);
        }

        await this.instance.set(
            this.buildKey(OAuth2CachePrefix.ID_TO_CLAIMS, data.jti),
            data,
            options,
        );
    }

    /**
     * Get token payload by JTI.
     *
     * @param id
     */
    async getClaimsById(id: string) : Promise<OAuth2TokenPayload | undefined> {
        return this.instance.get(
            this.buildKey(OAuth2CachePrefix.ID_TO_CLAIMS, id),
        );
    }

    /**
     * Get token payload by JWT.
     *
     * @param jwt
     */
    async getClaimsByToken(jwt: string) : Promise<OAuth2TokenPayload | undefined> {
        const id = await this.getIdByToken(jwt);
        if (!id) {
            return undefined;
        }

        return this.getClaimsById(id);
    }

    /**
     * Drop token payload by JTI.
     * @param id
     */
    async dropClaimsById(id: string) : Promise<void> {
        await this.instance.drop(this.buildKey(OAuth2CachePrefix.ID_TO_CLAIMS, id));
    }

    // -----------------------------------------------------

    /**
     * Set a jti for a given jwt.
     *
     * @param token
     * @param id
     * @param options
     */
    async setIdByToken(
        token: string,
        id: string,
        options: CacheSetOptions = {},
    ): Promise<void> {
        await this.instance.set(
            this.buildKey(OAuth2CachePrefix.TOKEN_TO_ID, token),
            id,
            options,
        );
    }

    /**
     * Retrieve a jti for a given jwt.
     *
     * @param token
     */
    async getIdByToken(token: string) : Promise<string | undefined> {
        return this.instance.get(this.buildKey(OAuth2CachePrefix.TOKEN_TO_ID, token));
    }

    /**
     * Drop a jti for a given jwt.
     *
     * @param token
     */
    async dropIdByToken(token: string) : Promise<void> {
        await this.instance.drop(this.buildKey(OAuth2CachePrefix.TOKEN_TO_ID, token));
    }

    // -----------------------------------------------------

    transformExpToTTL(exp: number) {
        return (exp * 1000) - Date.now();
    }

    protected buildKey(prefix: string, key: string) {
        return buildRedisKeyPath({
            key,
            prefix,
        });
    }
}
