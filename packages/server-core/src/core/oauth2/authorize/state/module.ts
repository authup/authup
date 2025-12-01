/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import type { Cache } from '@authup/server-kit';
import { buildCacheKey, useCache } from '@authup/server-kit';
import { OAuth2Error } from '@authup/specs';
import { useRequestQuery } from '@routup/basic/query';
import type { Request } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2CachePrefix } from '../../constants';
import type { OAuth2AuthorizeStateData } from './types';

export class OAuth2AuthorizationStateManager {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
    }

    /**
     * Create and store a state with meta information for an incoming request.
     *
     * The state is stored in the cache for 30 minutes.
     *
     * @param req
     * @param data
     */
    async issue(
        req: Request,
        data: OAuth2AuthorizeStateData,
    ) : Promise<string> {
        const state = createNanoID();

        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        const userAgent = getRequestHeader(req, 'user-agent');

        await this.cache.set(
            buildCacheKey({ prefix: OAuth2CachePrefix.AUTHORIZATION_CODE, key: state }),
            {
                ip,
                userAgent,
                data,
            },
            {
                ttl: 1000 * 60 * 30, // 30 min
            },
        );

        return state;
    }

    /**
     * Verify if the request state is valid and return the stored data.
     *
     * The state is removed from the cache after verification.
     *
     * @throws OAuth2Error.stateInvalid
     *
     * @param req
     */
    async verify(req: Request) : Promise<OAuth2AuthorizeStateData> {
        const query = useRequestQuery(req);
        if (typeof query.state !== 'string') {
            throw OAuth2Error.stateInvalid();
        }

        const cacheKey = buildCacheKey({ prefix: OAuth2CachePrefix.AUTHORIZATION_CODE, key: query.state });
        const cached : {
            ip?: string,
            userAgent?: string,
            data: OAuth2AuthorizeStateData,
        } = await this.cache.get(cacheKey);
        if (!cached) {
            throw OAuth2Error.stateInvalid();
        }

        // avoid replay attack :)
        await this.cache.drop(cacheKey);

        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        if (ip !== cached.ip) {
            throw OAuth2Error.stateInvalid();
        }

        const userAgent = getRequestHeader(req, 'user-agent');
        if (userAgent !== cached.userAgent) {
            throw OAuth2Error.stateInvalid();
        }

        return cached.data;
    }
}
