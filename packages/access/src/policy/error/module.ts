/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode } from '@authup/errors';
import type { PolicyIssue } from '../issue';

// Symbol used by `isPolicyError` for duck-type detection across realm/bundler
// boundaries where `instanceof` is unreliable. Mirrors the routup convention:
// instances carry an `@instanceof` property pointing to this symbol.
const POLICY_ERROR_INSTANCE = Symbol.for('@authup/access/PolicyError');

export function isPolicyError(value: unknown): value is PolicyError {
    return typeof value === 'object' &&
        value !== null &&
        (value as Record<string, unknown>)['@instanceof'] === POLICY_ERROR_INSTANCE;
}

export class PolicyError extends AuthupError {
    readonly '@instanceof' = POLICY_ERROR_INSTANCE;

    constructor(message?: string, code?: string | null) {
        super({
            message,
            code,
        });
    }

    addIssue(data: PolicyIssue) {
        this.issues.push(data);
    }

    addIssues(data: PolicyIssue[]) {
        this.issues.push(...data);
    }

    static evaluatorNotFound(type: string) {
        return new PolicyError(
            `No evaluator is registered to handle the policy: ${type}`,
            ErrorCode.POLICY_EVALUATOR_NOT_FOUND,
        );
    }

    static evaluatorNotProcessable() {
        return new PolicyError(
            'The evaluator can not process the policy.',
            ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE,
        );
    }

    static evaluatorContextInvalid() {
        return new PolicyError(
            'The evaluator context is not valid.',
            ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID,
        );
    }
}
