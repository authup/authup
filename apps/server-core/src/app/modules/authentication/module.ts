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
import { OAuth2BackchannelLogoutNotifier, SessionManager } from '../../../core/index.ts';
import { CacheInjectionKey } from '../cache/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';
import { OAuth2InjectionToken } from '../oauth2/index.ts';

import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { AuthenticationInjectionKey } from './constants.ts';
import { SessionRepository } from './repositories/index.ts';

export class AuthenticationModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.AUTHENTICATION;
        // OAUTH2 for the back-channel logout notifier the manager pushes
        // through (signer, token inventory, client repository). No cycle:
        // OAUTH2 stands on DATABASE, CACHE, CONFIG and IDENTITY only.
        this.dependencies = [
            ModuleName.DATABASE,
            ModuleName.CACHE,
            ModuleName.CONFIG,
            ModuleName.OAUTH2,
        ];
    }

    async setup(container: IContainer): Promise<void> {
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
                    options: { maxAge: config.tokenRefreshMaxAge + 3_600 },
                    revokeNotifier: new OAuth2BackchannelLogoutNotifier({
                        signer: c.resolve(OAuth2InjectionToken.TokenSigner),
                        sessionTokenRepository: c.resolve(OAuth2InjectionToken.SessionTokenRepository),
                        clientRepository: c.resolve(OAuth2InjectionToken.ClientRepository),
                        options: { issuer: config.publicUrl },
                        logger: c.resolve(LoggerInjectionKey),
                    }),
                });
            },
        });
    }
}
