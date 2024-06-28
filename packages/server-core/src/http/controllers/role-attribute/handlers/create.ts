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
import { useDataSource } from 'typeorm-extension';
import { RoleAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RoleAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new RoleAttributeRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    data.realm_id = data.role.realm_id;

    const ability = useRequestEnv(req, 'abilities');

    if (
        !ability.has(PermissionName.ROLE_UPDATE) ||
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to set an attribute for this role...');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
