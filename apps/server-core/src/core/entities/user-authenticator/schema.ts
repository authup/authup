/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserAuthenticator } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { user: EntityType.USER, realm: EntityType.REALM };

export const userAuthenticatorSchema = defineSchema<UserAuthenticator>({
    name: EntityType.USER_AUTHENTICATOR,
    fields: {
        allowed: [
            'id',
            'kind',
            'name',
            'confirmed',
            'lastUsedAt',
            'createdAt',
            'updatedAt',
            'userId',
            'realmId',
        ],
    },
    filters: { allowed: ['id', 'kind', 'confirmed', 'userId', 'realmId'] },
    relations: { allowed: ['user', 'realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['createdAt', 'updatedAt', 'lastUsedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
