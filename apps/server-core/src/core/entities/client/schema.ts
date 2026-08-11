/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition, KeyValidationVerdict } from '@rapiq/core';
import {
    and,
    defineSchema,
    eq,
    ne,
    or,
} from '@rapiq/core';
import type { Client } from '@authup/core-kit';
import { EntityType, IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import { createFieldsReadGate } from '../../query/fields.ts';
import { createRelationsReadGate } from '../../query/relations.ts';
import { CLIENT_READ_PERMISSIONS } from './constants.ts';

const schemaMapping = { realm: EntityType.REALM, accessPolicy: EntityType.POLICY };

/**
 * Per-row visibility gate for the `secret` column (issue #3322) —
 * schema-level, so it applies wherever the client schema governs a
 * projection: the `/clients` root AND the `include=client` paths of
 * client-permission / client-role / client-scope, which never run
 * `ClientService`'s read path.
 *
 * Only rows exposing a PLAINTEXT secret are guarded: `null`, hashed
 * and encrypted values stay visible to any actor that passed the read
 * pre-gate (the historical service semantics). A plaintext value is
 * additionally visible on the actor's OWN client row (the `getOne`
 * isMe bypass, list-shaped) and on rows the compiled permission
 * condition covers. A non-expressible (`post`) or settled-deny compile
 * yields no permission leg — fail closed for plaintext rows rather
 * than falling back to per-row evaluation.
 *
 * The outer `ne('realmId', null)` guard is semantically inert (clients
 * are realm-bound) but makes the condition fail closed on rows whose
 * gate columns were not fetched — an `ownOrNull` reach compiles to a
 * null-inclusive realm leg that would otherwise MATCH a missing
 * column. The SQL adapter force-selects every column the condition
 * reads (rapiq#830's operand projection), so this is defense in depth.
 */
async function secretReadGate(actor: ActorContext) : Promise<KeyValidationVerdict> {
    const compiled = await actor.permissionEvaluator.compile({ name: CLIENT_READ_PERMISSIONS });
    if (compiled.verdict === 'allow') {
        return true;
    }

    const visible : ICondition[] = [
        eq('secret', null),
        eq('secretHashed', true),
        eq('secretEncrypted', true),
    ];

    if (compiled.verdict === 'conditional') {
        visible.push(compiled.condition);
    }

    if (
        actor.identity &&
        actor.identity.type === IdentityType.CLIENT &&
        actor.identity.data.id
    ) {
        visible.push(eq('id', actor.identity.data.id));
    }

    return and(ne('realmId', null), or(...visible));
}

export const clientSchema = defineSchema<Client>({
    name: EntityType.CLIENT,
    indexes: [
        ['id'],
        ['name', 'realmId'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        default: [
            'id',
            'active',
            'builtIn',
            'name',
            'displayName',
            'description',
            'secretHashed',
            'secretEncrypted',
            'baseUrl',
            'rootUrl',
            'redirectUri',
            'postLogoutRedirectUri',
            'grantTypes',
            'scope',
            'authMethod',
            'tokenBindingMethod',
            'accessPolicyId',
            'realmId',
            'updatedAt',
            'createdAt',
        ],
        allowed: ['secret'],
        validateMany: createFieldsReadGate({ secret: secretReadGate }),
    },
    filters: { allowed: ['id', 'name', 'realmId'], indexed: true },
    relations: { allowed: ['realm', 'accessPolicy'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
