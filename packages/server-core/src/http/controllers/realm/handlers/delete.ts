/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';

import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RealmEntity } from '../../../../domains';
import { useRequestParamID } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function deleteRealmRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.REALM_DELETE)) {
        throw new ForbiddenError('You are not allowed to drop a realm.');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (!entity.built_in) {
        throw new BadRequestError('The realm can not be deleted in general.');
    }

    if (!await ability.can(PermissionName.REALM_DELETE, { attributes: entity })) {
        throw new ForbiddenError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
