/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Permission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const permissionSchema = defineSchema<Permission>({
    name: EntityType.PERMISSION,
    filters: { allowed: ['id', 'displayName', 'name', 'builtIn'] },
    relations: { allowed: [] },
    sort: { allowed: ['id', 'name', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
});
