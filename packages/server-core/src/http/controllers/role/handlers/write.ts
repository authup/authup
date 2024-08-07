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
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import { RoleEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { RoleRequestValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID, isRequestMasterRealm,
} from '../../../request';

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
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        if (!await ability.can(PermissionName.ROLE_UPDATE, { attributes: data })) {
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

        if (!await ability.can(PermissionName.ROLE_CREATE, { attributes: data })) {
            throw new ForbiddenError();
        }
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
