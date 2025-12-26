/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import path from 'node:path';
import type { DataSource } from 'typeorm';
import type {
    IDIContainer,
    IIdentityResolver,
    IOAuth2TokenVerifier, ISessionManager,
} from '../../../../core/index.ts';
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
import { resolvePackagePath } from '../../../../path.ts';
import { AuthenticationInjectionKey } from '../../authentication/index.ts';
import type { Config } from '../../config/index.ts';
import { ConfigInjectionKey } from '../../config/index.ts';
import { IdentityInjectionKey } from '../../identity/index.ts';
import { OAuth2InjectionToken } from '../../oauth2/index.ts';
import { PermissionDBProvider } from '../../../../security/index.ts';
import { DatabaseInjectionKey } from '../../database/index.ts';

export class HTTPMiddlewareModule {
    async mountBefore(router: Router, container: IDIContainer): Promise<void> {
        await this.mountLogger(router, container);
        await this.mountCors(router, container);
        await this.mountAssets(router);
        await this.mountBasic(router);
        await this.mountPrometheus(router, container);
        await this.mountRateLimit(router, container);

        await this.mountSwagger(router, container);
        await this.mountAuthorization(router, container);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async mountAfter(router: Router, _container: IDIContainer): Promise<void> {
        registerErrorMiddleware(router);
    }

    // ----------------------------------------------------
    async mountCors(router: Router, container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewareCors)) {
            return;
        }

        registerCorsMiddleware(router, this.transformBoolToEmptyObject(config.middlewareCors));
    }

    async mountLogger(router: Router, container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);
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

    async mountPrometheus(router: Router, container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewarePrometheus)) {
            return;
        }

        registerPrometheusMiddleware(router, this.transformBoolToEmptyObject(config.middlewarePrometheus));
    }

    async mountRateLimit(router: Router, container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        if (!this.isEnabled(config.middlewareRateLimit)) {
            return;
        }

        registerRateLimitMiddleware(router, this.transformBoolToEmptyObject(config.middlewareRateLimit));
    }

    async mountSwagger(router: Router, container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);
        if (!this.isEnabled(config.middlewareSwagger)) {
            return;
        }

        const middleware = await createSwaggerMiddleware({
            documentPath: path.join(resolvePackagePath(), 'dist', 'swagger.json'),
            options: {
                baseURL: config.publicUrl,
                ...this.transformBoolToEmptyObject(config.middlewareSwagger),
            },
        });

        router.use('/docs', middleware);
    }

    async mountAuthorization(router: Router, container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        // todo: no direct datasource access here.
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);

        const identityResolver = container.resolve<IIdentityResolver>(
            IdentityInjectionKey.Resolver,
        );

        const sessionManager = container.resolve<ISessionManager>(
            AuthenticationInjectionKey.SessionManager,
        );

        const oauth2TokenVerifier = container.resolve<IOAuth2TokenVerifier>(
            OAuth2InjectionToken.TokenVerifier,
        );

        const permissionProvider = new PermissionDBProvider(dataSource);

        const middleware = createAuthorizationMiddleware({
            identityResolver,
            permissionProvider,
            oauth2TokenVerifier,
            sessionManager,
            options: {
                cookieDomain: config.cookieDomain,
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
