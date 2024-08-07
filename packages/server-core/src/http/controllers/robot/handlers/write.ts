/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    REALM_MASTER_NAME, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { useConfig } from '../../../../config';
import {
    RobotEntity, RobotRepository, resolveRealm, saveRobotCredentialsToVault,
} from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RobotRequestValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID,
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

    const ability = useRequestEnv(req, 'abilities');
    if (entity) {
        if (!await ability.has(PermissionName.ROLE_UPDATE)) {
            throw new ForbiddenError();
        }

        group = RequestHandlerOperation.UPDATE;
    } else {
        if (!await ability.has(PermissionName.ROLE_CREATE)) {
            throw new ForbiddenError();
        }

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
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
            throw new ForbiddenError();
        }

        if (!await ability.can(PermissionName.ROLE_UPDATE, { attributes: data })) {
            throw new ForbiddenError();
        }

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
            await saveRobotCredentialsToVault(entity);
        }

        return sendAccepted(res, entity);
    }

    if (!data.realm_id) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new ForbiddenError();
    }

    if (!await ability.can(PermissionName.ROLE_CREATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    if (!data.secret) {
        data.secret = repository.createSecret();
    }

    entity = repository.create(data);

    entity.secret = await repository.hashSecret(data.secret);
    await repository.save(entity);

    entity.secret = data.secret;
    // todo: this should be executed through a message broker
    await saveRobotCredentialsToVault(entity);

    return sendCreated(res, entity);
}
