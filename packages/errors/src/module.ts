/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorInput } from './types.ts';
import { BadRequestError } from '@ebec/http';
import type { Issue } from 'validup';
import { isObject } from '@authup/kit';

export class AuthupError extends BadRequestError {
    public readonly issues : Issue[];

    public readonly data?: Record<string, any>;

    constructor(input?: AuthupErrorInput) {
        super(input);

        this.issues = [];

        if (isObject(input) && input.data) {
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
