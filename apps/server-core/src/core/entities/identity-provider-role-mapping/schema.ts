/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const identityProviderRoleMappingSchema = defineSchema<IdentityProviderRoleMapping>({
    name: EntityType.IDENTITY_PROVIDER_ROLE_MAPPING,
    filters: { allowed: ['roleId', 'providerId'] },
    relations: { allowed: ['role', 'provider'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { role: EntityType.ROLE, provider: EntityType.IDENTITY_PROVIDER },
});
