/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { PermissionEntity } from './entity.ts';

@EventSubscriber()
export class PermissionSubscriber extends EntitySubscriber<Permission> {
    constructor() {
        super({
            type: EntityType.PERMISSION,
            target: PermissionEntity,
            destinations: buildEntityDestinations(EntityType.PERMISSION),
        });
    }
}
