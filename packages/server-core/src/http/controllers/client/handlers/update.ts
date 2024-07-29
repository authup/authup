/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import { ClientEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { ClientRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestIDParam } from '../../../request';

export async function updateClientRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.CLIENT_UPDATE)) {
        throw new ForbiddenError();
    }

    const validator = new ClientRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: ClientEntity,
    });

    if (isPropertySet(data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }
    }

    const repository = dataSource.getRepository(ClientEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: ClientEntity,
        entity: data,
        entityExisting: {
            id: entity.id,
        },
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    entity = repository.merge(entity, data);

    if (!await ability.can(PermissionName.CLIENT_UPDATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
