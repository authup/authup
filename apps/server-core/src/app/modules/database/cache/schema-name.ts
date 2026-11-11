/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { CacheInvalidationSchemaTarget } from '@rapiq/cache/typeorm';
import type { EntityMetadata, EntityTarget } from 'typeorm';
import type { ObjectLiteral } from '@rapiq/core';
import { PolicyAttributeEntity } from '../../../../adapters/database/domains/index.ts';
import { SCHEMA_ENTITY_TARGETS } from '../repositories/schema-validation.ts';

// append-heavy tables no cached read carries a tag of, so a write bumps nothing.
const CACHE_SCHEMA_NAMES_UNTRACKED = new Set<string>([
    EntityType.EVENT,
    EntityType.SESSION,
    EntityType.SESSION_TOKEN,
]);

const CACHE_SCHEMA_NAMES = new Map<EntityTarget<ObjectLiteral>, string | CacheInvalidationSchemaTarget>([
    ...Object.entries(SCHEMA_ENTITY_TARGETS)
        .filter(([name]) => !CACHE_SCHEMA_NAMES_UNTRACKED.has(name))
        .map(([name, target]) => [target, name] as const),
    // tracked by name alone: the public query vocabulary has no schema for it.
    [PolicyAttributeEntity, { name: EntityType.POLICY_ATTRIBUTE, schema: false }],
]);

/**
 * The cache schema name of an entity, `undefined` for a table the
 * cache does not track.
 */
export function resolveCacheSchemaName(metadata: EntityMetadata): string | CacheInvalidationSchemaTarget | undefined {
    return CACHE_SCHEMA_NAMES.get(metadata.target);
}
