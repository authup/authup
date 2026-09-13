/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import { z } from 'zod';
import { RealmScope } from '../realm-scope';
import { AUTHORIZATION_DOCUMENT_VERSION } from './types';

const id = z.string().min(1);
const namespaceId = id.nullable();

/**
 * Structural validation only. The trees under `policies` are validated by
 * `projectAuthorizationPolicy`, which runs each type's own validator.
 */
export const authorizationPolicySchema = z.looseObject({ type: z.string().min(1) });

export const authorizationDocumentSchema = z.object({
    version: z.literal(AUTHORIZATION_DOCUMENT_VERSION),
    identity: z.object({
        id,
        type: z.enum(['user', 'client']),
        realm_id: namespaceId,
        realm_name: z.string().nullable(),
        client_id: namespaceId,
    }),
    policies: z.record(id, authorizationPolicySchema),
    permissions: z.array(z.object({
        name: z.string().min(1),
        realm_id: namespaceId,
        client_id: namespaceId,
        decision_strategy: z.enum(DecisionStrategy).nullable(),
        policies: z.array(id),
        grants: z.array(z.object({
            realm_scope: z.enum(RealmScope),
            policies: z.array(id),
        })).min(1),
    })),
});
