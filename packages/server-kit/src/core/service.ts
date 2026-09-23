/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '@authup/access';
import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { hasOwnProperty, isObject } from '@authup/kit';
import type { ActorContext } from './actor/types';

export abstract class AbstractEntityService {
    /**
     * The actor's grants, or none: an actor whose grants were not resolved can
     * delegate nothing, so a missing resolver denies rather than widens.
     */
    protected async getActorGrants(actor: ActorContext): Promise<PermissionPolicyBinding[]> {
        return actor.grants ? actor.grants() : [];
    }

    protected getActorRealmId(actor: ActorContext): string | undefined {
        if (!actor.identity) {
            return undefined;
        }

        const { data } = actor.identity;
        if (data.realmId) {
            return data.realmId;
        }

        if (isObject(data.realm) && data.realm.id) {
            return data.realm.id;
        }

        return undefined;
    }

    /**
     * Resource-realm entry for a permission `evaluate()` input, spread into the PolicyData
     * literal: `new PolicyData({ [ATTRIBUTES]: x, ...this.resourceRealmMatch(x) })`. It mirrors
     * ATTRIBUTES `realmId` PRESENCE — the `realmMatch` key is set only when the source carries
     * `realmId`, so a self-edit UPDATE (where the validator strips `realmId`) leaves the key
     * ABSENT and the realm_scope reach factor neutral-passes, exactly as the pre-key behavior.
     * A present `realmId: null` (global resource) is carried as `null` (and `own` denies it).
     */
    protected resourceRealmMatch(source: Record<string, any>): Record<string, any> {
        return hasOwnProperty(source, 'realmId') ?
            { [BuiltInPolicyType.REALM_MATCH]: source.realmId ?? null } :
            {};
    }

    /**
     * An UPDATE is allowed only when the permission passes for BOTH the stored
     * row (the actor may only change a row it can already reach) and the
     * updated row (the row must stay in reach afterwards). Evaluating the
     * updated row alone lets an update move a row INTO reach, e.g. refile a
     * client into the folder an ATTRIBUTES policy grants (#3654).
     *
     * `data` may be a function of the evaluated row, so each check reads the
     * realm of its own row: the stored row's realm for the stored check.
     */
    protected async evaluateUpdate(
        actor: ActorContext,
        name: string,
        current: Record<string, any>,
        next: Record<string, any>,
        data: Record<string, any> | ((attributes: Record<string, any>) => Record<string, any>) = {},
    ): Promise<void> {
        for (const attributes of [current, next]) {
            const extra = typeof data === 'function' ? data(attributes) : data;
            await actor.permissionEvaluator.evaluate({
                name,
                data: definePolicyData({ ...extra, [BuiltInPolicyType.ATTRIBUTES]: attributes }),
            });
        }
    }
}
