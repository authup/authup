/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrant } from '@authup/specs';

export type AuthFlowLoginResult = 'success' | 'failure';

/**
 * `denied` is reserved — dead until an application-access policy (plan 052)
 * can deny an authorize; emitted in the label domain from day one so
 * dashboards stay stable when it turns live.
 */
export type AuthFlowAuthorizeOutcome = 'issued' | 'denied' | 'login_required' | 'error';

export interface IAuthFlowMetrics {
    recordLogin(result: AuthFlowLoginResult): void;

    /**
     * Successful token grants only — failures appear in the generic
     * per-route status-code histogram on /token.
     */
    recordTokenGrant(grantType: `${OAuth2TokenGrant}`): void;

    recordAuthorize(outcome: AuthFlowAuthorizeOutcome): void;

    recordRefreshReplay(): void;
}
