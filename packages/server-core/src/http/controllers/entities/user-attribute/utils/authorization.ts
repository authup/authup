/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { Request } from 'routup';
import type { UserAttributeEntity } from '../../../../../database/domains';
import { useRequestIdentity, useRequestPermissionChecker } from '../../../../request';

export async function canRequestManageUserAttribute(
    req: Request,
    entity: UserAttributeEntity,
) : Promise<boolean> {
    const permissionChecker = useRequestPermissionChecker(req);
    const identity = useRequestIdentity(req);

    const isMe = identity &&
        identity.type === 'user' &&
        identity.id === entity.user_id;

    try {
        if (isMe) {
            await permissionChecker.check({
                name: PermissionName.USER_SELF_MANAGE,
                input: {
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
                input: {
                    attributes: entity,
                },
            });
        } catch (e) {
            return false;
        }
    }

    return true;
}
