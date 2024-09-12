/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet, isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName, REALM_MASTER_NAME,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RealmEntity } from '../../../../domains';
import { RealmRequestValidator } from '../utils';
import { RequestHandlerOperation, getRequestParamID, useRequestEnv } from '../../../request';

export async function writeRealmRouteHandler(req: Request, res: Response, options: {
    updateOnly?: boolean
} = {}) : Promise<any> {
    let group: string;
    const id = getRequestParamID(req, { isUUID: false });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);
    let entity : RealmEntity | undefined;
    if (id) {
        const where: FindOptionsWhere<RealmEntity> = {};
        if (isUUID(id)) {
            where.id = id;
        } else {
            where.name = id;
        }

        entity = await repository.findOneBy(where);
        if (!entity && options.updateOnly) {
            throw new NotFoundError();
        }
    }

    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    if (entity) {
        await permissionChecker.preCheck({ name: PermissionName.REALM_UPDATE });

        group = RequestHandlerOperation.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.REALM_CREATE });

        group = RequestHandlerOperation.CREATE;
    }

    const validator = new RealmRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RealmEntity,
    });

    if (entity) {
        await permissionChecker.check({ name: PermissionName.REALM_UPDATE, data: { attributes: data } });

        if (entity.name === REALM_MASTER_NAME && isPropertySet(data, 'name') && entity.name !== data.name) {
            throw new BadRequestError(`The name of the ${REALM_MASTER_NAME} can not be changed.`);
        }
    } else {
        await permissionChecker.check({ name: PermissionName.REALM_CREATE, data: { attributes: data } });
    }

    if (entity) {
        entity = repository.merge(entity, data);
        await repository.save(entity);

        return sendAccepted(res, entity);
    }

    entity = repository.create(data);
    await repository.save(entity);

    return sendCreated(res, entity);
}
