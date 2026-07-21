/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Client } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { realm: EntityType.REALM, accessPolicy: EntityType.POLICY };

export const clientSchema = defineSchema<Client>({
    name: EntityType.CLIENT,
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
    },
    filters: { allowed: ['id', 'name', 'realmId'] },
    relations: { allowed: ['realm', 'accessPolicy'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
