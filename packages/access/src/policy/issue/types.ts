/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
export type PolicyIssue = {
    code: string,
    path: (string | number)[],
    message: string,
    severity: 'warning' | 'error',
};

export type PolicyIssueInput = Pick<PolicyIssue, 'code' | 'message'> &
Partial<Omit<PolicyIssue, 'code' | 'message'>>;
