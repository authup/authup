/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import path from 'node:path';
import type { IContainer } from 'eldin';
import { IdentityPermissionProvider } from '../../../../core/index.ts';
import {
    createAuthorizationMiddleware,
    createLoggerMiddleware,
    createSwaggerMiddleware,
    registerAssetsMiddleware,
    registerBasicMiddleware,
    registerCorsMiddleware,
    registerErrorMiddleware,
    registerPrometheusMiddleware,
    registerRateLimitMiddleware,
} from '../../../../adapters/http/index.ts';
import { DIST_PATH } from '../../../../path.ts';
import { AuthenticationInjectionKey } from '../../authentication/index.ts';
import { ConfigInjectionKey } from '../../config/index.ts';
import { IdentityInjectionKey } from '../../identity/index.ts';
import { OAuth2InjectionToken } from '../../oauth2/index.ts';
import { DatabaseInjectionKey, PermissionDatabaseProvider  } from '../../database/index.ts';
import {
    ClientRepository,
    RobotRepository,
    RoleRepository,
    UserRepository,
} from '../../../../adapters/database/domains/index.ts';

export class HTTPMiddlewareModule {
    async mountBefore(router: Router, container: IContainer): Promise<void> {
        await this.mountLogger(router, container);
        await this.mountCors(router, container);
        await this.mountAssets(router);
        await this.mountBasic(router);
        await this.mountPrometheus(router, container);
        await this.mountRateLimit(router, container);

        await this.mountSwagger(router, container);
        await this.mountAuthorization(router, container);
    }

     
    async mountAfter(router: Router, _container: IContainer): Promise<void> {
        registerErrorMiddleware(router);
    }

    // ----------------------------------------------------
    async mountCors(router: Router, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewareCors)) {
            return;
        }

        registerCorsMiddleware(router, this.transformBoolToEmptyObject(config.middlewareCors));
    }

    async mountLogger(router: Router, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const middleware = createLoggerMiddleware({
            env: config.env,
        });

        router.use(middleware);
    }

    async mountAssets(router: Router): Promise<void> {
        await registerAssetsMiddleware(router);
    }

    async mountBasic(router: Router): Promise<void> {
        registerBasicMiddleware(router);
    }

    async mountPrometheus(router: Router, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewarePrometheus)) {
            return;
        }

        registerPrometheusMiddleware(router, this.transformBoolToEmptyObject(config.middlewarePrometheus));
    }

    async mountRateLimit(router: Router, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewareRateLimit)) {
            return;
        }

        registerRateLimitMiddleware(router, this.transformBoolToEmptyObject(config.middlewareRateLimit));
    }

    async mountSwagger(router: Router, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        if (!this.isEnabled(config.middlewareSwagger)) {
            return;
        }

        const middleware = await createSwaggerMiddleware({
            documentPath: path.join(DIST_PATH, 'swagger.json'),
            options: {
                baseURL: config.publicUrl,
                ...this.transformBoolToEmptyObject(config.middlewareSwagger),
            },
        });

        router.use('/docs', middleware);
    }

    async mountAuthorization(router: Router, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        // todo: no direct datasource access here.
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);

        const identityResolver = container.resolve(IdentityInjectionKey.Resolver);
        const sessionManager = container.resolve(AuthenticationInjectionKey.SessionManager);
        const oauth2TokenVerifier = container.resolve(OAuth2InjectionToken.TokenVerifier);

        const permissionProvider = new PermissionDatabaseProvider(dataSource);
        const identityPermissionProvider = new IdentityPermissionProvider({
            clientRepository: new ClientRepository(dataSource),
            userRepository: new UserRepository(dataSource),
            robotRepository: new RobotRepository(dataSource),
            roleRepository: new RoleRepository(dataSource),
        });

        const middleware = createAuthorizationMiddleware({
            identityResolver,
            identityPermissionProvider,
            permissionProvider,
            oauth2TokenVerifier,
            sessionManager,
            options: {
                clientAuthBasic: config.clientAuthBasic,
                robotAuthBasic: config.robotAuthBasic,
                userAuthBasic: config.userAuthBasic,
            },
        });

        router.use(middleware);
    }

    // ----------------------------------------------------

    private transformBoolToEmptyObject<T extends Record<string, any>>(
        input?: T | boolean,
    ) : T | undefined {
        if (typeof input === 'boolean') {
            return {} as T;
        }

        return input || {} as T;
    }

    private isEnabled<T>(input: T | boolean) {
        return typeof input !== 'boolean' || input === true;
    }
}
