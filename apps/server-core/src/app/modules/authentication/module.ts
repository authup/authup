/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { SessionEntity } from '../../../adapters/database/domains/index.ts';
import type { IContainer } from 'eldin';
import {
    SessionManager,
} from '../../../core/index.ts';
import { CacheInjectionKey } from '../cache/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';

import type { IModule } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { AuthenticationInjectionKey } from './constants.ts';
import { SessionRepository } from './repositories/index.ts';

export class AuthenticationModule implements IModule {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.AUTHENTICATION;
        this.dependsOn = [ModuleName.DATABASE, ModuleName.CACHE];
    }

    async start(container: IContainer): Promise<void> {
        container.register(AuthenticationInjectionKey.SessionRepository, {
            useFactory: (c) => {
                const cache = c.resolve(CacheInjectionKey);
                const repository = c.resolve<Repository<Session>>(SessionEntity);
                return new SessionRepository({
                    cache,
                    repository,
                });
            },
        });

        container.register(AuthenticationInjectionKey.SessionManager, {
            useFactory: (c) => {
                const config = c.resolve(ConfigInjectionKey);
                const repository = c.resolve(AuthenticationInjectionKey.SessionRepository);
                return new SessionManager({
                    repository,
                    options: {
                        maxAge: config.tokenRefreshMaxAge + 3_600,
                    },
                });
            },
        });
    }
}
