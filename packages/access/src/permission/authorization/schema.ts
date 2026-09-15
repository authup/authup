/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineIssueItem } from '@ebec/core';
import { DecisionStrategy } from '@authup/kit';
import { createValidator } from '@validup/zod';
import { Container, ValidupError } from 'validup';
import { z } from 'zod';
import { RealmScope } from '../realm-scope';
import type {
    AuthorizationCatalog,
    AuthorizationEvaluatorInput,
    AuthorizationGrant,
} from './types';

const id = z.string().min(1);
const namespaceId = id.nullable();

/**
 * A policy node as it travels. Deliberately LOOSE: every key beyond `type` is
 * that type's own configuration, and `projectAuthorizationPolicy` is what
 * validates it, by running the type's own validator. Mounting a node in a
 * validup container would strip every key the container does not mount, and
 * the whole configuration would go with it.
 */
export const authorizationPolicySchema = z.looseObject({ type: z.string().min(1) });

/**
 * One permission definition. `policies` carries the ids of its
 * definition-layer trees, or `null` when the server could not project one.
 */
export const authorizationDefinitionSchema = z.object({
    name: z.string().min(1),
    realm_id: namespaceId,
    client_id: namespaceId,
    decision_strategy: z.enum(DecisionStrategy).nullable(),
    policies: z.array(id).nullable(),
});

export const authorizationCatalogSchema = z.object({
    policies: z.record(id, authorizationPolicySchema),
    permissions: z.array(authorizationDefinitionSchema),
});

/**
 * One grant of the identity, as the introspection endpoints report it.
 * Whether a grant's policy ids are declared is checked against the catalog
 * the consumer holds, since the two travel separately.
 */
export const authorizationGrantSchema = z.object({
    name: z.string().min(1),
    realm_id: namespaceId.optional(),
    client_id: namespaceId.optional(),
    realm_scope: z.enum(RealmScope).nullish(),
    policies: z.array(id).nullish(),
});

export const authorizationIdentitySchema = z.object({
    id: z.string().min(1),
    type: z.enum(['user', 'client']),
    realmId: z.string().nullish(),
    realmName: z.string().nullish(),
    clientId: z.string().nullish(),
});

/**
 * The whole input `createAuthorizationEvaluator` takes: the catalog
 * `GET /authorization` serves, the grants an introspection reports and the
 * identity it names. A validup container over zod mounts, the shape every
 * validator in this package uses, so a consumer can reuse or override one
 * member's rules instead of restating the document.
 */
export class AuthorizationEvaluatorInputValidator extends Container<AuthorizationEvaluatorInput> {
    override initialize() {
        super.initialize();

        this.mount('catalog', createValidator(authorizationCatalogSchema));
        this.mount('grants', createValidator(z.array(authorizationGrantSchema).optional()));
        this.mount('identity', createValidator(authorizationIdentitySchema.optional()));
    }
}

const validator = new AuthorizationEvaluatorInputValidator();

export type AuthorizationEvaluatorInputParsed = {
    catalog: AuthorizationCatalog,
    grants: AuthorizationGrant[],
    identity: AuthorizationEvaluatorInput['identity'],
};

/**
 * Validate the evaluator's input, plus the two rules per-key validators
 * cannot express.
 *
 * Every id a definition names must be a key of `policies`: a dangling id
 * resolves to `undefined`, which reads as "this layer carries no policy", so
 * a catalog that merely omitted a tree would grant unrestricted access rather
 * than fail. The lookup is own-property only, so an id such as `constructor`
 * cannot be answered by a member of `Object.prototype`.
 *
 * And the identity and its grants travel together: grants without an identity
 * belong to nobody, while an identity without a grant list is the shape an
 * INACTIVE introspection produces (`permissions` is absent unless the
 * credential is active), which read as "holds nothing" would authorize every
 * definition that carries no binding check. An identity holding no grant says
 * so with an empty array.
 */
export async function parseAuthorizationEvaluatorInput(
    input: AuthorizationEvaluatorInput,
) : Promise<AuthorizationEvaluatorInputParsed> {
    const identityGiven = typeof input.identity !== 'undefined';
    const grantsGiven = typeof input.grants !== 'undefined';
    if (!identityGiven && grantsGiven) {
        throw new ValidupError([defineIssueItem({
            message: 'Grants require the identity they belong to.',
            path: ['identity'],
        })]);
    }

    if (identityGiven && !grantsGiven) {
        throw new ValidupError([defineIssueItem({
            message: 'An identity requires its grant list; pass an empty array for an identity holding none.',
            path: ['grants'],
        })]);
    }

    // Detach: a later mutation of a cached HTTP response cannot widen grants
    // after validation (attribute queries carry arbitrary nested data).
    //
    // The cast is the container's boundary: its generic describes the INPUT,
    // whose wire members are `unknown` by design, while what a run returns is
    // what the mounted schemas accepted (the `parseThemeManifest` idiom).
    const {
        catalog, 
        grants, 
        identity, 
    } = await validator.run(
        structuredClone(input) as Record<string, any>,
    ) as {
        catalog: AuthorizationCatalog,
        grants?: AuthorizationGrant[],
        identity?: AuthorizationEvaluatorInput['identity'],
    };

    for (const [i, definition] of catalog.permissions.entries()) {
        for (const [j, policyId] of (definition.policies ?? []).entries()) {
            if (Object.hasOwn(catalog.policies, policyId)) {
                continue;
            }

            throw new ValidupError([defineIssueItem({
                message: `The policy ${policyId} is not declared by the catalog.`,
                path: ['catalog', 'permissions', i, 'policies', j],
            })]);
        }
    }

    return {
        catalog,
        grants: grants ?? [],
        identity,
    };
}

/**
 * One verdict: the permission namespace and the requested realms it holds in.
 * A realm value is a realm key the caller itself supplied, or `null` for the
 * global rows, so nothing here is resolved or looked up.
 */
export const authorizationCheckPermissionSchema = z.object({
    name: z.string().min(1),
    realms: z.array(z.string().min(1).nullable()).min(1),
});

export const authorizationCheckPermissionsSchema = z.array(authorizationCheckPermissionSchema);
