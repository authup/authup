/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, ROLE_ADMIN_NAME, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import { RoleEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { RoleRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestIDParam } from '../../../request';

export async function updateRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.ROLE_UPDATE)) {
        throw new NotFoundError();
    }

    const validator = new RoleRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RoleEntity,
    });

    if (isPropertySet(data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(RoleEntity);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: RoleEntity,
        entity: data,
        entityExisting: {
            id: entity.id,
        },
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------

    if (
        entity.name === ROLE_ADMIN_NAME &&
        data.name &&
        data.name !== entity.name
    ) {
        throw new BadRequestError('The default admin role can not be renamed.');
    }

    // ----------------------------------------------

    entity = repository.merge(entity, data);

    if (!await ability.can(PermissionName.ROLE_UPDATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
