/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { isPropertySet } from '@authup/kit';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PermissionEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { PermissionRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updatePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PERMISSION_EDIT)) {
        throw new ForbiddenError('You are not permitted to edit a permission.');
    }

    const validator = new PermissionRequestValidator();

    const data = await validator.execute(req, {
        group: RequestHandlerOperation.UPDATE,
    });
    if (isPropertySet(data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (
        entity.built_in &&
        isPropertySet(data, 'name') &&
        entity.name !== data.name
    ) {
        throw new BadRequestError('The name of a built-in permission can not be changed.');
    }

    await enforceUniquenessForDatabaseEntity(PermissionEntity, data, {
        id: entity.id,
    });

    entity = repository.merge(entity, data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
