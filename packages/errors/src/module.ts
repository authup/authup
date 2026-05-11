/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorInput } from './types.ts';
import { BaseError, markInstanceof } from '@ebec/core';
import type { Issue } from 'validup';

export const AUTHUP_ERROR_INSTANCE = Symbol.for('@authup/errors/AuthupError');

export class AuthupError extends BaseError {
    public readonly issues: Issue[];

    public readonly data?: Record<string, any>;

    constructor(input?: AuthupErrorInput) {
        super(input);
        markInstanceof(this, AUTHUP_ERROR_INSTANCE);

        this.issues = [];

        if (input && typeof input !== 'string' && input.data) {
            this.data = input.data;
        }
    }

    override toJSON() {
        return {
            ...super.toJSON(),
            issues: this.issues,
            ...(this.data ?? {}),
        };
    }
}
