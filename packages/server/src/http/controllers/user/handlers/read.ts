import { getCustomRepository } from 'typeorm';
import {
    applyFields, applyFilters, applyPagination, applyRelations,
} from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { onlyRealmPermittedQueryResources } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRepository } from '../../../../domains/user/repository';

export async function getManyUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const {
        filter, page, include, fields,
    } = req.query;

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const query = userRepository.createQueryBuilder('user');

    onlyRealmPermittedQueryResources(query, req.realmId);

    applyFields(query, fields, {
        defaultAlias: 'user',
        allowed: ['id', 'name', 'display_name', 'email'],
    });

    applyFilters(query, filter, {
        defaultAlias: 'user',
        allowed: ['id', 'name', 'realm_id'],
    });

    applyRelations(query, include, {
        defaultAlias: 'user',
        allowed: ['realm', 'user_roles'],
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

export async function getOneUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;
    const { include, fields } = req.query;

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const query = await userRepository.createQueryBuilder('user')
        .andWhere('user.id = :id', { id });

    onlyRealmPermittedQueryResources(query, req.realmId);

    applyFields(query, fields, {
        defaultAlias: 'user',
        allowed: ['email'],
    });

    applyRelations(query, include, {
        defaultAlias: 'user',
        allowed: ['realm', 'user_roles'],
    });

    const entity = await query.getOne();

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({ data: entity });
}
