/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { PermissionPolicyEntity } from './entity.ts';
import { AUTHORIZATION_CACHE_KEYS } from '../constants.ts';

@EventSubscriber()
export class PermissionPolicySubscriber extends EntitySubscriber<PermissionPolicy> {
    constructor() {
        super({
            type: EntityType.PERMISSION_POLICY,
            target: PermissionPolicyEntity,
            destinations: buildEntityDestinations(EntityType.PERMISSION_POLICY, (data) => [
                data.permissionRealmId,
                data.policyRealmId,
            ]),
            cache: {
                onInsert: true,
                keys: () => [...AUTHORIZATION_CACHE_KEYS],
            },
        });
    }
}
