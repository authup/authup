import { getRepository } from 'typeorm';
import { applyFilters, applyPagination } from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { UserRole } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRoleEntity } from '../../../../domains';

export async function getManyUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;

    const repository = getRepository(UserRoleEntity);
    const query = await repository.createQueryBuilder('user_roles');

    applyFilters(query, filter, {
        allowed: ['user_roles.role_id', 'user_roles.user_id'],
        defaultAlias: 'user_roles',
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

export async function getOneUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(UserRoleEntity);
    const entities = await repository.findOne(id);

    if (typeof entities === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({ data: entities });
}
