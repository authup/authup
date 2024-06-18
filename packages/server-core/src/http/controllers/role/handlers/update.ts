/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, ROLE_ADMIN_NAME, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { RoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runRoleValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updateRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.ROLE_EDIT)) {
        throw new NotFoundError();
    }

    const result = await runRoleValidation(req, RequestHandlerOperation.UPDATE);
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

    await enforceUniquenessForDatabaseEntity(RoleEntity, result.data, {
        id: entity.id,
    });

    // ----------------------------------------------

    if (
        entity.name === ROLE_ADMIN_NAME &&
        result.data.name &&
        result.data.name !== entity.name
    ) {
        throw new BadRequestError('The default admin role can not be renamed.');
    }

    // ----------------------------------------------

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
