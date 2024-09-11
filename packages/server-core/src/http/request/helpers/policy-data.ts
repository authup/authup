/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type { PolicyData, PolicyIdentity } from '@authup/kit';
import type { Request } from 'routup';
import { useRequestEnv } from './env';
import { generatePolicyIdentityByRequest } from './policy-identity';

export function buildPolicyDataForRequest(
    req: Request,
    input: Partial<PolicyData> = {},
) : PolicyData {
    const scopes = useRequestEnv(req, 'scopes') || [];

    // todo: reduce usable permissions based on scope e.g only read permissions / db-entity?!

    let identity : PolicyIdentity | undefined;
    if (scopes.indexOf(ScopeName.GLOBAL) !== -1) {
        identity = generatePolicyIdentityByRequest(req);
    }

    return {
        ...input,
        identity,
    };
}
