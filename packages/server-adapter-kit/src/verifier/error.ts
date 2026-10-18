/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWTError, isJWTError } from '@authup/specs';
import { VouchlyErrorCode, isVouchlyError } from 'vouchly';

/**
 * Maps whatever a verification threw onto authup's JWTError, so the adapters
 * keep answering with authup's error codes. A JWTError a key source raised
 * travels as the cause of vouchly's key_unavailable and is surfaced as is.
 */
export function toJWTError(input: unknown) : JWTError {
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

    if (input instanceof Error) {
        return new JWTError({
            ...(input.message ? { message: input.message } : {}),
            cause: input,
        });
    }

    return new JWTError();
}
