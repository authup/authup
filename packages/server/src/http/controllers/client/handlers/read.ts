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
    Client, MASTER_REALM_ID, PermissionID,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function getManyClientRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;

    const repository = getRepository(Client);
    const query = repository.createQueryBuilder('client');

    applyFilters(query, filter, {
        allowed: ['id', 'name'],
        defaultAlias: 'client',
    });

    if (
        !req.ability.hasPermission(PermissionID.CLIENT_EDIT) &&
        !req.ability.hasPermission(PermissionID.CLIENT_DROP)
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

export async function getOneClientRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const clientRepository = getRepository(Client);
    const entity = await clientRepository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        !req.ability.hasPermission(PermissionID.CLIENT_DROP) &&
        !req.ability.hasPermission(PermissionID.CLIENT_EDIT)
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
