/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Session } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { SESSION_FILTER_KEYS } from '../../authentication/session/types.ts';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = {
    realm: EntityType.REALM,
    user: EntityType.USER,
    client: EntityType.CLIENT,
};

export const sessionSchema = defineSchema<Session>({
    name: EntityType.SESSION,
    indexes: [
        ['id'],
        ['sub'],
        ['subKind'],
        ['userId'],
        ['clientId'],
        ['realmId'],
        ['seenAt'],
        ['expiresAt'],
        ['userId', 'seenAt'],
        ['realmId', 'seenAt'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        allowed: [
            'id',
            'sub',
            'subKind',
            'ipAddress',
            'userAgent',
            'authMethod',
            'mfaAt',
            'expiresAt',
            'refreshedAt',
            'seenAt',
            'createdAt',
            'updatedAt',
            'userId',
            'clientId',
            'realmId',
        ],
    },
    filters: { allowed: [...SESSION_FILTER_KEYS, 'createdAt', 'expiresAt', 'seenAt', 'updatedAt'], indexed: true },
    relations: { allowed: ['realm', 'user', 'client'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['seenAt', 'expiresAt', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
