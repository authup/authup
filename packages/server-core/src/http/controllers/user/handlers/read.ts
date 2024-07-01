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
import { ForbiddenError, NotFoundError } from '@ebec/http';
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
import { useRequestIDParam } from '../../../request';
import { useRequestEnv } from '../../../utils';

async function buildFieldsOption(req: Request) : Promise<QueryFieldsApplyOptions<UserEntity>> {
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

    if (await useRequestEnv(req, 'abilities').has(PermissionName.USER_UPDATE)) {
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
        fields: await buildFieldsOption(req),
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
    const id = useRequestIDParam(req, {
        strict: false,
    });

    const dataSource = await useDataSource();
    const userRepository = new UserRepository(dataSource);
    const query = userRepository.createQueryBuilder('user');

    const userId = useRequestEnv(req, 'userId');

    let isMe = false;

    if (isSelfId(id) && userId) {
        isMe = true;
        query.where('user.id = :id', { id: userId });
    } else if (isUUID(id)) {
        if (id === userId) {
            isMe = true;
        }
        query.where('user.id = :id', { id });
    } else {
        query.where('user.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('user.realm_id = :realmId', { realmId: realm.id });
    }

    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.USER_READ,
        PermissionName.USER_UPDATE,
        PermissionName.USER_DELETE,
    ]);
    if (!isMe && !hasAbility) {
        throw new ForbiddenError();
    }

    const scopes = useRequestEnv(req, 'scopes');
    if (isMe) {
        const attributes: string[] = resolveOAuth2SubAttributesForScope(OAuth2SubKind.USER, scopes);

        const validAttributes = userRepository.metadata.columns.map(
            (column) => column.databaseName,
        );
        for (let i = 0; i < attributes.length; i++) {
            const isValid = validAttributes.includes(attributes[i]);
            if (isValid) {
                query.addSelect(`user.${attributes[i]}`);
            }
        }
    }

    onlyRealmReadableQueryResources(query, useRequestEnv(req, 'realm'));

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'user',
        fields: await buildFieldsOption(req),
        relations: {
            allowed: ['realm'],
        },
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if ((isMe && hasOAuth2Scope(scopes, ScopeName.GLOBAL)) || hasAbility) {
        await userRepository.findAndAppendExtraAttributesTo(entity);
    }

    return send(res, entity);
}
