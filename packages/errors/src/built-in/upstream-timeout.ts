/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { markInstanceof } from '@ebec/core';
import { ErrorCode } from '../constants.ts';
import { AuthupError } from '../module.ts';
import type { AuthupErrorOptions } from '../types.ts';

export const UPSTREAM_TIMEOUT_ERROR_INSTANCE = Symbol.for('@authup/errors/UpstreamTimeoutError');

export class UpstreamTimeoutError extends AuthupError {
    constructor(input?: string | AuthupErrorOptions) {
        const options: AuthupErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});

        super({
            code: ErrorCode.UPSTREAM_TIMEOUT,
            message: 'An upstream service did not answer in time.',
            ...options,
        });
        markInstanceof(this, UPSTREAM_TIMEOUT_ERROR_INSTANCE);
    }
}
