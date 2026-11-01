/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAuthenticatorChallengeResponse } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { computed, shallowRef } from 'vue';
import { extractErrorContext, injectHTTPClient } from '../../../core';
import type { AuthenticatorStepUp, AuthenticatorStepUpAttempt, AuthenticatorStepUpResult } from './types';

/**
 * Own-factor management requires a session that passed a challenge once the
 * user holds a factor. A session that just enrolled its first factor never
 * did, so the call answers mfa_required; this proves the session in place
 * through the challenge endpoint instead of failing the call.
 */
export function useAuthenticatorStepUp(): AuthenticatorStepUp {
    const apiClient = injectHTTPClient();
    const status = shallowRef<UserAuthenticatorChallengeResponse | null>(null);

    let settle: ((proven: boolean) => void) | undefined;

    const finish = (proven: boolean) => {
        const resolve = settle;

        settle = undefined;
        status.value = null;
        resolve?.(proven);
    };

    /**
     * Resolves true once the session passed the challenge the call owed,
     * false when the challenge was cancelled; rethrows anything but
     * mfa_required.
     */
    const prove = async (e: unknown): Promise<boolean> => {
        if (extractErrorContext(e).code !== ErrorCode.OAUTH_MFA_REQUIRED) {
            throw e;
        }

        // one challenge at a time: a second call owing one fails as itself
        if (settle) {
            throw e;
        }

        let challenge: UserAuthenticatorChallengeResponse;

        try {
            challenge = await apiClient.userAuthenticator.challenge();
        } catch (challengeError) {
            if (challengeError instanceof Error && typeof challengeError.cause === 'undefined') {
                challengeError.cause = e;
            }

            throw challengeError;
        }

        if (!challenge.required || challenge.kinds.length === 0) {
            throw e;
        }

        if (settle) {
            throw e;
        }

        return new Promise<boolean>((resolve) => {
            settle = resolve;
            status.value = challenge;
        });
    };

    const run = async <T>(fn: () => Promise<T>): Promise<AuthenticatorStepUpResult<T>> => {
        try {
            return { outcome: 'done', data: await fn() };
        } catch (e) {
            if (!await prove(e)) {
                return { outcome: 'cancelled' };
            }

            return { outcome: 'done', data: await fn() };
        }
    };

    const attempt = async <T>(fn: () => Promise<T>): Promise<AuthenticatorStepUpAttempt<T>> => {
        try {
            return { outcome: 'done', data: await fn() };
        } catch (e) {
            return { outcome: await prove(e) ? 'proven' : 'cancelled' };
        }
    };

    return {
        status: computed(() => status.value),
        run,
        attempt,
        complete: () => finish(true),
        cancel: () => finish(false),
    };
}
