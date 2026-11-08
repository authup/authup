/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';
import { createTimestampFiltersGate } from '../../query/filters.ts';

const schemaMapping = { client: EntityType.CLIENT, realm: EntityType.REALM };

export const clientTokenExchangePolicySchema = defineSchema<ClientTokenExchangePolicy>({
    name: EntityType.CLIENT_TOKEN_EXCHANGE_POLICY,
    indexes: [
        ['id'],
        ['clientId', 'audience'],
        ['audience'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // see user-role schema: explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'audience',
            'capabilityTypes',
            'maxLifetime',
            'subjectRealmScope',
            'clientId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: {
        allowed: ['id', 'audience', 'clientId', 'realmId', 'createdAt', 'updatedAt'],
        indexed: true,
        validate: createTimestampFiltersGate(),
    },
    relations: { allowed: ['client', 'realm'], validate: createRelationsReadGate(schemaMapping) },
    sorts: {
        allowed: ['id', 'audience', 'clientId', 'realmId', 'createdAt', 'updatedAt'],
        indexed: true,
    },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
