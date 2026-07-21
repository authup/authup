/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Consent } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { CONSENT_FILTER_KEYS } from './types.ts';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { realm: EntityType.REALM };

export const consentSchema = defineSchema<Consent>({
    name: EntityType.CONSENT,
    fields: {
        // `default` (not just `allowed`) so the adapter adds an explicit
        // per-column SELECT: it populates expressionMap.selects, which
        // applyRealmScopeSelect dedupes against. Without it the default
        // "select all" is implicit (empty selects) and the force-select
        // re-adds consent.sub — a duplicate `consent_sub` alias that
        // mysql rejects under the client join (see helpers.ts).
        default: [
            'id',
            'clientId',
            'realmId',
            'userId',
            'sub',
            'subKind',
            'scope',
            'expiresAt',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: [...CONSENT_FILTER_KEYS] },
    relations: { allowed: ['realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['createdAt', 'updatedAt', 'scope'] },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
