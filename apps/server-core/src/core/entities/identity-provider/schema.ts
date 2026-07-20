/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { IdentityProvider } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const identityProviderSchema = defineSchema<IdentityProvider>({
    name: EntityType.IDENTITY_PROVIDER,
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
    filters: { allowed: ['name', 'protocol', 'enabled', 'realmId'] },
    relations: { allowed: ['realm'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { realm: EntityType.REALM },
});
