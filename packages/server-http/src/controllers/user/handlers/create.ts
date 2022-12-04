/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import { PermissionID } from '@authup/common';
import { Request, Response, sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserRepository } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import { runUserValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

export async function createUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.USER_ADD)) {
        throw new ForbiddenError('You are not permitted to add a user.');
    }

    const result = await runUserValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const { entity } = await repository.createWithPassword(result.data);

    await repository.save(entity);

    delete entity.password;

    return sendCreated(res, entity);
}
