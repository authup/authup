/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { isObject } from '@authup/kit';

export function getClientErrorCode(err: unknown): string | null {
    /* istanbul ignore next */
    if (!isObject(err) || !isObject(err.response) || !isObject(err.response.data) || typeof err.response.data.code !== 'string') {
        return null;
    }

    return err.response.data.code;
}

/**
 * The OAuth2 `error` field of a response body (RFC 6749 §5.2).
 */
export function getClientOAuth2ErrorCode(err: unknown): string | null {
    if (!isObject(err) || !isObject(err.response) || !isObject(err.response.data) || typeof err.response.data.error !== 'string') {
        return null;
    }

    return err.response.data.error;
}
