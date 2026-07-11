/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import type { IOAuth2AuthorizationCodeIssuer } from './code/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IAuditEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';

export type OAuth2AuthorizationManagerContext = {
    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    sessionManager: ISessionManager,
    auditEventService?: IAuditEventService,
    metrics?: IAuthFlowMetrics,
    /**
     * Max age (seconds) of the authentication a `prompt=login` request accepts
     * before forcing re-auth (config `promptLoginMaxAge`). Default 60.
     */
    promptLoginMaxAge?: number
};

export type OAuth2AuthorizationResult = {
    authorizationCode?: string,

    redirectUri: string,
    state?: string
};

export type OAuth2AuthorizationOptions = {
    /**
     * The id of the session the authorizing bearer belongs to. Persisted on the
     * issued authorization code so the token exchange can reuse that session
     * instead of creating a second one.
     */
    sessionId?: string | null,

    /**
     * The verified client entity (from the code-request verifier) — consumed by
     * the audit record to distinguish built_in auto-consent from manual consent.
     */
    client?: Client,
};
