/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionID, isRealmResourceWritable } from '@authup/common';
import {
    Request, Response, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RoleEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import { runRoleValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

export async function updateRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.ROLE_EDIT)) {
        throw new NotFoundError();
    }

    const result = await runRoleValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    if (!ability.matchTarget(PermissionID.ROLE_EDIT, entity.target)) {
        throw new ForbiddenError('You are not permitted for the role target.');
    }

    // ----------------------------------------------

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
