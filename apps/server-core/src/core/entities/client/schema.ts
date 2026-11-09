/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition, KeyValidationVerdict } from '@rapiq/core';
import {
    and,
    contains,
    defineSchema,
    eq,
    ne,
    not,
    or,
} from '@rapiq/core';
import type { Client } from '@authup/core-kit';
import { hasUnboundedReach } from '@authup/access';
import { EntityType, IdentityType, PermissionName } from '@authup/core-kit';
import { OAuth2TokenGrant } from '@authup/specs';
import type { ActorContext } from '@authup/server-kit';
import { createFieldsReadGate } from '../../query/fields.ts';
import { createRelationsReadGate } from '../../query/relations.ts';
import { CLIENT_READ_PERMISSIONS } from './constants.ts';
import { createTimestampFiltersGate } from '../../query/filters.ts';

const schemaMapping = {
    realm: EntityType.REALM,
    accessPolicy: EntityType.POLICY,
    path: EntityType.PATH,
};

/**
 * Per-row visibility gate for the `secret` column (issue #3322) —
 * schema-level, so it applies wherever the client schema governs a
 * projection: the `/clients` root AND the `include=client` paths of
 * client-permission / client-role / client-scope, which never run
 * `ClientService`'s read path.
 *
 * Only a `null` value is visible to every actor that passed the read
 * pre-gate. Every stored form takes the gate: a plaintext is the secret
 * itself, an encrypted value is decrypted for exactly the readers a
 * plaintext reaches (plan 105), and a hashed value, visible to any
 * pre-gated reader until #3328, is a bcrypt hash of an admin-chosen
 * secret and therefore offline-crackable, with no reader-facing reason
 * to ship it across realms. A gated value is visible on the actor's OWN
 * client row (the `getOne` isMe bypass, list-shaped) and on rows the
 * compiled permission condition covers. A non-expressible (`post`) or
 * settled-deny compile yields no permission leg — fail closed rather
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

    // A secret a reader can see is a secret it can present, and on a client of
    // the exchange grant that is its delegation authority, which reading every
    // client does not imply.
    const readsExchangeClients = await hasUnboundedReach(
        actor.permissionEvaluator,
        PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE,
    );

    if (readsExchangeClients && compiled.verdict === 'allow') {
        return true;
    }

    const visible : ICondition[] = [
        eq('secret', null),
    ];

    if (compiled.verdict === 'allow' || compiled.verdict === 'conditional') {
        const legs : ICondition[] = compiled.verdict === 'conditional' ? [compiled.condition] : [];

        if (!readsExchangeClients) {
            legs.push(or(eq('grantTypes', null), not(contains('grantTypes', OAuth2TokenGrant.TOKEN_EXCHANGE))));
        }

        visible.push(and(...legs));
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
        ['displayName'],
        ['realmId'],
        ['pathId'],
        ['active'],
        ['builtIn'],
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
            'redirectUri',
            'postLogoutRedirectUri',
            'backchannelLogoutUri',
            'grantTypes',
            'authMethod',
            'tokenBindingMethod',
            'accessPolicyId',
            'realmId',
            'pathId',
            'updatedAt',
            'createdAt',
        ],
        allowed: ['secret'],
        validateMany: createFieldsReadGate({ secret: secretReadGate }),
    },
    filters: {
        allowed: ['id', 'name', 'displayName', 'realmId', 'pathId', 'active', 'builtIn', 'createdAt', 'updatedAt'],
        indexed: true,
        validate: createTimestampFiltersGate(),
    },
    relations: { allowed: ['realm', 'accessPolicy', 'path'], validate: createRelationsReadGate(schemaMapping) },
    sorts: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    groups: { functions: { bucket: { allowed: ['createdAt'] } } },
    aggregates: { functions: { count: {} } },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
