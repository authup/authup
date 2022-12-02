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
} from '@authelion/common';
import { Request, Response, sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils/env';
import { RequestValidationError } from '../../../validation';
import { PermissionEntity } from '@authelion/server-database';

export async function createOnePermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    await check('id')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 30 })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
