/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Container } from 'validup';
import { z } from 'zod';
import {
    AttributeNamesPolicyValidator,
    AttributesPolicyValidator,
    BuiltInPolicyType,
    CompositePolicyValidator,
    DatePolicyValidator,
    IdentityPolicyValidator,
    PermissionBindingPolicyValidator,
    RealmMatchPolicyValidator,
    TimePolicyValidator,
} from '../../policy';
import type { AuthorizationPolicy } from './types';

const headSchema = z.looseObject({ type: z.enum(BuiltInPolicyType) });

function createValidators() : Record<BuiltInPolicyType, Container<Record<string, any>>> {
    return {
        [BuiltInPolicyType.ATTRIBUTES]: new AttributesPolicyValidator(),
        [BuiltInPolicyType.ATTRIBUTE_NAMES]: new AttributeNamesPolicyValidator(),
        [BuiltInPolicyType.COMPOSITE]: new CompositePolicyValidator(),
        [BuiltInPolicyType.DATE]: new DatePolicyValidator(),
        [BuiltInPolicyType.TIME]: new TimePolicyValidator(),
        [BuiltInPolicyType.IDENTITY]: new IdentityPolicyValidator(),
        [BuiltInPolicyType.PERMISSION_BINDING]: new PermissionBindingPolicyValidator(),
        [BuiltInPolicyType.REALM_MATCH]: new RealmMatchPolicyValidator(),
    };
}

/**
 * The one definition of what a policy looks like on the wire, used by the server
 * to build a document and by the consumer to validate one. A node is the OUTPUT
 * of its type's validator (validup strips every unmounted key, so entity columns
 * such as `id`, `name`, `builtIn` or `createdAt` never travel), plus its type
 * and, for a composite, its projected children.
 */
export async function projectAuthorizationPolicy(input: unknown) : Promise<AuthorizationPolicy> {
    const validators = createValidators();

    const project = async (value: unknown) : Promise<AuthorizationPolicy> => {
        const head = headSchema.parse(value);
        const validated = await validators[head.type].run(head) as Record<string, unknown>;

        const output : AuthorizationPolicy = { ...validated, type: head.type };
        for (const key of Object.keys(output)) {
            if (typeof output[key] === 'undefined') {
                delete output[key];
            }
        }

        if (head.type === BuiltInPolicyType.COMPOSITE) {
            const children = z.array(z.unknown()).parse(head.children ?? []);
            output.children = await Promise.all(children.map((child) => project(child)));
        } else {
            delete output.children;
        }

        return output;
    };

    return project(input);
}

/**
 * Whether a projected tree evaluates the permission binding at any depth. A
 * grant policy carrying one would re-enter its own permission's grants, so the
 * producer drops such a grant and the consumer refuses such a document.
 */
export function containsBindingCheck(policy: AuthorizationPolicy) : boolean {
    if (policy.type === BuiltInPolicyType.PERMISSION_BINDING) {
        return true;
    }

    return (policy.children ?? []).some((child) => containsBindingCheck(child));
}
