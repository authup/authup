/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRoleEntity } from '../../../../domains';
import { runUserRoleValidation } from '../utils';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function createUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.USER_ROLE_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runUserRoleValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
