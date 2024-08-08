/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { isPropertySet, isUUID } from '@authup/kit';
import { PermissionName, ROLE_ADMIN_NAME, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import { PermissionEntity, RolePermissionEntity, RoleRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { PermissionRequestValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID, isRequestMasterRealm, useRequestEnv,
} from '../../../request';

export async function writePermissionRouteHandler(
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
    const repository = dataSource.getRepository(PermissionEntity);
    let entity : PermissionEntity | undefined;
    if (id) {
        const where: FindOptionsWhere<PermissionEntity> = {};
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
        if (!await ability.has(PermissionName.PERMISSION_UPDATE)) {
            throw new ForbiddenError();
        }

        group = RequestHandlerOperation.UPDATE;
    } else {
        if (!await ability.has(PermissionName.PERMISSION_CREATE)) {
            throw new ForbiddenError();
        }

        group = RequestHandlerOperation.CREATE;
    }

    const validator = new PermissionRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: PermissionEntity,
    });

    if (entity) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        if (entity.built_in && isPropertySet(data, 'name') && entity.name !== data.name) {
            throw new BadRequestError('The name of a built-in permission can not be changed.');
        }

        if (!await ability.can(PermissionName.PERMISSION_UPDATE, { attributes: data })) {
            throw new ForbiddenError();
        }
    } else {
        if (!data.realm_id && !isRequestMasterRealm(req)) {
            const { id } = useRequestEnv(req, 'realm');
            data.realm_id = id;
        }

        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        if (!await ability.can(PermissionName.PERMISSION_CREATE, { attributes: data })) {
            throw new ForbiddenError();
        }
    }

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: PermissionEntity,
        entity: data,
        entityExisting: entity,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    if (entity) {
        entity = repository.merge(entity, data);
        await repository.save(entity);

        return sendAccepted(res, entity);
    }

    entity = repository.create(data);

    await dataSource.transaction(async (entityManager) => {
        const transactionRepository = entityManager.getRepository(PermissionEntity);
        await transactionRepository.save(entity);

        const roleRepository = new RoleRepository(entityManager);
        const role = await roleRepository.findOneBy({
            name: ROLE_ADMIN_NAME,
            realm_id: null,
        });

        const rolePermissionRepository = entityManager.getRepository(RolePermissionEntity);
        await rolePermissionRepository.insert({
            role_id: role.id,
            role_realm_id: role.realm_id,
            permission_id: entity.id,
            permission_realm_id: entity.realm_id,
        });
    });

    return sendCreated(res, entity);
}
