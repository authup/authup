/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { ErrorContext } from './types';

/**
 * Pull the structured `{ code, data, message, issues, status }` out of whatever
 * the caller caught. An authup server error arrives as a hapic `ClientError`
 * whose `response.data` is the serialized error body (`AuthupError.toJSON`
 * flattens `code` + `data` onto the top level and carries the validup
 * `issues`); a directly-thrown `AuthupError` or plain `Error` exposes the
 * same fields on itself. Duck-typed on purpose — no hapic import (it is not a
 * declared dependency, and its `isClientError` guard is `instanceof`-based, so
 * it would miss a non-hapic-instance error), works for both transports.
 */
export function extractErrorContext(error: unknown): ErrorContext {
    if (!isObject(error)) {
        return { message: typeof error === 'string' ? error : undefined };
    }

    const self = error as Record<string, any>;
    const { response } = self;
    const body: Record<string, any> = isObject(response) && isObject(response.data) ?
        response.data :
        self;

    const status = isObject(response) && typeof response.status === 'number' ?
        response.status :
        undefined;

    // The server-side body `message` is the most specific human string; the
    // transport error's own `message` (e.g. hapic's "Request failed") is only
    // the last resort.
    let message: string | undefined;
    if (typeof body.message === 'string') {
        message = body.message;
    } else if (typeof self.message === 'string') {
        message = self.message;
    }

    return {
        code: typeof body.code === 'string' ? body.code : undefined,
        data: body,
        message,
        // Only validation (`BAD_REQUEST`) errors carry issues; a coded
        // business error serializes an empty array.
        issues: Array.isArray(body.issues) && body.issues.length > 0 ? body.issues : undefined,
        status,
    };
}
