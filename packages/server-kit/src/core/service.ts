/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '@authup/access';
import { BuiltInPolicyType, evaluateRecordUpdate } from '@authup/access';
import { isObject } from '@authup/kit';
import type { ActorContext } from './actor/types';
import type { EntityUpdateEvaluationResolvers } from './types';

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
     * An UPDATE is allowed only when the permission passes for BOTH the stored
     * row (the actor may only change a row it can already reach) and the
     * updated row (the row must stay in reach afterwards). Evaluating the
     * updated row alone lets an update move a row INTO reach, e.g. refile a
     * client into the folder an ATTRIBUTES policy grants (#3654).
     *
     * Each row is evaluated as the ATTRIBUTES of its own check. `realm` is
     * required and resolves the RECORD's realm per row (the stored row's realm
     * for the stored check), which each grant's `realm_scope` is matched
     * against.
     */
    protected async evaluateUpdate(
        actor: ActorContext,
        name: string,
        current: Record<string, any>,
        next: Record<string, any>,
        resolvers: EntityUpdateEvaluationResolvers,
    ): Promise<void> {
        const target = (row: Record<string, any>) => ({
            realm: resolvers.realm(row),
            data: { [BuiltInPolicyType.ATTRIBUTES]: row },
        });

        await evaluateRecordUpdate(actor.permissionEvaluator, {
            name,
            current: target(current),
            next: target(next),
        });
    }
}
