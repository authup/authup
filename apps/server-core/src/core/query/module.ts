/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createURLCodec } from '@rapiq/codec-url';
import type {
    ICondition,
    IQuery,
    ObjectLiteral,
    Schema,
} from '@rapiq/core';
import { Query, SchemaRegistry, isObject } from '@rapiq/core';
import { clientSchema } from '../entities/client/schema.ts';
import { clientPermissionSchema } from '../entities/client-permission/schema.ts';
import { clientRoleSchema } from '../entities/client-role/schema.ts';
import { clientScopeSchema } from '../entities/client-scope/schema.ts';
import { consentSchema } from '../entities/consent/schema.ts';
import { eventSchema } from '../entities/event/schema.ts';
import { identityProviderSchema } from '../entities/identity-provider/schema.ts';
import { identityProviderRoleMappingSchema } from '../entities/identity-provider-role-mapping/schema.ts';
import { keySchema } from '../entities/key/schema.ts';
import { permissionSchema } from '../entities/permission/schema.ts';
import { permissionPolicySchema } from '../entities/permission-policy/schema.ts';
import { policySchema } from '../entities/policy/schema.ts';
import { realmSchema } from '../entities/realm/schema.ts';
import { roleSchema } from '../entities/role/schema.ts';
import { roleAttributeSchema } from '../entities/role-attribute/schema.ts';
import { rolePermissionSchema } from '../entities/role-permission/schema.ts';
import { scopeSchema } from '../entities/scope/schema.ts';
import { sessionSchema } from '../entities/session/schema.ts';
import { sessionTokenSchema } from '../entities/session-token/schema.ts';
import { trustAnchorSchema } from '../entities/trust-anchor/schema.ts';
import { userSchema } from '../entities/user/schema.ts';
import { userAttributeSchema } from '../entities/user-attribute/schema.ts';
import { userAuthenticatorSchema } from '../entities/user-authenticator/schema.ts';
import { userPermissionSchema } from '../entities/user-permission/schema.ts';
import { userRoleSchema } from '../entities/user-role/schema.ts';
import type { DecodeQueryOptions, QueryDecodeContext } from './types.ts';

/**
 * Registry of every entity schema — the server-side allow-list layer.
 * Relation traversal (e.g. a `realm.name` filter) resolves through the
 * `schemaMapping` of the owning schema into the related schema's own
 * allow-lists.
 *
 * The registry deliberately lives in core (persistence-agnostic): the
 * schemas are security policy over the domain types, and services
 * consume them to decode wire queries into the rapiq IR. A repository
 * layer MAY extend the registry with additional, storage-derived
 * schemas (e.g. `@rapiq/adapter-typeorm`'s `defineSchemaRegistryWithDataSource`
 * with the `registry` option — already-registered schemas take
 * precedence), but the allow-lists themselves stay explicit and are
 * never auto-derived from entity metadata.
 */
export const schemaRegistry = new SchemaRegistry();

const schemas : Schema<any>[] = [
    clientSchema,
    clientPermissionSchema,
    clientRoleSchema,
    clientScopeSchema,
    consentSchema,
    eventSchema,
    identityProviderSchema,
    identityProviderRoleMappingSchema,
    keySchema,
    permissionSchema,
    permissionPolicySchema,
    policySchema,
    realmSchema,
    roleSchema,
    roleAttributeSchema,
    rolePermissionSchema,
    scopeSchema,
    sessionSchema,
    sessionTokenSchema,
    trustAnchorSchema,
    userSchema,
    userAttributeSchema,
    userAuthenticatorSchema,
    userPermissionSchema,
    userRoleSchema,
];

for (const schema of schemas) {
    schemaRegistry.add(schema);
}

/**
 * URL transport codec bound to the schema registry: decodes both the
 * v2 expression dialect (stamped or detected) and legacy v1 bracket
 * payloads, so pre-v2 clients keep working.
 */
export const queryCodec = createURLCodec(schemaRegistry);

/**
 * Decode a raw wire query (routup `useRequestQuery` output or a raw
 * query string) against a registered schema into the rapiq IR. The
 * schema's allow-lists, defaults and pagination bounds are applied
 * here — downstream consumers (repository adapters) only execute the
 * returned query.
 *
 * Async because the schema validate hooks are: the relations read
 * gate (`createRelationsReadGate`) awaits the actor's permission
 * pre-gate per include, and rapiq refuses async validators on the
 * synchronous decode path. Pass the acting identity via
 * `options.actor` on every request-driven decode (authenticated or
 * anonymous — the HTTP adapter always builds one); a decode without
 * an actor is a system call and runs unrestricted.
 */
export async function decodeQuery<RECORD extends ObjectLiteral = ObjectLiteral>(
    input: unknown,
    options: DecodeQueryOptions<RECORD>,
) : Promise<Query> {
    const normalized = isObject(input) || typeof input === 'string' ? input : {};

    const parsed = await queryCodec.decodeAsync(normalized, {
        // Schema<RECORD> is invariant; the codec's non-generic options
        // accept Schema<ObjectLiteral>, so collapse the variance here.
        schema: options.schema as Schema<any> | string,
        parameters: options.parameters,
        context: { actor: options.actor } satisfies QueryDecodeContext,
    });

    return parsed ?? new Query({});
}

/**
 * Append server-derived conditions (a route realm, an owner scope, ...)
 * onto a decoded query by AND-wrapping its filter tree. The wrap makes
 * the appended scope non-displaceable: unlike a filters merge (per-field
 * replace, flat-root-AND restriction), a client-sent condition on the
 * same field intersects with the scope instead of replacing it, and
 * compound client trees (`or(...)`) are preserved as-is. Same guarantee
 * class as a mandatory `andWhere` at the repository — expressed once in
 * the IR. Appended conditions do not pass through `decodeQuery`, so the
 * schema allow-lists do not constrain them (server-derived context).
 *
 * Immutable: returns a new `Query` whose filters node is the
 * AND-wrapped successor (`IFilters.and`); every other parameter node is
 * carried over **by reference**, so the input query stays untouched and
 * nothing is copied. The node enumeration mirrors rapiq's
 * `QueryContext` — keep it in sync when the IR gains a parameter.
 *
 * Non-displaceability is carried by an explicit seal marker that
 * `IFilters.and` stamps onto what it injects (rapiq beta.16,
 * tada5hi/rapiq#876). Since beta.18 (tada5hi/rapiq#887) `seal()` is part of
 * the `ICondition` contract itself, so every value this accepts can actually
 * be sealed and the parameter type needs no narrowing to stay sound.
 */
export function appendQueryConditions(query: IQuery, ...conditions: ICondition[]) : Query {
    return new Query({
        fields: query.fields,
        filters: query.filters.and(...conditions),
        relations: query.relations,
        pagination: query.pagination,
        sorts: query.sorts,
    });
}
