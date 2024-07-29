/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RoleAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RoleAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new RoleAttributeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RoleAttributeEntity,
    });

    data.realm_id = data.role.realm_id;

    const ability = useRequestEnv(req, 'abilities');

    if (
        !await ability.has(PermissionName.ROLE_UPDATE) ||
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to set an attribute for this role...');
    }

    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
