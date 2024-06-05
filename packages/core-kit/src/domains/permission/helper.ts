/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Ability } from '@authup/kit';
import type { PermissionRelation } from './entity';

export function buildAbility(entity: PermissionRelation): Ability {
    if (typeof entity.permission === 'undefined') {
        throw new SyntaxError('The permission relation attribute is mandatory.');
    }

    return {
        name: entity.permission.name,
        realmId: entity.permission.realm_id,
    };
}
