/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ACCOUNT_CONSOLE_NAME } from '@authup/core-kit';
import {
    DContext,
    DController,
    DGet,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { ACCOUNT_CONSOLE_SEGMENT, serveAccountConsolePage } from '../../../ui/index.ts';
import { ConsoleLogin } from '../console-login/index.ts';
import type { AccountControllerContext, AccountControllerOptions } from './types.ts';

/**
 * Serves the account console SPA (`@authup/client-account-console`) shell.
 * client-side routing owns the sub-paths, so every route returns the same
 * shell with the runtime config (apiUrl, base path, feature flags) injected.
 * The bundle's static assets ride the assets middleware
 * (/console/account/assets).
 *
 * It also owns the console's server-side login (plan 088): the kick and the
 * code redemption, so no OAuth2 token ever reaches the console's JavaScript.
 * Both are the shared {@link ConsoleLogin} bound to the `account-console`
 * client; the session endpoint the console hydrates from lives on the session
 * controller, since the credential is console-generic.
 */
@DController(`/${ACCOUNT_CONSOLE_SEGMENT}`)
export class AccountController {
    protected options: AccountControllerOptions;

    protected consoleLogin: ConsoleLogin;

    constructor(ctx: AccountControllerContext) {
        this.options = ctx.options;
        this.consoleLogin = new ConsoleLogin(
            {
                clientName: CLIENT_ACCOUNT_CONSOLE_NAME,
                segment: ACCOUNT_CONSOLE_SEGMENT,
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
    // The two routes below MUST stay declared before `/:page`,
    // which matches any single segment and would swallow them.
    // ---------------------------------------------------------

    /**
     * Disabled means disabled on the server too: the kick must not mint a
     * pending login and a session for a surface that renders nothing but the
     * notice. The shell (and the notice) is what a visitor gets instead.
     */
    @DGet('/login', [])
    async login(@DContext() event: IAppEvent): Promise<Response | string> {
        if (!this.options.features.accountConsole) {
            return this.render(event);
        }

        return this.consoleLogin.login(event);
    }

    @DGet('/callback', [])
    async callback(@DContext() event: IAppEvent): Promise<Response | string> {
        if (!this.options.features.accountConsole) {
            return this.render(event);
        }

        return this.consoleLogin.callback(event);
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    @DGet('/:page', [])
    async servePage(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    protected render(event: IAppEvent): Promise<string> {
        return serveAccountConsolePage(event, {
            baseURL: this.options.baseURL,
            features: this.options.features,
            trustedOrigins: this.options.trustedOrigins,
        });
    }
}
