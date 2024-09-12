/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { Request } from 'routup';
import type { UserAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../request';

export async function canRequestManageUserAttribute(
    req: Request,
    entity: UserAttributeEntity,
) : Promise<boolean> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const userId = useRequestEnv(req, 'userId');

    const isMe : boolean = userId === entity.user_id;

    try {
        if (isMe) {
            await permissionChecker.check({
                name: PermissionName.USER_SELF_MANAGE,
                data: {
                    attributes: entity,
                },
            });

            return true;
        }
    } catch (e) {
        if (!isMe) {
            return false;
        }
    }

    if (!isMe) {
        try {
            await permissionChecker.check({
                name: PermissionName.USER_UPDATE,
                data: {
                    attributes: entity,
                },
            });
        } catch (e) {
            return false;
        }
    }

    return true;
}
