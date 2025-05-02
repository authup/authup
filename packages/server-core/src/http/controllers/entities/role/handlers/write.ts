/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
import { DatabaseConflictError } from '../../../../../database';
import { RoleEntity } from '../../../../../database/domains';
import { RoleRequestValidator } from '../utils';
import {
    RequestHandlerOperation,
    getRequestBodyRealmID,
    getRequestParamID,
    isRequestIdentityMasterRealmMember,
    useRequestIdentityOrFail,
    useRequestPermissionChecker,
} from '../../../../request';

export async function writeRoleRouteHandler(
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
    const repository = dataSource.getRepository(RoleEntity);
    let entity : RoleEntity | undefined;
    if (id) {
        const where: FindOptionsWhere<RoleEntity> = {};
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
        await permissionChecker.preCheck({ name: PermissionName.ROLE_UPDATE });

        group = RequestHandlerOperation.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.ROLE_CREATE });

        group = RequestHandlerOperation.CREATE;
    }

    const validator = new RoleRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RoleEntity,
    });

    // ----------------------------------------------

    if (entity) {
        await permissionChecker.check({
            name: PermissionName.ROLE_UPDATE,
            input: {
                attributes: {
                    ...entity,
                    ...data,
                },
            },
        });
    } else {
        if (!data.realm_id) {
            const identity = useRequestIdentityOrFail(req);
            if (!isRequestIdentityMasterRealmMember(identity)) {
                data.realm_id = identity.realmId;
            }
        }

        await permissionChecker.check({
            name: PermissionName.ROLE_CREATE,
            input: {
                attributes: data,
            },
        });
    }

    // ----------------------------------------------

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: RoleEntity,
        entity: data,
        entityExisting: entity,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------

    if (entity) {
        entity = repository.merge(entity, data);
        await repository.save(entity);

        return sendAccepted(res, entity);
    }

    entity = repository.create(data);
    await repository.save(entity);

    return sendCreated(res, entity);
}
