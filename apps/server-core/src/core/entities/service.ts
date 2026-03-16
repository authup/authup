/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { ActorContext } from './actor/types.ts';

export abstract class AbstractEntityService {
    protected isActorMasterRealmMember(actor: ActorContext): boolean {
        if (!actor.identity) {
            return false;
        }

        const { data } = actor.identity;
        if ('realm' in data && data.realm && typeof data.realm === 'object' && 'name' in data.realm) {
            return data.realm.name === REALM_MASTER_NAME;
        }

        return false;
    }

    protected getActorRealmId(actor: ActorContext): string | undefined {
        if (!actor.identity) {
            return undefined;
        }

        const { data } = actor.identity;
        if (data.realm_id) {
            return data.realm_id;
        }

        if ('realm' in data && data.realm && typeof data.realm === 'object' && 'id' in data.realm) {
            return data.realm.id;
        }

        return undefined;
    }
}
