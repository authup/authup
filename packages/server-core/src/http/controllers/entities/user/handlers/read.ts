/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName, ScopeName } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { OAuth2SubKind } from '@authup/specs';
import { NotFoundError } from '@ebec/http';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import type { QueryFieldsApplyOptions } from 'typeorm-extension';
import { applyQuery, useDataSource } from 'typeorm-extension';
import type { UserEntity } from '../../../../../database/domains';
import { UserRepository, resolveRealm } from '../../../../../database/domains';
import { isSelfId } from '../../../../../utils';
import { hasOAuth2Scope, resolveOAuth2SubAttributesForScope } from '../../../../oauth2';
import {
    useRequestIdentity, useRequestParamID, useRequestPermissionChecker, useRequestScopes,
} from '../../../../request';

function buildFieldsOption() : QueryFieldsApplyOptions<UserEntity> {
    return {
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
        allowed: ['email'],
    };
}

export async function getManyUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const query = repository.createQueryBuilder('user');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'user',
        fields: buildFieldsOption(),
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

    const queryOutput = await query.getManyAndCount();
    const [entities] = queryOutput;
    let [, total] = queryOutput;

    const permissionChecker = useRequestPermissionChecker(req);

    const identity = useRequestIdentity(req);

    const data : UserEntity[] = [];
    for (let i = 0; i < entities.length; i++) {
        if (
            identity &&
            identity.type === 'user' &&
            identity.id === entities[i].id
        ) {
            data.push(entities[i]);
            continue;
        }

        try {
            await permissionChecker.checkOneOf({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
                data: {
                    attributes: entities[i],
                },
            });

            data.push(entities[i]);
        } catch (e) {
            total -= 1;
        }
    }

    await repository.findAndAppendExtraAttributesToMany(data);

    return send(res, {
        data,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOneUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const query = repository.createQueryBuilder('user');

    const identity = useRequestIdentity(req);

    let isMe = false;

    if (
        isSelfId(id) &&
        !!identity &&
        identity.type === 'user'
    ) {
        isMe = true;
        query.where('user.id = :id', { id: identity.id });
    } else if (isUUID(id)) {
        if (!!identity && identity.type === 'user' && id === identity.id) {
            isMe = true;
        }
        query.where('user.id = :id', { id });
    } else {
        query.where('user.name = :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('user.realm_id = :realmId', { realmId: realm.id });

        if (
            !!identity &&
            identity.type === 'user' &&
            identity.realmId === realm.id &&
            identity.attributes &&
            identity.attributes.name === id
        ) {
            isMe = true;
        }
    }

    const scopes = useRequestScopes(req);
    if (isMe) {
        const attributes: string[] = resolveOAuth2SubAttributesForScope(OAuth2SubKind.USER, scopes);

        const validAttributes = repository.metadata.columns.map(
            (column) => column.databaseName,
        );
        for (let i = 0; i < attributes.length; i++) {
            const isValid = validAttributes.includes(attributes[i]);
            if (isValid) {
                query.addSelect(`user.${attributes[i]}`);
            }
        }
    } else {
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_READ,
                PermissionName.USER_UPDATE,
                PermissionName.USER_DELETE,
            ],
        });
    }

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'user',
        fields: buildFieldsOption(),
        relations: {
            allowed: ['realm'],
        },
    });

    const entity = await query.getOne();
    if (!entity) {
        throw new NotFoundError();
    }

    if (isMe) {
        if (hasOAuth2Scope(scopes, ScopeName.GLOBAL)) {
            await repository.findAndAppendExtraAttributesTo(entity);
        }
    } else {
        await permissionChecker.checkOneOf({
            name: [
                PermissionName.USER_READ,
                PermissionName.USER_UPDATE,
                PermissionName.USER_DELETE,
            ],
            data: { attributes: entity },
        });

        await repository.findAndAppendExtraAttributesTo(entity);
    }

    return send(res, entity);
}
