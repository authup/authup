/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PermissionEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runPermissionValidation } from '../utils';

export async function createOnePermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionName.PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    const { data } = await runPermissionValidation(req, 'create');

    await enforceUniquenessForDatabaseEntity(PermissionEntity, data);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
