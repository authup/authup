/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { prefixIssuePath } from '@ebec/core';
import { createValidator } from '@validup/zod';
import { Container, ValidupError, isValidupError } from 'validup';
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

type AuthorizationPolicyHead = {
    type: BuiltInPolicyType,
    children?: unknown[],
};

/**
 * The two keys a node carries whatever its type is. Deliberately NOT the whole
 * node: every other key is that type's own configuration, which the type's own
 * validator reads, and a container strips every key it does not mount.
 */
class AuthorizationPolicyHeadValidator extends Container<AuthorizationPolicyHead> {
    override initialize() {
        super.initialize();

        this.mount('type', createValidator(z.enum(BuiltInPolicyType)));
        this.mount('children', createValidator(z.array(z.unknown()).optional()));
    }
}

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
 *
 * Every refusal is a `ValidupError`, the node's head and the type's own
 * validator alike, and a child's issues are rebased onto the position it sits
 * at, so one message names the node in the tree that is wrong.
 */
export async function projectAuthorizationPolicy(input: unknown) : Promise<AuthorizationPolicy> {
    const headValidator = new AuthorizationPolicyHeadValidator();
    const validators = createValidators();

    const project = async (value: unknown) : Promise<AuthorizationPolicy> => {
        const head = await headValidator.run(value as Record<string, any>);
        const validated = await validators[head.type].run(value as Record<string, any>) as Record<string, unknown>;

        const output : AuthorizationPolicy = { ...validated, type: head.type };
        for (const key of Object.keys(output)) {
            if (typeof output[key] === 'undefined') {
                delete output[key];
            }
        }

        if (head.type === BuiltInPolicyType.COMPOSITE) {
            output.children = await Promise.all(
                (head.children ?? []).map((child, index) => projectChild(child, index)),
            );
        } else {
            delete output.children;
        }

        return output;
    };

    const projectChild = async (child: unknown, index: number) : Promise<AuthorizationPolicy> => {
        try {
            return await project(child);
        } catch (e) {
            if (isValidupError(e)) {
                throw new ValidupError(e.issues.map((issue) => prefixIssuePath(issue, ['children', index])));
            }

            throw e;
        }
    };

    return project(input);
}

/**
 * Whether a projected tree evaluates the permission binding at any depth. A
 * grant policy carrying one would re-enter its own permission's grants, so
 * `createAuthorizationEvaluator` drops the grant that names it and evaluates
 * the permission from the rest. Its one caller is that consumer: the tree is
 * legal in a definition, where the binding check is what reach is enforced
 * by, so the producer carries it and only the grant side is refused.
 */
export function containsBindingCheck(policy: AuthorizationPolicy) : boolean {
    if (policy.type === BuiltInPolicyType.PERMISSION_BINDING) {
        return true;
    }

    return (policy.children ?? []).some((child) => containsBindingCheck(child));
}
