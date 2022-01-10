/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { applyFilters, applyPagination } from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import {
    MASTER_REALM_ID, PermissionID, Robot,
} from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function getManyRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;

    const repository = getRepository(Robot);
    const query = repository.createQueryBuilder('client');

    applyFilters(query, filter, {
        allowed: ['id', 'name'],
        defaultAlias: 'client',
    });

    if (
        !req.ability.hasPermission(PermissionID.ROBOT_EDIT) &&
        !req.ability.hasPermission(PermissionID.ROBOT_DROP)
    ) {
        query.andWhere('client.user_id = :userId', { userId: req.userId });
    }

    if (req.realmId !== MASTER_REALM_ID) {
        query.andWhere('client.realm_id = :realmId', { realmId: req.realmId });
    }

    const pagination = applyPagination(query, page, { maxLimit: 50 });

    const [entities, total] = await query.getManyAndCount();

    return res.respond({
        data: {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        },
    });
}

export async function getOneRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const clientRepository = getRepository(Robot);
    const entity = await clientRepository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        req.robotId !== entity.id &&
        !req.ability.hasPermission(PermissionID.ROBOT_DROP) &&
        !req.ability.hasPermission(PermissionID.ROBOT_EDIT)
    ) {
        if (
            !entity.user_id
        ) {
            throw new ForbiddenError();
        }

        if (
            entity.user_id &&
            entity.user_id !== req.userId
        ) {
            throw new ForbiddenError();
        }
    }

    return res.respond({ data: entity });
}
