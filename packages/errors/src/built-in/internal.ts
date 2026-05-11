/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../constants.ts';
import { markInstanceof } from '../instanceof.ts';
import { AuthupError } from '../module.ts';
import type { AuthupErrorOptions } from '../types.ts';

export const INTERNAL_ERROR_INSTANCE = Symbol.for('@authup/errors/InternalError');

export class InternalError extends AuthupError {
    constructor(input?: string | AuthupErrorOptions) {
        const options: AuthupErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        super({
            code: ErrorCode.INTERNAL_ERROR,
            message: 'An internal error occurred.',
            ...options,
        });
        markInstanceof(this, INTERNAL_ERROR_INSTANCE);
    }
}
