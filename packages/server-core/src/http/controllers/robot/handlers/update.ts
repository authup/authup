/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    REALM_MASTER_NAME, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { RobotRepository, resolveRealm, saveRobotCredentialsToVault } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RobotRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestIDParam } from '../../../request';

export async function updateRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const validator = new RobotRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    const ability = useRequestEnv(req, 'abilities');
    const userId = useRequestEnv(req, 'userId');
    if (!entity.user_id || !userId || entity.user_id !== userId) {
        if (!await ability.can(PermissionName.ROBOT_UPDATE, { attributes: entity })) {
            throw new ForbiddenError();
        }
    }

    const config = useConfig();

    if (
        isPropertySet(data, 'name') &&
        entity.name.toLowerCase() !== data.name.toLowerCase() &&
        entity.name.toLowerCase() === config.robotAdminName.toLowerCase()
    ) {
        const realm = await resolveRealm(entity.realm_id);
        if (realm.name === REALM_MASTER_NAME) {
            throw new BadRequestError('The system robot name can not be changed.');
        }
    }

    entity = repository.merge(entity, data);

    if (data.secret) {
        entity.secret = await repository.hashSecret(data.secret);
    }

    entity = await repository.save(entity);

    // ----------------------------------------------

    if (data.secret) {
        // todo: this should be executed through a message broker
        await saveRobotCredentialsToVault({
            ...entity,
            secret: data.secret,
        });

        entity.secret = data.secret;
    }

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
