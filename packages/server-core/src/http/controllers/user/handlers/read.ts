/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import type { QueryFieldsApplyOptions } from 'typeorm-extension';
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import {
    PermissionName, ScopeName,
} from '@authup/core-kit';
import {
    OAuth2SubKind, isUUID,
} from '@authup/kit';
import type { UserEntity } from '../../../../domains';
import { UserRepository, onlyRealmReadableQueryResources, resolveRealm } from '../../../../domains';
import { isSelfId } from '../../../../utils';
import { hasOAuth2Scope, resolveOAuth2SubAttributesForScope } from '../../../oauth2';
import { useRequestEnv } from '../../../utils';

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

    if (useRequestEnv(req, 'abilities').has(PermissionName.USER_EDIT)) {
        options.allowed = ['email'];
    }

    return options;
}

export async function getManyUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const dataSource = await useDataSource();
    const userRepository = new UserRepository(dataSource);
    const query = userRepository.createQueryBuilder('user');

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

    onlyRealmReadableQueryResources(query, useRequestEnv(req, 'realm'));

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
    const query = userRepository.createQueryBuilder('user');

    const scopes = useRequestEnv(req, 'scopes');
    let attributes : string[] = [];

    if (
        isSelfId(id) &&
        useRequestEnv(req, 'userId')
    ) {
        attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.USER, scopes);

        // todo: check if databaseName has prefix
        const validAttributes = userRepository.metadata.columns.map(
            (column) => column.databaseName,
        );
        for (let i = 0; i < attributes.length; i++) {
            const isValid = validAttributes.includes(attributes[i]);
            if (isValid) {
                // todo: remove attribute from attributes
                query.addSelect(`user.${attributes[i]}`);
            }
        }

        query.where('user.id = :id', { id: useRequestEnv(req, 'userId') });
    } else if (isUUID(id)) {
        query.where('user.id = :id', { id });
    } else {
        query.where('user.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('user.realm_id = :realmId', { realmId: realm.id });
    }

    onlyRealmReadableQueryResources(query, useRequestEnv(req, 'realm'));

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

    if (
        isSelfId(id) &&
        hasOAuth2Scope(scopes, ScopeName.GLOBAL)
    ) {
        await userRepository.findAndAppendExtraAttributesTo(entity);
    }

    return send(res, entity);
}
