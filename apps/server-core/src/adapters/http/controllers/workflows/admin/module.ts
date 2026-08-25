/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ADMIN_CONSOLE_NAME } from '@authup/core-kit';
import { NotFoundError } from '@authup/errors';
import { useRequestQuery } from '@routup/basic/query';
import {
    DContext,
    DController,
    DGet,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { serveAdminConsolePage } from '../../../ui/index.ts';
import { ConsoleLogin } from '../console-login/index.ts';
import type { AdminControllerContext, AdminControllerOptions } from './types.ts';

/**
 * Serves the admin console SPA (`@authup/client-admin-console`) shell (plan
 * 081) and owns its server-side login (plan 088): the shared
 * {@link ConsoleLogin} bound to the per-realm `admin-console` client.
 *
 * Client-side routing owns everything below /admin, and the console's routes
 * nest (`/users/<id>/roles`), so the shell route is a wildcard rather than
 * the account console's single segment.
 */
@DController('/admin')
export class AdminController {
    protected options: AdminControllerOptions;

    protected consoleLogin: ConsoleLogin;

    constructor(ctx: AdminControllerContext) {
        this.options = ctx.options;
        this.consoleLogin = new ConsoleLogin(
            {
                clientName: CLIENT_ADMIN_CONSOLE_NAME,
                segment: 'admin',
                // The page that renders the error marker: the console root is
                // a logged-in page, whose guard would bounce to /login and
                // drop the query.
                refusalPath: 'login',
            },
            {
                options: { baseURL: ctx.options.baseURL },
                loginStore: ctx.loginStore,
                sessionRepository: ctx.sessionRepository,
                sessionManager: ctx.sessionManager,
                tokenVerifier: ctx.tokenVerifier,
                tokenRevoker: ctx.tokenRevoker,
                logger: ctx.logger,
            },
        );
    }

    // ---------------------------------------------------------
    // The two routes below MUST stay declared before the wildcard,
    // which matches everything and would swallow them.
    // ---------------------------------------------------------

    /**
     * Two things share this URL. With a `realmId` it is the server-side kick;
     * without one it is the console's own login PAGE (the SPA route `/login`
     * under the `/admin` base): where the guard sends a signed-out visitor,
     * where a refused callback lands with its `?error=` marker, and what a
     * reload of that address requests. Answering the page with the kick's
     * "a realm is required" error made every refusal a raw 400.
     */
    @DGet('/login', [])
    async login(@DContext() event: IAppEvent): Promise<Response | string> {
        const realmId = useRequestQuery(event, 'realmId');
        if (typeof realmId !== 'string' || realmId.length === 0) {
            return this.render(event);
        }

        return this.consoleLogin.login(event);
    }

    @DGet('/callback', [])
    async callback(@DContext() event: IAppEvent): Promise<Response> {
        return this.consoleLogin.callback(event);
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    @DGet('/*page', [])
    async servePage(@DContext() event: IAppEvent): Promise<string> {
        // The assets mount is decided at boot: with no built bundle there is
        // none, and an asset request would fall through to the shell. A 200
        // HTML answer for a module script is a blank console with no error
        // anywhere; a 404 says what is missing.
        if (/^\/admin\/assets\//i.test(event.path)) {
            throw new NotFoundError();
        }

        return this.render(event);
    }

    protected render(event: IAppEvent): Promise<string> {
        return serveAdminConsolePage(event, {
            baseURL: this.options.baseURL,
            features: this.options.features,
        });
    }
}
