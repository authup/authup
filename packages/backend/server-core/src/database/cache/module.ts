/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { QueryResultCache } from 'typeorm/cache/QueryResultCache';
import { useClient } from 'redis-extension';
import { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions';
import { QueryRunner } from 'typeorm';

export class DatabaseQueryResultCache implements QueryResultCache {
    protected buildFullQualifiedId(id: string) {
        return `database:${id}`;
    }

    async clear(queryRunner?: QueryRunner): Promise<void> {
        const client = useClient();
        const pipeline = client.pipeline();

        const keys = await client.keys(this.buildFullQualifiedId('*'));
        for (let i = 0; i < keys.length; i++) {
            pipeline.del(keys[i]);
        }

        await pipeline.exec();
    }

    async connect(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async disconnect(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async getFromCache(options: QueryResultCacheOptions, queryRunner?: QueryRunner): Promise<QueryResultCacheOptions | undefined> {
        if (!options.query && !options.identifier) {
            return undefined;
        }

        const key = this.buildFullQualifiedId(options.identifier || options.query);
        const client = useClient();

        const data = await client.get(
            key,
        );

        if (!data) {
            return undefined;
        }

        return JSON.parse(data);
    }

    isExpired(savedCache: QueryResultCacheOptions): boolean {
        return savedCache.time + savedCache.duration < new Date().getTime();
    }

    async remove(identifiers: string[], queryRunner?: QueryRunner): Promise<void> {
        const client = useClient();
        const pipeline = client.pipeline();

        for (let i = 0; i < identifiers.length; i++) {
            pipeline.del(this.buildFullQualifiedId(identifiers[i]));
        }

        await pipeline.exec();
    }

    async storeInCache(
        options: QueryResultCacheOptions,
        savedCache: QueryResultCacheOptions | undefined,
        queryRunner?: QueryRunner,
    ): Promise<void> {
        if (!options.query && !options.identifier) {
            return;
        }

        const key = this.buildFullQualifiedId(options.identifier || options.query);
        const client = useClient();

        await client.set(
            key,
            JSON.stringify(options),
            'PX',
            options.duration,
        );
    }

    synchronize(queryRunner?: QueryRunner): Promise<void> {
        return Promise.resolve(undefined);
    }
}
