/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import { SchemaRegistry, defineSchema } from '@rapiq/core';
import { schemaRegistry } from '../../../../core/index.ts';

/**
 * The tag vocabulary of the cache: every public schema plus the tables
 * only the cache tracks. Kept apart from `schemaRegistry`, which is the
 * public query vocabulary and must not grow (#3688).
 */
export const cacheSchemaRegistry = new SchemaRegistry();

for (const schema of schemaRegistry.getAll()) {
    cacheSchemaRegistry.add(schema);
}

cacheSchemaRegistry.add(defineSchema({ name: EntityType.POLICY_ATTRIBUTE }));
