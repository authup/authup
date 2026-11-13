/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isClientErrorDueTimeout } from '@authup/core-http-kit';
import { UpstreamTimeoutError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { JWTError, isJWTError } from '@authup/specs';
import { VouchlyErrorCode, isVouchlyError } from 'vouchly';

const CAUSE_DEPTH_MAX = 10;

function isTimeout(input: unknown) : boolean {
    let current = input;

    for (let i = 0; i < CAUSE_DEPTH_MAX && isObject(current); i++) {
        if (isVouchlyError(current) && current.code === VouchlyErrorCode.TIMEOUT) {
            return true;
        }

        if (isClientErrorDueTimeout(current)) {
            return true;
        }

        current = current.cause;
    }

    return false;
}

/**
 * Maps whatever a verification threw onto the error the adapters answer
 * with. The caller's own abort is passed on as is, a request that ran out
 * of time becomes an UpstreamTimeoutError, and everything else a JWTError.
 * A JWTError a key source raised travels as the cause of vouchly's
 * key_unavailable and is surfaced as is.
 */
export function toVerificationError(input: unknown, signal?: AbortSignal) : Error {
    if (signal?.aborted && input === signal.reason) {
        return signal.reason;
    }

    if (isTimeout(input)) {
        return new UpstreamTimeoutError({ cause: input });
    }

    if (isJWTError(input)) {
        return input;
    }

    if (isVouchlyError(input)) {
        if (isJWTError(input.cause)) {
            return input.cause;
        }

        if (input.code === VouchlyErrorCode.TOKEN_EXPIRED) {
            return JWTError.expired();
        }

        if (input.code === VouchlyErrorCode.TOKEN_INACTIVE) {
            return JWTError.notActive();
        }

        return new JWTError({ message: input.message, cause: input });
    }

    if (Error.isError(input)) {
        return new JWTError({
            ...(input.message ? { message: input.message } : {}),
            cause: input,
        });
    }

    return new JWTError();
}
