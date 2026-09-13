/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import { z } from 'zod';
import { RealmScope } from '../realm-scope';
import { AUTHORIZATION_DOCUMENT_VERSION } from './types';

const id = z.string().min(1);
const namespaceId = id.nullable();

/**
 * Structural validation only. The trees under `policies` are validated by
 * `projectAuthorizationPolicy`, which runs each type's own validator.
 */
export const authorizationPolicySchema = z.looseObject({ type: z.string().min(1) });

/**
 * Structural validation plus one referential rule: every id a permission or a
 * grant names must be a key of `policies`. A dangling id resolves to
 * `undefined`, which reads as "this layer carries no policy", so a document
 * that merely omitted a tree would grant unrestricted access rather than fail.
 * The lookup is own-property only, so an id such as `constructor` cannot be
 * answered by a member of `Object.prototype`.
 */
export const authorizationDocumentSchema = z.object({
    version: z.literal(AUTHORIZATION_DOCUMENT_VERSION),
    identity: z.object({
        id,
        type: z.enum(['user', 'client']),
        realm_id: namespaceId,
        realm_name: z.string().nullable(),
        client_id: namespaceId,
    }),
    policies: z.record(id, authorizationPolicySchema),
    permissions: z.array(z.object({
        name: z.string().min(1),
        realm_id: namespaceId,
        client_id: namespaceId,
        decision_strategy: z.enum(DecisionStrategy).nullable(),
        policies: z.array(id),
        grants: z.array(z.object({
            realm_scope: z.enum(RealmScope),
            policies: z.array(id),
        })).min(1),
    })),
}).check((ctx) => {
    const declared = new Set(Object.keys(ctx.value.policies));

    const assertDeclared = (ids: string[], path: PropertyKey[]) => {
        for (const [i, policyId] of ids.entries()) {
            if (declared.has(policyId)) {
                continue;
            }

            ctx.issues.push({
                input: policyId,
                code: 'custom',
                path: [...path, i],
                message: `The policy ${policyId} is not declared by the document.`,
            });
        }
    };

    for (let i = 0; i < ctx.value.permissions.length; i++) {
        const permission = ctx.value.permissions[i];

        assertDeclared(permission.policies, ['permissions', i, 'policies']);

        for (let j = 0; j < permission.grants.length; j++) {
            assertDeclared(
                permission.grants[j].policies,
                ['permissions', i, 'grants', j, 'policies'],
            );
        }
    }
});
