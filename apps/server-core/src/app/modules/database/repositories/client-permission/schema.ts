/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const clientPermissionSchema = defineSchema<ClientPermission>({
    name: EntityType.CLIENT_PERMISSION,
    filters: { allowed: ['clientId', 'permissionId'] },
    relations: { allowed: ['client', 'permission'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { client: EntityType.CLIENT, permission: EntityType.PERMISSION },
});
