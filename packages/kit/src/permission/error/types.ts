/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyError, PolicyWithType } from '../../policy';

export type PermissionEvaluationErrorOptions = {
    name: string,
    policy?: PolicyWithType,
    policyError?: PolicyError
};

export type PermissionErrorOptions = {
    message?: string,
    code?: string | null,
};
