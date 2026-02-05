/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum PolicyIssueSeverity {
    WARNING = 'warning',
    ERROR = 'error',
}

export enum PolicyIssueCode {
    // Data/Input
    DATA_MISSING = 'DATA_MISSING',
    DATA_INVALID = 'DATA_INVALID',

    // Policy Spec / Config
    INVALID = 'INVALID',
    TYPE_UNKNOWN = 'TYPE_UNKNOWN',
    FIELD_MISSING = 'FIELD_MISSING',
    FIELD_INVALID = 'FIELD_INVALID',

    // Composite / Tree evaluation
    CHILD_INVALID = 'CHILD_INVALID',
    CHILD_EVALUATION_FAILED = 'CHILD_EVALUATION_FAILED',

    // Engine / Evaluator registry
    EVALUATION_DENIED = 'EVALUATION_DENIED',
    EVALUATOR_NOT_FOUND = 'EVALUATOR_NOT_FOUND',
    EVALUATOR_ERROR = 'EVALUATOR_ERROR',

    // Execution control
    SKIPPED_EXCLUDED = 'SKIPPED_EXCLUDED',
    SKIPPED_NOT_INCLUDED = 'SKIPPED_NOT_INCLUDED',

    // Internal / unexpected
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}
