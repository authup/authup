/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { applyFilters, applyPagination } from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { Role } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function getManyRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;

    const roleRepository = getRepository(Role);
    const query = roleRepository.createQueryBuilder('role');

    applyFilters(query, filter, {
        allowed: ['id', 'name'],
        defaultAlias: 'role',
    });

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

export async function getOneRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const roleRepository = getRepository(Role);
    const result = await roleRepository.findOne(id);

    if (typeof result === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({ data: result });
}
