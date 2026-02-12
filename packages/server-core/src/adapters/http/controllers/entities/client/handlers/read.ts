/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
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
import { ClientEntity, resolveRealm } from '../../../../../database/domains/index.ts';
import { isSelfToken } from '../../../../../../utils/index.ts';
import { OAuth2ScopeAttributesResolver } from '../../../../../../core/index.ts';
import {
    useRequestIdentity, useRequestParamID, useRequestPermissionChecker, useRequestScopes,
} from '../../../../request/index.ts';

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
            'active',
            'built_in',
            'name',
            'display_name',
            'description',
            'secret_hashed',
            'secret_encrypted',
            'base_url',
            'root_url',
            'redirect_uri',
            'grant_types',
            'scope',
            'is_confidential',
            'realm_id',
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

    const queryResult = await query.getManyAndCount();
    const [entities] = queryResult;
    let [, total] = queryResult;

    const output : ClientEntity[] = [];
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

        if (
            entity.secret &&
            !entity.secret_encrypted &&
            !entity.secret_hashed
        ) {
            try {
                await permissionChecker.checkOneOf({
                    name: [
                        PermissionName.CLIENT_READ,
                        PermissionName.CLIENT_UPDATE,
                        PermissionName.CLIENT_DELETE,
                    ],
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                    }),
                });
                output.push(entity);
            } catch (e) {
                total -= 1;
            }

            continue;
        }

        output.push(entity);
    }

    return send(res, {
        data: output,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOneClientRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientEntity);

    const query = repository.createQueryBuilder('client');

    const identity = useRequestIdentity(req);

    let isMe : boolean = false;
    if (
        identity &&
        identity.type === 'client'
    ) {
        isMe = isSelfToken(id) || identity.id === id;
    }

    if (isMe) {
        const attributesResolver = new OAuth2ScopeAttributesResolver();
        const attributes = attributesResolver.resolveFor(OAuth2SubKind.CLIENT, useRequestScopes(req));

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
            'active',
            'built_in',
            'name',
            'display_name',
            'description',
            'secret_hashed',
            'secret_encrypted',
            'base_url',
            'root_url',
            'redirect_uri',
            'grant_types',
            'scope',
            'is_confidential',
            'realm_id',
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

    const entity = await query.getOne();
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isMe) {
        if (
            entity.secret &&
            !entity.secret_encrypted &&
            !entity.secret_hashed
        ) {
            await permissionChecker.checkOneOf({
                name: [
                    PermissionName.CLIENT_READ,
                    PermissionName.CLIENT_UPDATE,
                    PermissionName.CLIENT_DELETE,
                ],
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        }
    }

    return send(res, entity);
}
