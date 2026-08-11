/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { SessionToken } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { session: EntityType.SESSION };

/**
 * The token inventory as a query surface.
 *
 * The rows carry no realm or subject of their own, so both the ownership
 * check and the realm gate resolve through `session`. The repository joins it
 * unconditionally for that reason: a projection must never be able to strip
 * the columns the gate reads (the plan-039 discipline, applied through a
 * relation instead of a column).
 */
export const sessionTokenSchema = defineSchema<SessionToken>({
    name: EntityType.SESSION_TOKEN,
    indexes: [
        ['id'],
        ['sessionId'],
        ['clientId'],
        ['kind'],
        ['expiresAt'],
        ['createdAt'],
    ],
    fields: {
        allowed: [
            'id',
            'sessionId',
            'clientId',
            'kind',
            'parentId',
            'refreshTokenId',
            'ipAddress',
            'userAgent',
            'consumedAt',
            'revokedAt',
            'expiresAt',
            'createdAt',
        ],
    },
    // Plain columns only. Ownership and realm are NOT client-supplied filters:
    // the service resolves them from the joined session per row, so a caller
    // cannot widen its own reach by filtering. These four cover the use cases:
    // `clientId` answers "which sessions did this application serve",
    // `sessionId` answers "which applications rode this session" (the
    // back-channel logout audience), and the pair scopes a per-application
    // revoke to one session.
    filters: {
        allowed: [
            'id',
            'sessionId',
            'clientId',
            'kind',
        ],
        indexed: true,
    },
    // `client` is deliberately absent: the repository always joins a client
    // SUMMARY (id / name / displayName — the consent-list shape), so a raw
    // `?include=client` cannot force the full-column join and a self-service
    // reader still gets application names without CLIENT_READ.
    relations: { allowed: ['session'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['createdAt', 'expiresAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
