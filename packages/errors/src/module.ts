/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorInput } from './types.ts';
import {
    BaseError,
    INSTANCEOF_PROPERTY,
    markInstanceof,
    serializeInstanceofChain,
} from '@ebec/core';

export const AUTHUP_ERROR_INSTANCE = Symbol.for('@authup/errors/AuthupError');

export class AuthupError extends BaseError {
    public readonly data?: Record<string, any>;

    constructor(input?: AuthupErrorInput) {
        super(input);
        markInstanceof(this, AUTHUP_ERROR_INSTANCE);

        if (input && typeof input !== 'string' && input.data) {
            this.data = input.data;
        }
    }

    /**
     * `super.toJSON()` already emits the serialized marker chain, but the
     * `data` spread runs after it — re-stamped last so a `data` key cannot
     * displace the genuine chain.
     */
    override toJSON() {
        return {
            ...super.toJSON(),
            ...(this.data ?? {}),
            [INSTANCEOF_PROPERTY]: serializeInstanceofChain(this),
        };
    }
}
