/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData } from '@authup/access';
import { IdentityType } from '@authup/core-kit';
import type { Identity } from '@authup/core-kit';

export function toIdentityPolicyData(identity: Identity | undefined): IdentityPolicyData | undefined {
    if (!identity) {
        return undefined;
    }

    const { type, data } = identity;

    let clientId: string | null;
    if (type === IdentityType.CLIENT) {
        clientId = data.id;
    } else if ('client_id' in data) {
        clientId = data.client_id ?? null;
    } else {
        clientId = null;
    }

    let realmId: string | null = data.realm_id ?? null;
    if (!realmId && data.realm && data.realm.id) {
        realmId = data.realm.id ?? null;
    }

    return {
        type,
        id: data.id,
        clientId,
        realmId,
        realmName: data.realm?.name ?? null,
    };
}
