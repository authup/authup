/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/kit';
import type { RedisClient } from '@authup/server-kit';
import { RedisJsonAdapter, buildRedisKeyPath } from '@authup/server-kit';
import { CachePrefix } from '../../../domains';

export class OAuth2Cache {
    protected client : RedisClient | undefined;

    protected clientJsonAdapter : RedisJsonAdapter | undefined;

    // -----------------------------------------------------

    constructor(client: RedisClient) {
        this.client = client;
        this.clientJsonAdapter = new RedisJsonAdapter(client);
    }

    // -----------------------------------------------------

    async setTokenPayload(
        data: OAuth2TokenPayload,
    ): Promise<void> {
        const date = this.toDate(data.exp);

        await this.clientJsonAdapter.set(
            this.buildKeyPath(CachePrefix.OAUTH2_ACCESS_TOKEN, data.jti),
            data,
            { milliseconds: date.getTime() - Date.now() },
        );
    }

    async getTokenPayload(id: string) : Promise<OAuth2TokenPayload | undefined> {
        return this.clientJsonAdapter.get(
            this.buildKeyPath(CachePrefix.OAUTH2_ACCESS_TOKEN, id),
        );
    }

    // -----------------------------------------------------

    /**
     * Set a jti for a given jwt.
     *
     * @param token
     * @param id
     * @param milliseconds
     */
    async setTokenID(
        token: string,
        id: string,
        milliseconds?: number,
    ): Promise<void> {
        await this.clientJsonAdapter.set(
            this.buildKeyPath('id-to-jti', token),
            id,
            { milliseconds },
        );
    }

    /**
     * Retrieve a jti for a given jwt.
     *
     * @param token
     */
    async getTokenID(token: string) : Promise<string | undefined> {
        return this.clientJsonAdapter.get(
            this.buildKeyPath('id-to-jti', token),
        );
    }

    // -----------------------------------------------------

    protected buildKeyPath(prefix: string, key: string) {
        return buildRedisKeyPath({
            key,
            prefix,
        });
    }

    protected toDate(input: string | number | Date) : Date {
        if (input instanceof Date) {
            return input;
        }

        return new Date(input);
    }
}
