/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    Client,
    PermissionID,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';

export async function createClientRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const data = await runClientValidation(req, 'create');

    if (!req.ability.hasPermission(PermissionID.CLIENT_ADD)) {
        data.user_id = req.userId;
    } else if (
        data.user_id &&
        data.user_id !== req.userId
    ) {
        data.user_id = req.userId;
    }

    const roleRepository = getRepository(Client);
    const role = roleRepository.create(data);

    await roleRepository.save(role);

    return res.respondCreated({
        data: role,
    });
}
