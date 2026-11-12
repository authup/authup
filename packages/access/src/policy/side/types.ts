/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';

/**
 * The rows for which a policy settles one way (it passes, or it fails):
 * every row, no row, the rows a condition holds for, or rows that can not be
 * expressed as a condition.
 */
export type PolicySide = {
    kind: 'always' | 'never' | 'unknown',
} | {
    kind: 'condition',
    condition: ICondition,
};

/**
 * The rows for which a policy passes and the rows for which it fails. A row in
 * neither is one the policy could not be evaluated for.
 */
export type PolicySides = {
    pass: PolicySide,
    fail: PolicySide,
};
