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
import { UserAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { UserAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new UserAttributeRequestValidator();

    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (data.user) {
        data.realm_id = data.user.realm_id;
        data.user_id = data.user.id;
    } else {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
        data.user_id = useRequestEnv(req, 'userId');
    }

    if (
        data.user_id !== useRequestEnv(req, 'userId')
    ) {
        if (
            !useRequestEnv(req, 'abilities').has(PermissionName.USER_EDIT) ||
            !isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to set an attribute for the given user...');
        }
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
