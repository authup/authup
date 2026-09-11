/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';
import {
    AttributeNamesPolicyValidator,
    AttributesPolicyEvaluator,
    AttributesPolicyValidator,
    BuiltInPolicyType,
    CompositePolicyValidator,
    DatePolicyValidator,
    IdentityPermissionBindingPolicyEvaluator,
    IdentityPolicyValidator,
    PermissionBindingPolicyValidator,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyEngine,
    RealmMatchPolicyValidator,
    TimePolicyValidator,
} from '../policy';
import type { PermissionCompileContext, PermissionEvaluationContext } from './evaluator';
import { PermissionEvaluator } from './evaluator';
import { buildPermissionKey } from './helpers';
import { PermissionMemoryProvider } from './provider';
import { RealmScope } from './realm-scope';
import type { PermissionPolicyBinding } from './types';

const policySchema = z.looseObject({ type: z.enum(BuiltInPolicyType) });
const namespaceId = z.uuid().nullable();
const responseSchema = z.object({
    active: z.literal(true),
    // Token kinds/scopes are protocol strings; access intentionally has no
    // dependency on core-kit/specs. Sessions have no token kind.
    kind: z.literal('access_token').optional(),
    session_id: z.uuid().optional(),
    scope: z.string().refine((value) => value.split(' ').includes('global')),
    authorization: z.object({
        version: z.literal(1),
        identity: z.object({
            id: z.uuid(),
            type: z.enum(['user', 'client']),
            realm_id: namespaceId,
            realm_name: z.string().nullable(),
            client_id: namespaceId,
        }),
        permissions: z.array(z.object({
            name: z.string().min(1),
            realm_id: namespaceId,
            client_id: namespaceId,
            policy: policySchema.nullable(),
            grants: z.array(z.object({
                realm_scope: z.enum(RealmScope),
                policy: policySchema.nullable(),
            })),
        })),
    }),
}).refine((value) => value.kind === 'access_token' || !!value.session_id);

/**
 * Build a resource-server evaluator from an authenticated introspection response.
 * Rejects legacy/inactive/incomplete snapshots and unsupported policy types.
 *
 * `evaluate` requires an explicit REALM_MATCH data key (null for global rows).
 * `compile` returns the existing allow/deny/conditional/post contract; reject
 * collection queries returning post unless every row is evaluated before paging.
 * The snapshot's actor is authoritative; caller policy bypass options are ignored.
 */
export async function createAuthorizationEvaluator(response: unknown) {
    // Detach the snapshot: later mutation of a cached HTTP response cannot widen
    // grants after validation (policy query objects carry arbitrary nested data).
    const { authorization } = responseSchema.parse(structuredClone(response));
    const validators = {
        [BuiltInPolicyType.ATTRIBUTES]: new AttributesPolicyValidator(),
        [BuiltInPolicyType.ATTRIBUTE_NAMES]: new AttributeNamesPolicyValidator(),
        [BuiltInPolicyType.COMPOSITE]: new CompositePolicyValidator(),
        [BuiltInPolicyType.DATE]: new DatePolicyValidator(),
        [BuiltInPolicyType.TIME]: new TimePolicyValidator(),
        [BuiltInPolicyType.IDENTITY]: new IdentityPolicyValidator(),
        [BuiltInPolicyType.PERMISSION_BINDING]: new PermissionBindingPolicyValidator(),
        [BuiltInPolicyType.REALM_MATCH]: new RealmMatchPolicyValidator(),
    };
    const validatePolicy = async (input: unknown, withinGrant = false): Promise<void> => {
        const policy = policySchema.parse(input);
        if (withinGrant && policy.type === BuiltInPolicyType.PERMISSION_BINDING) {
            throw new Error('A grant policy cannot recursively evaluate its own permission binding.');
        }
        await validators[policy.type].run(policy);
        if (
            policy.type === BuiltInPolicyType.ATTRIBUTES &&
            !await new AttributesPolicyEvaluator().toCondition(policy)
        ) {
            throw new Error('Unsupported authorization attribute query.');
        }
        if (policy.type === BuiltInPolicyType.COMPOSITE) {
            const children = z.array(z.unknown()).min(1).parse(policy.children);
            for (const child of children) {
                await validatePolicy(child, withinGrant);
            }
        }
    };

    const definitions: PermissionPolicyBinding[] = [];
    const grants: PermissionPolicyBinding[] = [];
    const keys = new Set<string>();
    for (const entry of authorization.permissions) {
        const permission = {
            name: entry.name,
            realmId: entry.realm_id,
            clientId: entry.client_id,
        };
        const key = buildPermissionKey(permission);
        if (keys.has(key)) {
            throw new Error(`Duplicate authorization permission: ${key}`);
        }
        keys.add(key);
        if (entry.policy !== null) await validatePolicy(entry.policy);
        definitions.push({ permission, policies: entry.policy === null ? undefined : [entry.policy] });
        for (const grant of entry.grants) {
            if (grant.policy !== null) await validatePolicy(grant.policy, true);
            grants.push({
                permission,
                realmScope: grant.realm_scope,
                policies: grant.policy === null ? undefined : [grant.policy],
            });
        }
    }

    const engine = new PolicyEngine(PolicyDefaultEvaluators);
    engine.registerEvaluator(BuiltInPolicyType.PERMISSION_BINDING, new IdentityPermissionBindingPolicyEvaluator({ getFor: async () => grants }));
    const evaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider(definitions),
        policyEngine: engine,
    });
    const withIdentity = (input?: PolicyData) => {
        const data = input?.clone() ?? new PolicyData();
        data.set(BuiltInPolicyType.IDENTITY, {
            id: authorization.identity.id,
            type: authorization.identity.type,
            realmId: authorization.identity.realm_id ?? undefined,
            realmName: authorization.identity.realm_name ?? undefined,
            clientId: authorization.identity.client_id,
        });
        return data;
    };
    const forResource = (ctx: PermissionEvaluationContext) => {
        const data = withIdentity(ctx.data);
        if (!data.has(BuiltInPolicyType.REALM_MATCH)) {
            throw new Error('Resource authorization requires realmMatch data (null for a global resource).');
        }
        z.union([z.string().min(1), z.array(z.string().min(1)).min(1), z.null()])
            .parse(data.get(BuiltInPolicyType.REALM_MATCH));
        return {
            name: ctx.name,
            realmId: ctx.realmId,
            clientId: ctx.clientId,
            data,
        };
    };
    return {
        async evaluate(ctx: PermissionEvaluationContext): Promise<void> {
            return evaluator.evaluate(forResource(ctx));
        },
        async evaluateOneOf(ctx: PermissionEvaluationContext): Promise<void> {
            return evaluator.evaluateOneOf(forResource(ctx));
        },
        async compile(ctx: PermissionCompileContext) {
            if (ctx.data?.has(BuiltInPolicyType.REALM_MATCH) || ctx.data?.has(BuiltInPolicyType.ATTRIBUTES)) {
                throw new Error('Compile authorization without resource realm or row attributes.');
            }
            return evaluator.compile({
                name: ctx.name,
                realmId: ctx.realmId,
                clientId: ctx.clientId,
                data: withIdentity(ctx.data),
            });
        },
    };
}
