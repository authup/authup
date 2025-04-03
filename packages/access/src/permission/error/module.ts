/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorOptions } from '@authup/errors';
import { AuthupError, ErrorCode } from '@authup/errors';
import type { PolicyError, PolicyWithType } from '../../policy';
import { BuiltInPolicyType } from '../../policy';
import type { PermissionEvaluationErrorOptions } from './types';

export class PermissionError extends AuthupError {
    public policy : PolicyWithType | undefined;

    public policyError : PolicyError | undefined;

    constructor(options: AuthupErrorOptions = {}) {
        super({
            ...options,
            message: options.message || 'A permission error occurred.',
            statusCode: options.statusCode || 403,
        });
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

    static evaluationFailed(options: PermissionEvaluationErrorOptions) {
        const error = new PermissionError({
            message: `The evaluation of permission ${options.name} failed.`,
            code: ErrorCode.PERMISSION_EVALUATION_FAILED,
        });

        if (options.policy) {
            error.policy = options.policy;

            if (options.policy.type === BuiltInPolicyType.IDENTITY) {
                error.statusCode = 401;
            }
        }

        if (options.policyError) {
            error.policyError = options.policyError;
        }

        return error;
    }
}
