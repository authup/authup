/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { IdentityProviderAccount } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { IDENTITY_PROVIDER_ACCOUNT_FILTER_KEYS } from './types.ts';
import { createRelationsReadGate } from '../../query/relations.ts';

// `provider` is a deliberately ungated include target: the provider list
// is anonymous and the entity columns are benign (secrets live in EA).
const schemaMapping = { provider: EntityType.IDENTITY_PROVIDER };

export const identityProviderAccountSchema = defineSchema<IdentityProviderAccount>({
    name: EntityType.IDENTITY_PROVIDER_ACCOUNT,
    indexes: [
        ['id'],
        ['providerId', 'userId'],
        ['userId'],
        ['userRealmId'],
        ['providerUserId', 'providerId'],
        ['providerRealmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        // `default` (not just `allowed`) so the adapter's plan-039
        // force-select can dedupe against an explicit projection. The
        // external-token columns (accessToken/refreshToken + their expiry
        // metadata) are `select: false` on the entity, so they can never
        // ride ANY read surface — the collection projection, an explicit
        // `fields=accessToken`, or the un-projected single-record read —
        // and are auto-exempt from the boot field-coverage assertion.
        default: [
            'id',
            'providerUserId',
            'providerUserName',
            'providerUserEmail',
            'createdAt',
            'updatedAt',
            'userId',
            'userRealmId',
            'providerId',
            'providerRealmId',
        ],
    },
    filters: { allowed: [...IDENTITY_PROVIDER_ACCOUNT_FILTER_KEYS, 'providerRealmId'], indexed: true },
    relations: { allowed: ['provider'], validate: createRelationsReadGate(schemaMapping) },
    sorts: { allowed: ['createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
