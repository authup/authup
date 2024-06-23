/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { isPropertySet } from '@authup/kit';
import { PermissionName, REALM_MASTER_NAME } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RealmEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RealmRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updateRealmRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.REALM_EDIT)) {
        throw new ForbiddenError('You are not permitted to edit a realm.');
    }

    const validator = new RealmRequestValidator();

    const data = await validator.execute(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (
        entity.name === REALM_MASTER_NAME &&
        isPropertySet(data, 'name') &&
        entity.name !== data.name
    ) {
        throw new BadRequestError(`The name of the ${REALM_MASTER_NAME} can not be changed.`);
    }

    entity = repository.merge(entity, data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
