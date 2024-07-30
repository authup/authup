/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import { ScopeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { ScopeRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestParamID } from '../../../request';

export async function updateScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.SCOPE_UPDATE)) {
        throw new NotFoundError();
    }

    const validator = new ScopeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: ScopeEntity,
    });

    // ----------------------------------------------

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

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: ScopeEntity,
        entity: data,
        entityExisting: {
            id: entity.id,
        },
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------

    entity = repository.merge(entity, data);

    if (!await ability.can(PermissionName.SCOPE_UPDATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
