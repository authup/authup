/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { UserRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.has(PermissionName.USER_CREATE);
    if (!hasAbility) {
        throw new ForbiddenError('You are not permitted to add a user.');
    }

    const validator = new UserRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!data.realm_id) {
        const { id: realmId } = useRequestEnv(req, 'realm');
        data.realm_id = realmId;
    }

    if (!await ability.can(PermissionName.USER_CREATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
    }

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const { entity } = await repository.createWithPassword(data);

    await repository.save(entity);

    delete entity.password;

    return sendCreated(res, entity);
}
