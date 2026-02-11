/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RobotCredentialsService } from '../../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../database/index.ts';
import {
    RobotEntity, RobotRepository,
} from '../../../../../database/domains/index.ts';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../../../../../../services/index.ts';
import { RobotRequestValidator } from '../utils/index.ts';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../../request/index.ts';

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
    let entity : RobotEntity | null | undefined;
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

    // ----------------------------------------------

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: RobotEntity,
        entity: data,
        entityExisting: entity || undefined,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------

    const credentialsService = new RobotCredentialsService();

    if (entity) {
        await permissionChecker.check({
            name: PermissionName.ROBOT_UPDATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: {
                    ...entity,
                    ...data,
                },
            }),
        });

        entity = repository.merge(entity, data);
        if (data.secret) {
            entity.secret = await credentialsService.protect(data.secret);
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
        input: new PolicyData({
            [BuiltInPolicyType.ATTRIBUTES]: data,
        }),
    });

    if (!data.secret) {
        data.secret = credentialsService.generateSecret();
    }

    entity = repository.create(data);

    entity.secret = await credentialsService.protect(data.secret);
    await repository.save(entity);

    entity.secret = data.secret;

    // todo: this should be executed through a message broker
    if (isRobotSynchronizationServiceUsable()) {
        const robotSynchronizationService = useRobotSynchronizationService();
        await robotSynchronizationService.save(entity);
    }

    return sendCreated(res, entity);
}
