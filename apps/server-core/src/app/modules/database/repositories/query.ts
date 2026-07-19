/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createURLCodec } from '@rapiq/codec-url';
import type { IQuery, QueryContext, Schema  } from '@rapiq/core';
import { Query, SchemaRegistry, isObject } from '@rapiq/core';
import { TypeormAdapter } from '@rapiq/typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import type { EntityRepositoryPaginationMeta } from '@authup/server-kit';
import { sessionSchema } from '../../authentication/repositories/session-schema.ts';
import { consentSchema } from '../../oauth2/repositories/consent/schema.ts';
import { clientSchema } from './client/schema.ts';
import { clientPermissionSchema } from './client-permission/schema.ts';
import { clientRoleSchema } from './client-role/schema.ts';
import { clientScopeSchema } from './client-scope/schema.ts';
import { eventSchema } from './event/schema.ts';
import { identityProviderSchema } from './identity-provider/schema.ts';
import { identityProviderRoleMappingSchema } from './identity-provider-role-mapping/schema.ts';
import { keySchema } from './key/schema.ts';
import { permissionSchema } from './permission/schema.ts';
import { permissionPolicySchema } from './permission-policy/schema.ts';
import { policySchema } from './policy/schema.ts';
import { realmSchema } from './realm/schema.ts';
import { roleSchema } from './role/schema.ts';
import { roleAttributeSchema } from './role-attribute/schema.ts';
import { rolePermissionSchema } from './role-permission/schema.ts';
import { scopeSchema } from './scope/schema.ts';
import { trustAnchorSchema } from './trust-anchor/schema.ts';
import { userSchema } from './user/schema.ts';
import { userAttributeSchema } from './user-attribute/schema.ts';
import { userAuthenticatorSchema } from './user-authenticator/schema.ts';
import { userPermissionSchema } from './user-permission/schema.ts';
import { userRoleSchema } from './user-role/schema.ts';

/**
 * Registry of every entity schema — the server-side allow-list layer.
 * Relation traversal (e.g. a `realm.name` filter) resolves through the
 * `schemaMapping` of the owning schema into the related schema's own
 * allow-lists.
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

export type ApplyRequestQueryParameter = keyof QueryContext | 'sort';

export type ApplyRequestQueryOptions = {
    /**
     * Name of the registered schema to validate against.
     */
    schema: string,
    /**
     * Restrict which parsed parameters are applied to the query
     * builder (default: all). E.g. a bulk-delete selection applies
     * `['filters']` only, so a schema `pagination.maxLimit` can never
     * silently truncate the affected row set.
     */
    parameters?: ApplyRequestQueryParameter[],
};

function maskQuery(parsed: IQuery, parameters: ApplyRequestQueryParameter[]) : IQuery {
    const context : QueryContext = {};

    if (parameters.includes('fields')) {
        context.fields = parsed.fields;
    }
    if (parameters.includes('filters')) {
        context.filters = parsed.filters;
    }
    if (parameters.includes('pagination')) {
        context.pagination = parsed.pagination;
    }
    if (parameters.includes('relations')) {
        context.relations = parsed.relations;
    }
    if (parameters.includes('sorts') || parameters.includes('sort')) {
        context.sorts = parsed.sorts;
    }

    return new Query(context);
}

/**
 * Decode a raw request query (routup `useRequestQuery` output or a raw
 * query string) against a registered schema and apply it to the given
 * TypeORM query builder. Returns the applied pagination for the
 * response meta block.
 *
 * Joins triggered by the parsed relations replicate the DISTINCT-id
 * pattern: when the builder already groups by the root id, every join
 * contributes its own `GROUP BY <alias>.id`.
 */
export function applyRequestQuery(
    queryBuilder: SelectQueryBuilder<any>,
    query: unknown,
    options: ApplyRequestQueryOptions,
) : { pagination: EntityRepositoryPaginationMeta } {
    const input = isObject(query) || typeof query === 'string' ? query : {};

    let parsed = queryCodec.decode(input, { schema: options.schema });
    if (!parsed) {
        parsed = new Query({});
    }

    if (options.parameters) {
        parsed = maskQuery(parsed, options.parameters);
    }

    const adapter = new TypeormAdapter({
        queryBuilder,
        relations: {
            onJoin: (_path, alias, qb) => {
                if (qb.expressionMap.groupBys.length > 0) {
                    qb.addGroupBy(`${alias}.id`);
                }
            },
        },
    });

    const { pagination } = adapter.execute(parsed);

    return { pagination };
}
