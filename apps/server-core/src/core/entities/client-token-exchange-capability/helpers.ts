/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    PermissionError,
    evaluateRecord,
    hasUnboundedReach,
} from '@authup/access';
import { ClientTokenExchangeRealmScope, PermissionName } from '@authup/core-kit';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';

/**
 * A capability of realm scope `any` acts on subjects of every realm, so the grant
 * writing it has to reach every realm. A policy-narrowed `any` grant reads
 * as not reaching them, the fail-closed answer for this root of trust.
 */
export async function assertCapabilitySubjectRealmReach(
    actor: ActorContext,
    name: PermissionName,
    capability: ClientTokenExchangeCapability,
) : Promise<void> {
    if (capability.realmScope !== ClientTokenExchangeRealmScope.ANY) {
        return;
    }

    if (!await hasUnboundedReach(actor.permissionEvaluator, name)) {
        throw PermissionError.denied(name);
    }
}

/**
 * Whoever controls how a client authenticates holds what its capabilities
 * delegate, so changing that takes the authority writing each of them does.
 */
export async function assertTokenExchangeAuthority(
    actor: ActorContext,
    capabilities: ClientTokenExchangeCapability[],
) : Promise<void> {
    const name = PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE;

    for (const capability of capabilities) {
        await evaluateRecord(actor.permissionEvaluator, {
            name,
            realm: capability.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { ...capability } },
        });

        await assertCapabilitySubjectRealmReach(actor, name, capability);
    }
}
