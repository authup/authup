/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const clientRoleSchema = defineSchema<ClientRole>({
    name: EntityType.CLIENT_ROLE,
    filters: { allowed: ['clientId', 'roleId'] },
    relations: { allowed: ['client', 'role'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { client: EntityType.CLIENT, role: EntityType.ROLE },
});
