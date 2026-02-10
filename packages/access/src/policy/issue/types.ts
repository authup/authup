/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IssueGroup, IssueItem } from 'validup';

export type PolicyIssueItem = IssueItem;
export type PolicyIssueGroup = IssueGroup;

export type PolicyIssue = PolicyIssueItem | PolicyIssueGroup;
