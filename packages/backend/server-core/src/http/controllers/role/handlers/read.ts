/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    applyFields, applyFilters, applyPagination, applySort,
} from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RoleEntity } from '../../../../domains';

export async function getManyRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const {
        filter, page, sort, fields,
    } = req.query;

    const roleRepository = getRepository(RoleEntity);
    const query = roleRepository.createQueryBuilder('role');

    applyFields(query, fields, {
        defaultAlias: 'role',
        allowed: ['id', 'name', 'target', 'description', 'created_at', 'updated_at'],
    });

    applyFilters(query, filter, {
        allowed: ['id', 'name', 'target'],
        defaultAlias: 'role',
    });

    applySort(query, sort, {
        allowed: ['id', 'name', 'updated_at', 'created_at'],
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

    const roleRepository = getRepository(RoleEntity);
    const result = await roleRepository.findOne(id);

    if (typeof result === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({ data: result });
}
