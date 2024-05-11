/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotRoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils/env';
import { runRobotRoleValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request/constants';

export async function createRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.ROBOT_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const result = await runRobotRoleValidation(req, RequestHandlerOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
