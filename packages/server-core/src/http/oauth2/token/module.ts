/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/kit';
import { TokenError } from '@authup/kit';
import type {
    Cache,
    CacheSetOptions,
} from '@authup/server-kit';
import {
    buildCacheKey,
    extractTokenHeader,
    useCache,
} from '@authup/server-kit';
import { signOAuth2TokenWithKey, useKey, verifyOAuth2TokenWithKey } from '../../../database/domains';
import { OAuth2CachePrefix } from '../constants';

type OAuth2TokenManagerVerifyOptions = {
    skipActiveCheck?: boolean,
};

type OAuth2TokenManagerSingResult<T> = {
    payload: T,
    token: string
};

export class OAuth2TokenManager {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
    }

    // -----------------------------------------------------

    async verify(
        token: string,
        options: OAuth2TokenManagerVerifyOptions = {},
    ) {
        if (!token) {
            throw TokenError.requestInvalid('The token is not defined.');
        }

        if (!options.skipActiveCheck) {
            const isActive = await this.isActive(token);
            if (!isActive) {
                throw TokenError.inactive();
            }
        }

        const payload = await this.getPayloadFromCache(token);
        if (payload) {
            return payload;
        }

        const header = extractTokenHeader(token);
        if (!header.kid) {
            throw TokenError.payloadInvalid('The jwk (kid) is invalid.');
        }

        const entity = await useKey({
            id: header.kid,
        });
        if (entity) {
            const payload = await verifyOAuth2TokenWithKey(token, entity);

            await this.addPayloadToCache(token, payload);

            return payload;
        }

        throw TokenError.payloadInvalid('The referenced jwk (kid) does not exist.');
    }

    async sign<T extends OAuth2TokenPayload>(
        payload: T,
    ) : Promise<OAuth2TokenManagerSingResult<T>> {
        const key = await useKey({
            realm_id: payload.realm_id,
        });

        if (!key) {
            throw TokenError.payloadInvalid('No jwk found to sign the token.');
        }

        if (!payload.exp) {
            payload.exp = Math.floor(new Date().getTime() / 1000) + 3600;
        }

        const token = await signOAuth2TokenWithKey(payload, key, { keyId: key.id });

        await this.addPayloadToCache(token, payload);

        return {
            payload,
            token,
        };
    }

    // -----------------------------------------------------

    async setInactive(token: string, options: CacheSetOptions = {}) {
        if (!options.ttl) {
            const payload = await this.getPayloadFromCache(token);
            if (payload) {
                options.ttl = this.transformUnixTimestampToTTL(payload.exp);
            }

            options.ttl = options.ttl || 3_600;
        }

        await this.cache.set(
            buildCacheKey({
                prefix: OAuth2CachePrefix.TOKEN_INACTIVE,
                key: token,
            }),
            true,
            options,
        );
    }

    async isActive(token: string) : Promise<boolean> {
        const response = await this.cache.get(
            buildCacheKey({
                prefix: OAuth2CachePrefix.TOKEN_INACTIVE,
                key: token,
            }),
        );

        return !response;
    }

    // -----------------------------------------------------

    /**
     * Cache token payload by JTI.
     *
     * @param token
     * @param data
     */
    protected async addPayloadToCache(
        token: string,
        data: OAuth2TokenPayload,
    ): Promise<void> {
        const options : CacheSetOptions = {
            ttl: this.transformUnixTimestampToTTL(data.exp),
        };

        await this.cache.set(
            buildCacheKey({ prefix: OAuth2CachePrefix.TOKEN_CLAIMS, key: token }),
            data,
            options,
        );
    }

    /**
     * Get token payload by jwt
     *
     * @param jwt
     */
    protected async getPayloadFromCache(
        jwt: string,
    ) : Promise<OAuth2TokenPayload | undefined> {
        return this.cache.get(
            buildCacheKey({ prefix: OAuth2CachePrefix.TOKEN_CLAIMS, key: jwt }),
        );
    }

    // -----------------------------------------------------

    /**
     * Transform exp claim to time to live.
     * @param exp
     */
    protected transformUnixTimestampToTTL(exp: number) {
        const ttl = (exp * 1000) - Date.now();

        return ttl > 0 ? ttl : 0;
    }
}
