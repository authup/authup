/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { UserEntity } from './entity.ts';

@EventSubscriber()
export class UserSubscriber extends EntitySubscriber<User> {
    constructor() {
        super({
            type: EntityType.USER,
            target: UserEntity,
            destinations: buildEntityDestinations(EntityType.USER, (data) => [data.realmId]),
        });
    }
}
