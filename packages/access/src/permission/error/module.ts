/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorOptions } from '@authup/errors';
import { AuthupError, ErrorCode, markInstanceof } from '@authup/errors';
import type { PolicyIssue } from '../../policy';

export const PERMISSION_ERROR_INSTANCE = Symbol.for('@authup/access/PermissionError');

export class PermissionError extends AuthupError {
    constructor(options: AuthupErrorOptions = {}) {
        super({
            ...options,
            message: options.message || 'A permission error occurred.',
            code: options.code || ErrorCode.PERMISSION_DENIED,
        });
        markInstanceof(this, PERMISSION_ERROR_INSTANCE);
    }

    addIssue(data: PolicyIssue) {
        this.issues.push(data);
    }

    addIssues(data: PolicyIssue[]) {
        this.issues.push(...data);
    }

    static notFound(name: string) {
        return new PermissionError({
            message: `The permission ${name} was not found.`,
            code: ErrorCode.PERMISSION_NOT_FOUND,
        });
    }

    static denied(name: string) {
        return new PermissionError({
            message: `The permission ${name} has not been granted.`,
            code: ErrorCode.PERMISSION_DENIED,
        });
    }

    static deniedAll(names: string[]) {
        return new PermissionError({
            message: `None of the permissions ${names.join(', ')} has been granted.`,
            code: ErrorCode.PERMISSION_DENIED,
        });
    }

    static evaluationFailed(name: string | string[]) {
        if (Array.isArray(name)) {
            return new PermissionError({
                message: `The evaluation of permissions ${name.join(', ')} failed`,
                code: ErrorCode.PERMISSION_EVALUATION_FAILED,
            });
        }

        return new PermissionError({
            message: `The evaluation of permission ${name} failed`,
            code: ErrorCode.PERMISSION_EVALUATION_FAILED,
        });
    }
}
