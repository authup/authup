/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Path } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = {
    realm: EntityType.REALM,
    parent: EntityType.PATH,
};

/**
 * `name` is deliberately not filterable: it is one segment, it leads no
 * index, and the full `path` covers every lookup a caller makes.
 */
export const pathSchema = defineSchema<Path>({
    name: EntityType.PATH,
    indexes: [
        ['id'],
        ['path', 'realmId'],
        ['displayName'],
        ['parentId'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        allowed: [
            'id',
            'name',
            'path',
            'displayName',
            'description',
            'parentId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'path', 'displayName', 'parentId', 'realmId'], indexed: true },
    relations: { allowed: ['realm', 'parent'], validate: createRelationsReadGate(schemaMapping) },
    sorts: { allowed: ['id', 'path', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
