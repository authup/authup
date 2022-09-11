/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { useDataSource } from 'typeorm-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserValidation } from '../utils';
import { UserRepository } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.has(PermissionID.USER_ADD)) {
        throw new ForbiddenError('You are not permitted to add a user.');
    }

    const result = await runUserValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const { entity } = await repository.createWithPassword(result.data);

    await repository.save(entity);

    delete entity.password;

    return res.respondCreated({ data: entity });
}
