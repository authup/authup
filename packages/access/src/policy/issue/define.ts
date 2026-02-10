/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineIssueGroup, defineIssueItem } from 'validup';
import type { PolicyIssueGroup, PolicyIssueItem } from './types.ts';

export function definePolicyIssueItem(input: Omit<PolicyIssueItem, 'type'>) : PolicyIssueItem {
    return defineIssueItem(input);
}

export function definePolicyIssueGroup(input: Omit<PolicyIssueGroup, 'type'>) : PolicyIssueGroup {
    return defineIssueGroup(input);
}
