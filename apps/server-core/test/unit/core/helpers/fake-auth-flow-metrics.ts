/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrant } from '@authup/specs';
import type {
    AuthFlowAuthorizeOutcome,
    AuthFlowLoginResult,
    IAuthFlowMetrics,
} from '../../../../src/core/metrics/types.ts';

export class FakeAuthFlowMetrics implements IAuthFlowMetrics {
    public loginCalls: AuthFlowLoginResult[] = [];

    public tokenGrantCalls: `${OAuth2TokenGrant}`[] = [];

    public authorizeCalls: AuthFlowAuthorizeOutcome[] = [];

    public refreshReplayCalls = 0;

    recordLogin(result: AuthFlowLoginResult): void {
        this.loginCalls.push(result);
    }

    recordTokenGrant(grantType: `${OAuth2TokenGrant}`): void {
        this.tokenGrantCalls.push(grantType);
    }

    recordAuthorize(outcome: AuthFlowAuthorizeOutcome): void {
        this.authorizeCalls.push(outcome);
    }

    recordRefreshReplay(): void {
        this.refreshReplayCalls += 1;
    }
}
