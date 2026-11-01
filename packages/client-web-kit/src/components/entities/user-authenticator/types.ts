/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAuthenticatorChallengeResponse } from '@authup/core-http-kit';
import type { ComputedRef } from 'vue';

export type AuthenticatorStepUpResult<T> = {
    outcome: 'done',
    data: T,
} | {
    outcome: 'cancelled',
};

export type AuthenticatorStepUpAttempt<T> = AuthenticatorStepUpResult<T> | {
    outcome: 'proven',
};

export type AuthenticatorStepUp = {
    /**
     * The challenge the session owes while a step-up is pending.
     */
    status: ComputedRef<UserAuthenticatorChallengeResponse | null>,
    /**
     * Run an own-factor management call. When it answers mfa_required, the
     * session's challenge is rendered in place and the call is retried once
     * after it passed; a cancelled challenge resolves the `cancelled` outcome.
     */
    run<T>(fn: () => Promise<T>): Promise<AuthenticatorStepUpResult<T>>,
    /**
     * Like `run`, but never retries: a call whose input does not outlive the
     * challenge (a typed code, a registration response) resolves `proven`
     * and the caller collects fresh input.
     */
    attempt<T>(fn: () => Promise<T>): Promise<AuthenticatorStepUpAttempt<T>>,
    complete(): void,
    cancel(): void,
};
