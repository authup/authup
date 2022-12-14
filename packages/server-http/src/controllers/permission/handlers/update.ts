/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';

import { PermissionName, isPropertySet } from '@authup/common';
import {
    Request, Response, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { PermissionEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils';
import { runPermissionValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

export async function updatePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionName.PERMISSION_EDIT)) {
        throw new ForbiddenError('You are not permitted to edit a permission.');
    }

    const result = await runPermissionValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (
        entity.built_in &&
        isPropertySet(result.data, 'name') &&
        entity.name !== result.data.name
    ) {
        throw new BadRequestError('The name of a built-in permission can not be changed.');
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
