/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName, ScopeName } from '@authup/core-kit';
import { OAuth2SubKind, isUUID } from '@authup/kit';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import type { QueryFieldsApplyOptions } from 'typeorm-extension';
import { applyQuery, useDataSource } from 'typeorm-extension';
import type { UserEntity } from '../../../../domains';
import { UserRepository, resolveRealm } from '../../../../domains';
import { isSelfId } from '../../../../utils';
import { hasOAuth2Scope, resolveOAuth2SubAttributesForScope } from '../../../oauth2';
import { buildPolicyEvaluationDataByRequest, useRequestEnv, useRequestParamID } from '../../../request';

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
    const userRepository = new UserRepository(dataSource);
    const query = userRepository.createQueryBuilder('user');

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

    const abilities = useRequestEnv(req, 'abilities');

    const requestUser = useRequestEnv(req, 'user');

    const data : UserEntity[] = [];
    const policyEvaluationData = buildPolicyEvaluationDataByRequest(req);
    for (let i = 0; i < queryOutput[0].length; i++) {
        if (
            requestUser &&
            requestUser.id === queryOutput[0][i].id
        ) {
            data.push(queryOutput[0][i]);
            continue;
        }

        const hasAbility = await abilities.canOneOf(
            [
                PermissionName.USER_READ,
                PermissionName.USER_UPDATE,
                PermissionName.USER_DELETE,
            ],
            { ...policyEvaluationData, attributes: queryOutput[0][i] },
        );
        if (hasAbility) {
            data.push(queryOutput[0][i]);
        } else {
            queryOutput[1] -= 1;
        }
    }

    return send(res, {
        data,
        meta: {
            total: queryOutput[1],
            ...pagination,
        },
    });
}

export async function getOneUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.USER_READ,
        PermissionName.USER_UPDATE,
        PermissionName.USER_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const query = repository.createQueryBuilder('user');

    const requestUser = useRequestEnv(req, 'user');
    const requestRealm = useRequestEnv(req, 'realm');

    let isMe = false;

    if (
        isSelfId(id) &&
        requestUser
    ) {
        isMe = true;
        query.where('user.id = :id', { id: requestUser.id });
    } else if (isUUID(id)) {
        if (requestUser && id === requestUser.id) {
            isMe = true;
        }
        query.where('user.id = :id', { id });
    } else {
        query.where('user.name = :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('user.realm_id = :realmId', { realmId: realm.id });

        if (
            requestUser &&
            requestRealm &&
            id === requestUser.name &&
            realm.id === requestRealm.id
        ) {
            isMe = true;
        }
    }

    const scopes = useRequestEnv(req, 'scopes');
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
        const hasAbility = await ability.canOneOf(
            [
                PermissionName.USER_READ,
                PermissionName.USER_UPDATE,
                PermissionName.USER_DELETE,
            ],
            buildPolicyEvaluationDataByRequest(req, { attributes: entity }),
        );

        if (!hasAbility) {
            throw new ForbiddenError();
        }

        await repository.findAndAppendExtraAttributesTo(entity);
    }

    return send(res, entity);
}
