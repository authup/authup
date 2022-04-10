/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRoleEntity } from '../../../../domains';
import { runUserRoleValidation } from '../utils/utils';
import { CRUDOperation } from '../../../constants';

export async function createUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.USER_ROLE_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runUserRoleValidation(req, CRUDOperation.CREATE);

    const repository = getRepository(UserRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
