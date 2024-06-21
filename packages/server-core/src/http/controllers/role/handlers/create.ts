/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { RoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { RoleRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.ROLE_ADD)) {
        throw new ForbiddenError();
    }

    const validator = new RoleRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildRequestValidationErrorMessage('realm_id'));
    }

    await enforceUniquenessForDatabaseEntity(RoleEntity, data);

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
