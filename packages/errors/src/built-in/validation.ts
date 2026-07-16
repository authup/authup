/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../constants.ts';
import { markInstanceof } from '@ebec/core';
import { AuthupError } from '../module.ts';
import type { AuthupErrorOptions } from '../types.ts';

export const VALIDATION_ERROR_INSTANCE = Symbol.for('@authup/errors/ValidationError');

/**
 * A domain/business-rule violation raised by core logic. Deliberately NOT
 * named after an HTTP status: core code stays transport-agnostic, and the HTTP
 * adapter maps its `ErrorCode.BAD_REQUEST` to a 400 response
 * (`httpStatusFromCode`). Prefer this over `BadRequestError` in `core/**`.
 */
export class ValidationError extends AuthupError {
    constructor(input?: string | AuthupErrorOptions) {
        const options: AuthupErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        super({
            code: ErrorCode.BAD_REQUEST,
            ...options,
        });
        markInstanceof(this, VALIDATION_ERROR_INSTANCE);
    }
}
