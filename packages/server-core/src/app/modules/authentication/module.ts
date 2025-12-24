/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { ICache } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import { SessionEntity } from '../../../adapters/database/domains';
import type {
    IDIContainer, ISessionRepository,
} from '../../../core';
import {
    SessionManager,
} from '../../../core';
import { CacheInjectionKey } from '../cache';
import type { Config } from '../config';
import { ConfigInjectionKey } from '../config';

import type { Module } from '../types';
import { AuthenticationInjectionKey } from './constants';
import { SessionRepository } from './repositories';

export class AuthenticationModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        container.register(AuthenticationInjectionKey.SessionRepository, {
            useFactory: (c) => {
                const cache = c.resolve<ICache>(CacheInjectionKey);
                const repository = c.resolve<Repository<Session>>(SessionEntity);
                return new SessionRepository({
                    cache,
                    repository,
                });
            },
        });

        container.register(AuthenticationInjectionKey.SessionManager, {
            useFactory: (c) => {
                const config = c.resolve<Config>(ConfigInjectionKey);
                const repository = c.resolve<ISessionRepository>(AuthenticationInjectionKey.SessionRepository);
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
