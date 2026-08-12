/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { IdentityProvider } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { realm: EntityType.REALM };

export const identityProviderSchema = defineSchema<IdentityProvider>({
    name: EntityType.IDENTITY_PROVIDER,
    indexes: [
        ['id'],
        ['name', 'realmId'],
        ['displayName'],
        ['protocol'],
        ['enabled'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        default: [
            'id',
            'name',
            'displayName',
            'protocol',
            'preset',
            'enabled',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['name', 'displayName', 'protocol', 'enabled', 'realmId', 'id'], indexed: true },
    relations: { allowed: ['realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
