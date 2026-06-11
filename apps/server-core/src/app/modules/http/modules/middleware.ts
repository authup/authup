/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'routup';
import path from 'node:path';
import type { IContainer } from 'eldin';
import type { Repository } from 'typeorm';
import type { Realm } from '@authup/core-kit';
import {
    createAuthorizationMiddleware,
    createLoggerMiddleware,
    createRealmResolverMiddleware,
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
import { ConfigInjectionKey, getAppOrigins } from '../../config/index.ts';
import { LoggerInjectionKey } from '../../logger/index.ts';
import { IdentityInjectionKey } from '../../identity/index.ts';
import { OAuth2InjectionToken } from '../../oauth2/index.ts';
import { RealmEntity } from '../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../../database/repositories/index.ts';
import {
    DatabaseInjectionKey,
    PermissionDatabaseProvider,
} from '../../database/index.ts';

export class HTTPMiddlewareModule {
    async mountBefore(router: App, container: IContainer): Promise<void> {
        // @routup/prometheus must be installed before any other plugin or
        // route so that its onion middleware can observe the full request
        // lifecycle (the v3 README is explicit on this).
        await this.mountPrometheus(router, container);
        await this.mountLogger(router, container);
        await this.mountCors(router, container);
        await this.mountAssets(router);
        await this.mountBasic(router);
        await this.mountRateLimit(router, container);

        await this.mountSwagger(router, container);
        await this.mountAuthorization(router, container);
        await this.mountRealmResolver(router, container);
    }


    async mountAfter(router: App, container: IContainer): Promise<void> {
        registerErrorMiddleware(router, { logger: container.resolve(LoggerInjectionKey) });
    }

    // ----------------------------------------------------
    async mountCors(router: App, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewareCors)) {
            return;
        }

        const options = this.transformBoolToEmptyObject(config.middlewareCors) ?? {};

        // Restrict CORS to the trusted application origins (publicUrl +
        // additionalDomains) unless the operator explicitly configured an
        // origin via the middlewareCors options object.
        if (typeof options.origin === 'undefined') {
            options.origin = getAppOrigins(config);
        }

        registerCorsMiddleware(router, options);
    }

    async mountLogger(router: App, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const middleware = createLoggerMiddleware({
            env: config.env,
            logger: container.resolve(LoggerInjectionKey),
        });

        router.use(middleware);
    }

    async mountAssets(router: App): Promise<void> {
        await registerAssetsMiddleware(router);
    }

    async mountBasic(router: App): Promise<void> {
        registerBasicMiddleware(router);
    }

    async mountPrometheus(router: App, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewarePrometheus)) {
            return;
        }

        registerPrometheusMiddleware(router, this.transformBoolToEmptyObject(config.middlewarePrometheus));
    }

    async mountRateLimit(router: App, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewareRateLimit)) {
            return;
        }

        registerRateLimitMiddleware(router, this.transformBoolToEmptyObject(config.middlewareRateLimit));
    }

    async mountSwagger(router: App, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        if (!this.isEnabled(config.middlewareSwagger)) {
            return;
        }

        const middleware = createSwaggerMiddleware({
            documentPath: path.join(DIST_PATH, 'swagger.json'),
            baseURL: config.publicUrl,
        });

        router.use('/docs', middleware);
    }

    async mountRealmResolver(router: App, container: IContainer): Promise<void> {
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const middleware = createRealmResolverMiddleware({ realmRepository: new RealmRepositoryAdapter(realmRepository) });

        // Mounted at /realms/:realmId/:nested so the middleware only fires on
        // nested-resource URLs (e.g. /realms/master/users/...). Bare
        // /realms/:id routes belong to RealmController (CRUD, openid-config,
        // jwks) and would otherwise 404 on PUT upserts where the realm
        // doesn't exist yet.
        router.use('/realms/:realmId/:nested', middleware);
    }

    async mountAuthorization(router: App, container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);

        const identityResolver = container.resolve(IdentityInjectionKey.Resolver);
        const sessionManager = container.resolve(AuthenticationInjectionKey.SessionManager);
        const oauth2TokenVerifier = container.resolve(OAuth2InjectionToken.TokenVerifier);
        const identityPermissionProvider = container.resolve(IdentityInjectionKey.PermissionProvider);

        const permissionProvider = new PermissionDatabaseProvider(dataSource);

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
