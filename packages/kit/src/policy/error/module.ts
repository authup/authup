/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../../error';

export class PolicyError extends Error {
    public code : null | string;

    constructor(message?: string, code?: string | null) {
        super(message);

        this.code = code ?? null;
    }

    static evaluatorNotFound(type: string) {
        return new PolicyError(
            `No evaluator is registered to handle the policy: ${type}`,
            ErrorCode.POLICY_EVALUATOR_NOT_FOUND,
        );
    }

    static evaluatorNotProcessable() {
        throw new PolicyError(
            'The evaluator can not process the policy.',
            ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE,
        );
    }

    static evaluatorContextInvalid() {
        throw new PolicyError(
            'The evaluator context is not valid.',
            ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID,
        );
    }
}
