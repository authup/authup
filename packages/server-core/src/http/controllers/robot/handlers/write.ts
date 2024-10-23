/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    REALM_MASTER_NAME,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { useConfig } from '../../../../config';
import {
    RobotEntity, RobotRepository, resolveRealm,
} from '../../../../database/domains';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../../../../services';
import { RobotRequestValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../request';

export async function writeRobotRouteHandler(
    req: Request,
    res: Response,
    options: {
        updateOnly?: boolean
    } = {},
) : Promise<any> {
    let group: string;
    const id = getRequestParamID(req, { isUUID: false });
    const realmId = getRequestBodyRealmID(req);

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    let entity : RobotEntity | undefined;
    if (id) {
        const where: FindOptionsWhere<RobotEntity> = {};
        if (isUUID(id)) {
            where.id = id;
        } else {
            where.name = id;
        }

        if (realmId) {
            where.realm_id = realmId;
        }

        entity = await repository.findOneBy(where);
        if (!entity && options.updateOnly) {
            throw new NotFoundError();
        }
    } else if (options.updateOnly) {
        throw new NotFoundError();
    }

    const permissionChecker = useRequestPermissionChecker(req);
    if (entity) {
        await permissionChecker.preCheck({ name: PermissionName.ROBOT_UPDATE });

        group = RequestHandlerOperation.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.ROBOT_CREATE });

        group = RequestHandlerOperation.CREATE;
    }

    const validator = new RobotRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RobotEntity,
    });

    if (entity) {
        await permissionChecker.check({
            name: PermissionName.ROBOT_UPDATE,
            data: {
                attributes: {
                    ...entity,
                    ...data,
                },
            },
        });

        const config = useConfig();
        if (
            typeof data.name === 'string' &&
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

        await repository.save(entity);

        if (data.secret) {
            entity.secret = data.secret;

            // todo: this should be executed through a message broker
            if (isRobotSynchronizationServiceUsable()) {
                const robotSynchronizationService = useRobotSynchronizationService();
                await robotSynchronizationService.save(entity);
            }
        }

        return sendAccepted(res, entity);
    }

    if (!data.realm_id) {
        const identity = useRequestIdentityOrFail(req);
        data.realm_id = identity.realmId;
    }

    await permissionChecker.check({
        name: PermissionName.ROBOT_CREATE,
        data: {
            attributes: data,
        },
    });

    if (!data.secret) {
        data.secret = repository.createSecret();
    }

    entity = repository.create(data);

    entity.secret = await repository.hashSecret(data.secret);
    await repository.save(entity);

    entity.secret = data.secret;

    // todo: this should be executed through a message broker
    if (isRobotSynchronizationServiceUsable()) {
        const robotSynchronizationService = useRobotSynchronizationService();
        await robotSynchronizationService.save(entity);
    }

    return sendCreated(res, entity);
}
