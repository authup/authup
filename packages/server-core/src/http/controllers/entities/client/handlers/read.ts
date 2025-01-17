/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind } from '@authup/specs';
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
    PermissionName,
} from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { ClientEntity, resolveRealm } from '../../../../../database/domains';
import { isSelfId } from '../../../../../utils';
import { resolveOAuth2SubAttributesForScope } from '../../../../oauth2';
import {
    useRequestIdentity, useRequestParamID, useRequestPermissionChecker, useRequestScopes,
} from '../../../../request';

export async function getManyClientRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientEntity);

    const query = repository.createQueryBuilder('client');

    const options : QueryFieldsApplyOptions<ClientEntity> = {
        defaultAlias: 'client',
        default: [
            'id',
            'name',
            'display_name',
            'description',
            'base_url',
            'root_url',
            'redirect_uri',
            'grant_types',
            'scope',
            'is_confidential',
            'realm_id',
            'user_id',
            'updated_at',
            'created_at',
        ],
        allowed: ['secret'],
    };

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultPath: 'client',
        fields: options,
        filters: {
            allowed: ['name', 'realm_id', 'realm.name'],
        },
        pagination: {
            maxLimit: 50,
        },
        relations: {
            allowed: ['realm'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
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

export async function getOneClientRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ],
    });

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientEntity);

    const query = repository.createQueryBuilder('client');

    const identity = useRequestIdentity(req);
    if (
        isSelfId(id) &&
        identity &&
        identity.type === 'client'
    ) {
        const attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.CLIENT, useRequestScopes(req));
        for (let i = 0; i < attributes.length; i++) {
            query.addSelect(`client.${attributes[i]}`);
        }

        query.where('client.id = :id', { id });
    } else if (isUUID(id)) {
        query.where('client.id = :id', { id });
    } else {
        query.where('client.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('client.realm_id = :realmId', { realmId: realm.id });
    }

    const options : QueryFieldsApplyOptions<ClientEntity> = {
        defaultAlias: 'client',
        default: [
            'id',
            'name',
            'display_name',
            'description',
            'base_url',
            'root_url',
            'redirect_uri',
            'grant_types',
            'scope',
            'is_confidential',
            'realm_id',
            'user_id',
            'updated_at',
            'created_at',
        ],
        allowed: ['secret'],
    };

    applyQuery(query, useRequestQuery(req), {
        defaultPath: 'client',
        fields: options,
        relations: {
            allowed: ['realm'],
        },
    });

    const result = await query.getOne();

    if (!result) {
        throw new NotFoundError();
    }

    return send(res, result);
}
