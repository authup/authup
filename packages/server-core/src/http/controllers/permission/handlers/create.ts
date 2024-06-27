/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    ROLE_ADMIN_NAME, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PermissionEntity, RolePermissionEntity, RoleRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RequestHandlerOperation, isRequestMasterRealm } from '../../../request';
import { useRequestEnv } from '../../../utils';
import { PermissionRequestValidator } from '../utils';

export async function createOnePermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PERMISSION_CREATE)) {
        throw new ForbiddenError();
    }

    const validator = new PermissionRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!data.realm_id && !isRequestMasterRealm(req)) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
    }

    if (!ability.can(PermissionName.PERMISSION_CREATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
    }

    await enforceUniquenessForDatabaseEntity(PermissionEntity, data);

    let entity : PermissionEntity | undefined;

    const dataSource = await useDataSource();
    await dataSource.transaction(async (entityManager) => {
        const repository = entityManager.getRepository(PermissionEntity);
        entity = repository.create(data);

        await repository.save(entity);

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
