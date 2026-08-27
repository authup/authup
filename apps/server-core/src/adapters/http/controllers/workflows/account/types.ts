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

export type AccountControllerOptions = {
    baseURL: string,
    /**
     * Where the console this authenticates for is served. The browser lands
     * there once the credential is issued, and a refusal renders there.
     */
    consoleUrl: string,
    enabled: boolean,
};

export type AccountControllerContext = {
    options: AccountControllerOptions,
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
