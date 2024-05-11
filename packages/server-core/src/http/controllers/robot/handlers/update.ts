/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import {
    PermissionName, REALM_MASTER_NAME,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { RobotRepository, resolveRealm, saveRobotCredentialsToVault } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runRobotValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updateRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const result = await runRobotValidation(req, RequestHandlerOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.ROBOT_EDIT)) {
        if (!entity.user_id) {
            throw new ForbiddenError();
        }

        if (
            entity.user_id &&
            entity.user_id !== useRequestEnv(req, 'userId')
        ) {
            throw new ForbiddenError();
        }
    }

    const config = useConfig();

    if (
        isPropertySet(result.data, 'name') &&
        entity.name.toLowerCase() !== result.data.name.toLowerCase() &&
        entity.name.toLowerCase() === config.robotAdminName.toLowerCase()
    ) {
        const realm = await resolveRealm(entity.realm_id);
        if (realm.name === REALM_MASTER_NAME) {
            throw new BadRequestError('The system robot name can not be changed.');
        }
    }

    entity = repository.merge(entity, result.data);

    if (result.data.secret) {
        entity.secret = await repository.hashSecret(result.data.secret);
    }

    entity = await repository.save(entity);

    // ----------------------------------------------

    if (result.data.secret) {
        // todo: this should be executed through a message broker
        await saveRobotCredentialsToVault({
            ...entity,
            secret: result.data.secret,
        });

        entity.secret = result.data.secret;
    }

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
