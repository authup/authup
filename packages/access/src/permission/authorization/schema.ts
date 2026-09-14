/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import { z } from 'zod';
import { RealmScope } from '../realm-scope';
import { AUTHORIZATION_CATALOG_VERSION } from './types';

const id = z.string().min(1);
const namespaceId = id.nullable();

/**
 * Structural validation only. The trees under `policies` are validated by
 * `projectAuthorizationPolicy`, which runs each type's own validator.
 */
export const authorizationPolicySchema = z.looseObject({ type: z.string().min(1) });

/**
 * Structural validation plus one referential rule: every id a definition
 * names must be a key of `policies`. A dangling id resolves to `undefined`,
 * which reads as "this layer carries no policy", so a catalog that merely
 * omitted a tree would grant unrestricted access rather than fail. The lookup
 * is own-property only, so an id such as `constructor` cannot be answered by
 * a member of `Object.prototype`.
 */
export const authorizationCatalogSchema = z.object({
    version: z.literal(AUTHORIZATION_CATALOG_VERSION),
    policies: z.record(id, authorizationPolicySchema),
    permissions: z.array(z.object({
        name: z.string().min(1),
        realm_id: namespaceId,
        client_id: namespaceId,
        decision_strategy: z.enum(DecisionStrategy).nullable(),
        policies: z.array(id),
    })),
}).check((ctx) => {
    const declared = new Set(Object.keys(ctx.value.policies));

    for (let i = 0; i < ctx.value.permissions.length; i++) {
        const { policies } = ctx.value.permissions[i];
        for (const [j, policyId] of policies.entries()) {
            if (declared.has(policyId)) {
                continue;
            }

            ctx.issues.push({
                input: policyId,
                code: 'custom',
                path: ['permissions', i, 'policies', j],
                message: `The policy ${policyId} is not declared by the catalog.`,
            });
        }
    }
});

/**
 * The identity's grant list as the introspection endpoints report it. Whether
 * a grant's policy ids are declared is the consumer's check against the
 * catalog it holds, since the two travel separately.
 */
export const authorizationGrantsSchema = z.array(z.object({
    name: z.string().min(1),
    realm_id: namespaceId.optional(),
    client_id: namespaceId.optional(),
    realm_scope: z.enum(RealmScope).nullish(),
    policies: z.array(id).nullish(),
}));
