/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ADMIN_CONSOLE_NAME } from '@authup/core-kit';
import { NotFoundError } from '@ebec/http';
import {
    DContext,
    DController,
    DGet,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { ADMIN_CONSOLE_SEGMENT } from '../../../constants.ts';
import { ConsoleLogin } from '../console-login/index.ts';
import type { AdminControllerContext, AdminControllerOptions } from './types.ts';

/**
 * The admin console's server half (plan 088): the login kick and the code
 * redemption, bound to the per-realm `admin-console` client.
 *
 * The console itself is served by `@authup/server-admin-console`. See
 * {@link AccountController} for why these two routes stay on the API.
 */
@DController(`/${ADMIN_CONSOLE_SEGMENT}`)
export class AdminController {
    protected options: AdminControllerOptions;

    protected consoleLogin: ConsoleLogin;

    constructor(ctx: AdminControllerContext) {
        this.options = ctx.options;
        this.consoleLogin = new ConsoleLogin(
            {
                clientName: CLIENT_ADMIN_CONSOLE_NAME,
                segment: ADMIN_CONSOLE_SEGMENT,
                consoleUrl: ctx.options.consoleUrl,
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

    /**
     * A path of its own rather than a `realmId`-carrying `/login` (098 C1).
     * One URL used to mean two things: with a realm the server-side kick,
     * without one the console's own login PAGE. The page is served by the
     * console service now, so the kick can no longer fall back to it and the
     * split became required rather than optional.
     */
    @DGet('/login/start', [])
    async login(@DContext() event: IAppEvent): Promise<Response> {
        this.assertEnabled();

        return this.consoleLogin.login(event);
    }

    @DGet('/callback', [])
    async callback(@DContext() event: IAppEvent): Promise<Response> {
        this.assertEnabled();

        return this.consoleLogin.callback(event);
    }

    /**
     * Disabled means disabled on the server too: the kick must not mint a
     * pending login and a session for a console nothing is serving.
     */
    protected assertEnabled(): void {
        if (!this.options.enabled) {
            throw new NotFoundError();
        }
    }
}
