/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue } from 'validup';

export type PermissionEvaluationErrorOptions = {
    name: string | string[],
    issues: Issue[]
};

export type PermissionErrorOptions = {
    message?: string,
    code?: string | null,
};
