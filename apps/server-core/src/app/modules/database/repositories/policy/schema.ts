/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Policy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const policySchema = defineSchema<Policy>({
    name: EntityType.POLICY,
    fields: {
        default: [
            'id',
            'builtIn',
            'type',
            'displayName',
            'name',
            'description',
            'invert',
            'parentId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'type', 'parentId', 'realmId'] },
    // @ts-expect-error nullable relation (realm) is not covered by SimpleResourceKeys
    relations: { allowed: ['children', 'realm'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { children: EntityType.POLICY, realm: EntityType.REALM },
});
