/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { hasOwnProperty, isObject } from '@authup/kit';
import type { ActorContext } from './actor/types';

export abstract class AbstractEntityService {
    protected getActorRealmId(actor: ActorContext): string | undefined {
        if (!actor.identity) {
            return undefined;
        }

        const { data } = actor.identity;
        if (data.realm_id) {
            return data.realm_id;
        }

        if (isObject(data.realm) && data.realm.id) {
            return data.realm.id;
        }

        return undefined;
    }

    /**
     * Resource-realm entry for a permission `evaluate()` input, spread into the PolicyData
     * literal: `new PolicyData({ [ATTRIBUTES]: x, ...this.resourceRealmMatch(x) })`. It mirrors
     * ATTRIBUTES `realm_id` PRESENCE — the `realmMatch` key is set only when the source carries
     * `realm_id`, so a self-edit UPDATE (where the validator strips `realm_id`) leaves the key
     * ABSENT and the realm_scope reach factor neutral-passes, exactly as the pre-key behavior.
     * A present `realm_id: null` (global resource) is carried as `null` (and `own` denies it).
     */
    protected resourceRealmMatch(source: Record<string, any>): Record<string, any> {
        return hasOwnProperty(source, 'realm_id') ?
            { [BuiltInPolicyType.REALM_MATCH]: source.realm_id ?? null } :
            {};
    }
}
