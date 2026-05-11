/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, hasInstanceof, isAuthupError } from '@authup/errors';
import { POLICY_ERROR_INSTANCE, type PolicyError } from './module';

export function isPolicyError(input: unknown): input is PolicyError {
    if (hasInstanceof(input, POLICY_ERROR_INSTANCE)) {
        return true;
    }

    if (!isAuthupError(input)) {
        return false;
    }

    return input.code === ErrorCode.POLICY_EVALUATOR_NOT_FOUND ||
        input.code === ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE ||
        input.code === ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID;
}
