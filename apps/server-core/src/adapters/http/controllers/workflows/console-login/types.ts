/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type {
    IConsoleLoginStore,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
    ISessionManager,
    ISessionRepository,
} from '../../../../../core/index.ts';

export type ConsoleLoginDefinition = {
    /**
     * The per-realm OAuth2 client the console authenticates against, by
     * NAME (`account-console`, `admin-console`). A name needs a realm hint at
     * `/authorize` and at `/token` alike, which is why the kick requires one.
     */
    clientName: string,
    /**
     * The path the console is served under, relative to the deployment base
     * path (`console/account`, `console/admin`; it may carry a slash). It
     * scopes the login cookie and builds the callback URL, both of which live
     * on the API's own origin whatever the console url says.
     */
    segment: string,
    /**
     * Where the console itself is served (`<name>Console.url`). The
     * browser lands there once the credential is issued, so a console under a
     * path of its own is landed on correctly.
     *
     * Only its PATH is read, which is exact rather than a shortcut: a console
     * on a foreign origin could never present the `SameSite=Strict`
     * credential this flow issues, and normalizeConfig refuses that shape at
     * boot for exactly that reason.
     */
    consoleUrl: string,
    /**
     * Where a refused callback lands, relative to the console root
     * (`login` -> `<base>/<segment>/login?error=...`). Defaults to the root:
     * the page that renders the error marker differs per console.
     */
    refusalPath?: string,
};

export type ConsoleLoginContext = {
    options: {
        baseURL: string,
    },
    /**
     * Holds the PKCE verifier and `state` while the browser is away at
     * `/authorize` (plan 088).
     */
    loginStore: IConsoleLoginStore,
    /**
     * Writes and clears the opaque credential on the session row. The session
     * MANAGER cannot: the column is `select: false` and has a dedicated write.
     */
    sessionRepository: ISessionRepository,
    sessionManager: ISessionManager,
    /**
     * Reads the exchanged access token (session, subject) and the refresh
     * token, so both can be revoked before either leaves the process.
     */
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRevoker: IOAuth2TokenRevoker,
    logger?: Logger,
};
