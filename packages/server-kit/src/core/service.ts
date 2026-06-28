/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
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
}
