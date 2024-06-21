/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { ScopeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { ScopeRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updateScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.SCOPE_EDIT)) {
        throw new NotFoundError();
    }

    const validator = new ScopeRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ScopeEntity);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    await enforceUniquenessForDatabaseEntity(ScopeEntity, data, {
        id: entity.id,
    });

    // ----------------------------------------------

    entity = repository.merge(entity, data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
