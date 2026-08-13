/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientScope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { client: EntityType.CLIENT, scope: EntityType.SCOPE };

export const clientScopeSchema = defineSchema<ClientScope>({
    name: EntityType.CLIENT_SCOPE,
    indexes: [
        ['id'],
        ['clientId', 'scopeId'],
        ['scopeId'],
        ['default'],
        ['clientRealmId'],
        ['scopeRealmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'default',
            'clientId',
            'clientRealmId',
            'scopeId',
            'scopeRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['clientId', 'scopeId', 'default', 'id', 'clientRealmId', 'scopeRealmId'], indexed: true },
    relations: { allowed: ['client', 'scope'], validate: createRelationsReadGate(schemaMapping) },
    // wider than the junction siblings' id/createdAt/updatedAt on purpose:
    // every column here is already indexed and already sorts today through
    // the missing-allow-list fallback, so a narrow list would demote the
    // rest from working-and-sorted to silently unsorted (#3441)
    sorts: {
        allowed: [
            'id',
            'default',
            'clientId',
            'clientRealmId',
            'scopeId',
            'scopeRealmId',
            'createdAt',
            'updatedAt',
        ],
        indexed: true,
    },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
