/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '../../../permission/types';
import type { IdentityGrants } from './types';

/**
 * Bind `bindings` to the subject they were loaded for. Only the subject's
 * `type` and `id` are kept, which is all the binding evaluator compares.
 */
export function defineIdentityGrants(
    identity: { type: string, id: string },
    bindings: PermissionPolicyBinding[],
) : IdentityGrants {
    return {
        identity: {
            type: identity.type,
            id: identity.id,
        },
        bindings,
    };
}
