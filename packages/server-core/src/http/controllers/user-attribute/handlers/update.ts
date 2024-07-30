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
import { UserAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { UserAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestParamID } from '../../../request';

export async function updateUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const validator = new UserAttributeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserAttributeEntity,
    });

    const repository = dataSource.getRepository(UserAttributeEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, data);

    const userId = useRequestEnv(req, 'userId');
    const abilities = useRequestEnv(req, 'abilities');

    if (entity.user_id !== userId) {
        if (
            !await abilities.can(PermissionName.USER_UPDATE, { attributes: entity }) ||
            !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to update an attribute for the given user...');
        }
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
