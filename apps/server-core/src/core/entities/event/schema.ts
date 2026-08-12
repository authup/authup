/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Event } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const eventSchema = defineSchema<Event>({
    name: EntityType.EVENT,
    indexes: [
        ['id'],
        ['name', 'scope'],
        ['scope'],
        ['refType', 'refId'],
        ['refId'],
        ['clientId'],
        ['sessionId'],
        ['actorType'],
        ['actorId'],
        ['actorName', 'requestIpAddress', 'createdAt'],
        ['requestIpAddress'],
        ['realmId'],
        ['expiring'],
        ['realmId', 'createdAt'],
        ['createdAt'],
    ],
    fields: {
        allowed: [
            'id',
            'scope',
            'name',
            'refType',
            'refId',
            'clientId',
            'sessionId',
            'actorType',
            'actorId',
            'actorName',
            'requestPath',
            'requestMethod',
            'requestIpAddress',
            'requestUserAgent',
            'realmId',
            'data',
            'expiring',
            'expiresAt',
            'createdAt',
        ],
    },
    filters: {
        allowed: [
            'id',
            'scope',
            'name',
            'refType',
            'refId',
            'clientId',
            'sessionId',
            'actorType',
            'actorId',
            'actorName',
            'requestIpAddress',
            'realmId',
            'expiring',
            'createdAt',
        ],
        indexed: true,
    },
    relations: { allowed: [] },
    sort: { allowed: ['createdAt'], indexed: true },
    pagination: { maxLimit: 50 },
});
