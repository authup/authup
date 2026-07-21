/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientScope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { client: EntityType.CLIENT, scope: EntityType.SCOPE };

export const clientScopeSchema = defineSchema<ClientScope>({
    name: EntityType.CLIENT_SCOPE,
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'default',
            'clientId',
            'clientRealmId',
            'scopeId',
            'scopeRealmId',
        ],
    },
    filters: { allowed: ['clientId', 'scopeId', 'default'] },
    relations: { allowed: ['client', 'scope'], validate: createRelationsReadGate(schemaMapping) },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
