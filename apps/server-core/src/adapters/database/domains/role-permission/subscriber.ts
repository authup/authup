/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RolePermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RolePermissionEntity } from './entity.ts';

@EventSubscriber()
export class RolePermissionSubscriber extends EntitySubscriber<RolePermission> {
    constructor() {
        super({
            type: EntityType.ROLE_PERMISSION,
            target: RolePermissionEntity,
            destinations: buildEntityDestinations(EntityType.ROLE_PERMISSION, (data) => [
                data.roleRealmId,
                data.permissionRealmId,
            ]),
        });
    }
}
