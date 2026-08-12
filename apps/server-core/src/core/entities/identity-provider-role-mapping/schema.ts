/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { role: EntityType.ROLE, provider: EntityType.IDENTITY_PROVIDER };

export const identityProviderRoleMappingSchema = defineSchema<IdentityProviderRoleMapping>({
    name: EntityType.IDENTITY_PROVIDER_ROLE_MAPPING,
    indexes: [
        ['id'],
        ['providerId', 'roleId'],
        ['roleId'],
        ['providerRealmId'],
        ['roleRealmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'name',
            'value',
            'valueIsRegex',
            'synchronizationMode',
            'providerId',
            'providerRealmId',
            'roleId',
            'roleRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['roleId', 'providerId', 'createdAt', 'id', 'updatedAt', 'providerRealmId', 'roleRealmId'], indexed: true },
    relations: { allowed: ['role', 'provider'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
