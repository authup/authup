/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Counter, register } from 'prom-client';
import type { OAuth2TokenGrant } from '@authup/specs';
import type {
    AuthFlowAuthorizeOutcome,
    AuthFlowLoginResult,
    IAuthFlowMetrics,
} from '../../../core/index.ts';

// Counters are created against prom-client's default registry — the
// @routup/prometheus handler serves that registry, so no extra wiring is
// needed. getSingleMetric keeps construction idempotent across app instances
// in one process (prom-client throws on duplicate metric names).
function getOrCreateCounter<T extends string>(
    name: string,
    help: string,
    labelNames: T[] = [],
): Counter<T> {
    const existing = register.getSingleMetric(name);
    if (existing) {
        return existing as Counter<T>;
    }

    return new Counter<T>({
        name, 
        help, 
        labelNames, 
    });
}

export class PromAuthFlowMetrics implements IAuthFlowMetrics {
    protected loginCounter: Counter<'result'>;

    protected tokenGrantCounter: Counter<'grant_type'>;

    protected authorizeCounter: Counter<'outcome'>;

    protected refreshReplayCounter: Counter;

    constructor() {
        this.loginCounter = getOrCreateCounter(
            'authup_login_total',
            'Password-grant login attempts by result.',
            ['result'],
        );
        this.tokenGrantCounter = getOrCreateCounter(
            'authup_token_grant_total',
            'Successful token grants by grant_type; failures appear in the http_request_duration status codes.',
            ['grant_type'],
        );
        this.authorizeCounter = getOrCreateCounter(
            'authup_authorize_total',
            'Authorization decisions by outcome.',
            ['outcome'],
        );
        this.refreshReplayCounter = getOrCreateCounter(
            'authup_refresh_replay_total',
            'Detected refresh-token replays (family revocations).',
        );
    }

    recordLogin(result: AuthFlowLoginResult): void {
        this.loginCounter.inc({ result });
    }

    recordTokenGrant(grantType: `${OAuth2TokenGrant}`): void {
        this.tokenGrantCounter.inc({ grant_type: grantType });
    }

    recordAuthorize(outcome: AuthFlowAuthorizeOutcome): void {
        this.authorizeCounter.inc({ outcome });
    }

    recordRefreshReplay(): void {
        this.refreshReplayCounter.inc();
    }
}
