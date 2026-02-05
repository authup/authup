/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyIssueSeverity } from './constants.ts';
import type { PolicyIssue, PolicyIssueInput } from './types.ts';

export function definePolicyIssue(input: PolicyIssueInput) : PolicyIssue {
    return {
        ...input,
        severity: input.severity || PolicyIssueSeverity.ERROR,
        path: input.path || [],
    };
}
