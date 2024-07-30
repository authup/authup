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
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RoleAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RoleAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestParamID } from '../../../request';

export async function updateRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const validator = new RoleAttributeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RoleAttributeEntity,
    });

    const repository = dataSource.getRepository(RoleAttributeEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, data);

    const ability = useRequestEnv(req, 'abilities');
    if (
        !await ability.has(PermissionName.ROLE_UPDATE) ||
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to update an attribute for this role...');
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
