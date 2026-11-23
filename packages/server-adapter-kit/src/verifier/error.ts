/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isClientErrorDueTimeout } from '@authup/core-http-kit';
import { UpstreamError, UpstreamTimeoutError, isUpstreamError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { JWTError, isJWTError } from '@authup/specs';
import { VouchlyErrorCode, isVouchlyError } from 'vouchly';

const CAUSE_DEPTH_MAX = 10;

function findCause(input: unknown, match: (value: unknown) => boolean) : unknown {
    let current = input;

    for (let i = 0; i < CAUSE_DEPTH_MAX && isObject(current); i++) {
        if (match(current)) {
            return current;
        }

        current = current.cause;
    }

    return undefined;
}

function isTimeout(input: unknown) : boolean {
    return (isVouchlyError(input) && input.code === VouchlyErrorCode.TIMEOUT) ||
        isClientErrorDueTimeout(input);
}

/**
 * An introspection request carries nothing but the token, so a 400 is
 * authup refusing the token. Every other failure (no answer, a 401 after
 * the re-mint, a 5xx, a body that is no JSON object, a failed mint) is not
 * about the token.
 */
function isIntrospectionUpstreamFailure(input: unknown) : boolean {
    return isVouchlyError(input) &&
        input.code === VouchlyErrorCode.INTROSPECTION_FAILED &&
        input.status !== 400;
}

/**
 * Maps whatever a verification threw onto the error the adapters answer
 * with. The caller's own abort is passed on as is, a request that ran out
 * of time becomes an UpstreamTimeoutError, a failure that is not about the
 * token (authup unreachable, a failed introspection, a failed mint) an
 * UpstreamError, and everything else a JWTError. A JWTError or an
 * UpstreamError a key source raised travels as the cause of vouchly's
 * key_unavailable and is surfaced as is.
 */
export function toVerificationError(input: unknown, signal?: AbortSignal) : unknown {
    if (signal?.aborted && input === signal.reason) {
        return input;
    }

    if (findCause(input, isTimeout)) {
        return new UpstreamTimeoutError({ cause: input });
    }

    const upstream = findCause(input, isUpstreamError);

    if (upstream) {
        return upstream;
    }

    if (isIntrospectionUpstreamFailure(input)) {
        return new UpstreamError({
            ...(Error.isError(input) && input.message ? { message: input.message } : {}),
            cause: input,
        });
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
