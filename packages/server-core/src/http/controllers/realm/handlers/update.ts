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
import { sendAccepted } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RealmEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RealmRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestParamID } from '../../../request';

export async function updateRealmRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.REALM_UPDATE)) {
        throw new ForbiddenError('You are not permitted to edit a realm.');
    }

    const validator = new RealmRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);

    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RealmEntity,
    });

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

    if (!await ability.can(PermissionName.REALM_UPDATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
