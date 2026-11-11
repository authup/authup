/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizeError } from '@authup/errors';
import { MemoryCache, RedisCache } from '@authup/server-kit';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { CacheInjectionKey, TaggedCacheInjectionKey } from './constants.ts';
import { TAGGED_CACHE_ERROR_LOG_INTERVAL, createTaggedCache } from './tagged/index.ts';
import { throttle } from './throttle.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';
import type { IContainer } from 'eldin';

export class CacheModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected disposeTaggedCache: (() => Promise<void>) | undefined;

    constructor() {
        this.name = ModuleName.CACHE;
        this.dependencies = [ModuleName.CONFIG];
    }

    async setup(container: IContainer): Promise<void> {
        const result = container.tryResolve(ConfigInjectionKey);
        const redis = result.success ? result.data.redis : undefined;

        // a Redis outage reports on every reconnect attempt and every cached read.
        const onError = throttle((error: unknown) => {
            const logger = container.tryResolve(LoggerInjectionKey);

            if (logger.success) {
                logger.data.warn(`The tagged cache failed: ${normalizeError(error).message}`);
            }
        }, TAGGED_CACHE_ERROR_LOG_INTERVAL);

        const tagged = createTaggedCache({ redis, onError });

        this.disposeTaggedCache = tagged.dispose;
        await tagged.ready();
        container.register(TaggedCacheInjectionKey, { useValue: tagged.cache });

        if (!redis) {
            container.register(CacheInjectionKey, { useFactory: () => new MemoryCache() });

            return;
        }

        container.register(CacheInjectionKey, { useFactory: () => new RedisCache(redis) });
    }

    async teardown(): Promise<void> {
        const dispose = this.disposeTaggedCache;

        this.disposeTaggedCache = undefined;

        await dispose?.();
    }
}
