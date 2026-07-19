/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Consent } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ConsentEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class ConsentEntitySubscriber extends EntitySubscriber<Consent> {
    constructor() {
        super({
            type: EntityType.CONSENT,
            target: ConsentEntity,
            destinations: buildEntityDestinations(EntityType.CONSENT, (data) => [data.realmId]),
            cache: {
                // union/keep is INSERT-heavy — inserts must invalidate the
                // covering lookup, not only updates/removes.
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.CONSENT_COVERING,
                        key: `${data.clientId}:${data.subKind}:${data.sub}`,
                    }),
                ],
            },
        });
    }
}
