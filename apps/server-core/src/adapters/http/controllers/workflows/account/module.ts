/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ACCOUNT_CONSOLE_NAME } from '@authup/core-kit';
import { NotFoundError } from '@ebec/http';
import {
    DContext,
    DController,
    DGet,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { ACCOUNT_CONSOLE_SEGMENT } from '../../../constants.ts';
import { ConsoleLogin } from '../console-login/index.ts';
import type { AccountControllerContext, AccountControllerOptions } from './types.ts';

/**
 * The account console's server half (plan 088): the login kick and the code
 * redemption, so no OAuth2 token ever reaches the console's JavaScript.
 *
 * The console itself is served by `@authup/server-account-console`, which
 * owns everything else under `/console/account`. These two routes stay here
 * because they are sessions, keys and cache, and because the pending-login
 * cookie has to be issued on the origin that reads it back (plan 101
 * invariant 3). A proxy therefore routes these two exact paths to the API
 * set and the rest of the console's segment to the console set.
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
                consoleUrl: ctx.options.consoleUrl,
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
     * The bare `/login` is the console's own page now, served by the console
     * service, so there is nothing left here to dispatch against.
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
     * pending login and a session for a console nothing is serving. There is
     * no shell to answer with any more, so the route simply does not exist.
     */
    protected assertEnabled(): void {
        if (!this.options.enabled) {
            throw new NotFoundError();
        }
    }
}
