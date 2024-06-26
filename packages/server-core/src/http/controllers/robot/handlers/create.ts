/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import {
    RobotRepository,
    saveRobotCredentialsToVault,
} from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { RequestHandlerOperation } from '../../../request';
import { RobotRequestValidator } from '../utils';

export async function createRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new RobotRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!data.realm_id) {
        const { id: realmId } = useRequestEnv(req, 'realm');
        data.realm_id = realmId;
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
    }

    const userId = useRequestEnv(req, 'userId');
    if (!data.user_id || !userId || data.user_id !== userId) {
        const ability = useRequestEnv(req, 'abilities');
        if (!await ability.can(PermissionName.ROBOT_CREATE, { attributes: data })) {
            throw new ForbiddenError();
        }
    }

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    const { entity, secret } = await repository.createWithSecret(data);

    await repository.save(entity);

    entity.secret = secret;

    // ----------------------------------------------

    // todo: this should be executed through a message broker
    await saveRobotCredentialsToVault({
        ...entity,
        secret,
    });

    // ----------------------------------------------

    return sendCreated(res, entity);
}
