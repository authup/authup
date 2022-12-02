/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/query';
import {
    Request, Response, send, useRequestParam,
} from 'routup';
import {
    QueryFieldsApplyOptions,
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { Brackets } from 'typeorm';
import { NotFoundError } from '@ebec/http';
import { OAuth2SubKind, PermissionID, isSelfId } from '@authelion/common';
import { UserEntity, UserRepository, onlyRealmPermittedQueryResources } from '@authelion/server-database';
import { resolveOAuth2SubAttributesForScope } from '../../../oauth2';
import { useRequestEnv } from '../../../utils/env';

function buildFieldsOption(req: Request) : QueryFieldsApplyOptions<UserEntity> {
    const options : QueryFieldsApplyOptions<UserEntity> = {
        defaultAlias: 'user',
        default: [
            'id',
            'name',
            'name_locked',
            'first_name',
            'last_name',
            'display_name',
            'avatar',
            'cover',
            'active',
            'created_at',
            'updated_at',
            'realm_id',
        ],
    };

    if (useRequestEnv(req, 'ability').has(PermissionID.USER_EDIT)) {
        options.allowed = ['email'];
    }

    return options;
}

export async function getManyUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const dataSource = await useDataSource();
    const userRepository = new UserRepository(dataSource);
    const query = userRepository.createQueryBuilder('user');

    onlyRealmPermittedQueryResources(query, useRequestEnv(req, 'realmId'));

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'user',
        fields: buildFieldsOption(req),
        filters: {
            allowed: ['id', 'name', 'realm_id'],
        },
        pagination: {
            maxLimit: 50,
        },
        relations: {
            allowed: ['realm'],
        },
        sort: {
            allowed: ['id', 'name', 'display_name', 'created_at', 'updated_at'],
        },
    });

    const [entities, total] = await query.getManyAndCount();

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOneUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const userRepository = new UserRepository(dataSource);
    const query = await userRepository.createQueryBuilder('user')
        .andWhere('user.id = :id', { id });

    let attributes : string[] = [];

    if (
        isSelfId(id) &&
        useRequestEnv(req, 'userId')
    ) {
        attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.USER, useRequestEnv(req, 'scopes'));

        for (let i = 0; i < attributes.length; i++) {
            // todo: only select valid entity attributes :)
            query.addSelect(`user.${attributes[i]}`);
        }

        query.where('user.id = :id', { id: useRequestEnv(req, 'userId') });
    } else {
        query.where(new Brackets((q2) => {
            q2.where('user.id = :id', { id });
            q2.orWhere('user.name LIKE :name', { name: id });
        }));
    }

    onlyRealmPermittedQueryResources(query, useRequestEnv(req, 'realmId'));

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'user',
        fields: buildFieldsOption(req),
        relations: {
            allowed: ['realm'],
        },
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if (isSelfId(id) && useRequestEnv(req, 'userId')) {
        await userRepository.appendAttributes(entity, attributes);
    }

    return send(res, entity);
}
