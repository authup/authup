/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MemoryCache, RedisCache,
} from '@authup/server-kit';
import type { IModule } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { CacheInjectionKey } from './constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IContainer } from 'eldin';

export class CacheModule implements IModule {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.CACHE;
        this.dependsOn = [ModuleName.CONFIG];
    }

    async start(container: IContainer): Promise<void> {
        const result = container.tryResolve(ConfigInjectionKey);
        if (!result.success || !result.data.redis) {
            container.register(CacheInjectionKey, {
                useFactory: () => new MemoryCache(),
            });

            return;
        }

        container.register(CacheInjectionKey, {
            useFactory: () => new RedisCache(result.data.redis),
        });
    }
}
