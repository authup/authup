import { getRepository } from 'typeorm';
import { applyFilters, applyPagination } from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotRoleEntity } from '../../../../domains';

export async function getManyRobotRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;

    const repository = getRepository(RobotRoleEntity);
    const query = await repository.createQueryBuilder('robot_roles');

    applyFilters(query, filter, {
        allowed: ['robot_roles.role_id', 'robot_roles.robot_id'],
        defaultAlias: 'robot_roles',
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

export async function getOneRobotRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(RobotRoleEntity);
    const entities = await repository.findOne(id);

    if (typeof entities === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({ data: entities });
}
