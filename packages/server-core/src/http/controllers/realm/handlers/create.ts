/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RealmEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { RealmRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRealmRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.REALM_CREATE)) {
        throw new ForbiddenError('You are not permitted to add a realm.');
    }

    const validator = new RealmRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RealmEntity,
    });

    const repository = dataSource.getRepository(RealmEntity);

    if (!await ability.can(PermissionName.REALM_CREATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
