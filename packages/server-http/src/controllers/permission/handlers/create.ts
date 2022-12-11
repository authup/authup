/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import { check, matchedData, validationResult } from 'express-validator';
import {
    PermissionID,
} from '@authup/common';
import { Request, Response, sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { PermissionEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils';
import { runPermissionValidation } from '../utils';

export async function createOnePermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    const { data } = await runPermissionValidation(req, 'create');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
