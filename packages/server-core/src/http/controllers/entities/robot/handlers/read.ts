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
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { isUUID } from '@authup/kit';
import {
    PermissionName,
} from '@authup/core-kit';
import { RobotEntity, resolveRealm } from '../../../../../database/domains';
import { isSelfId } from '../../../../../utils';
import { resolveOAuth2SubAttributesForScopes } from '../../../../oauth2';
import {
    useRequestIdentity,
    useRequestParamID,
    useRequestPermissionChecker,
    useRequestScopes,
} from '../../../../request';

export async function getManyRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.ROBOT_READ,
            PermissionName.ROBOT_UPDATE,
            PermissionName.ROBOT_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'robot',
        fields: {
            allowed: [
                'secret',
            ],
            default: [
                'id',
                'name',
                'display_name',
                'description',
                'active',
                'user_id',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['id', 'name', 'realm_id', 'user_id'],
        },
        pagination: {
            maxLimit: 50,
        },
        relations: {
            allowed: ['realm', 'user'],
        },
        sort: {
            allowed: ['id', 'realm_id', 'user_id', 'updated_at', 'created_at'],
        },
    });

    const queryOutput = await query.getManyAndCount();

    const identity = useRequestIdentity(req);

    const data : RobotEntity[] = [];
    for (let i = 0; i < queryOutput[0].length; i++) {
        if (
            identity &&
            identity.type === 'robot' &&
            identity.id === queryOutput[0][i].id
        ) {
            data.push(queryOutput[0][i]);
            continue;
        }

        try {
            await permissionChecker.checkOneOf({
                name: [
                    PermissionName.ROBOT_READ,
                    PermissionName.ROBOT_UPDATE,
                    PermissionName.ROBOT_DELETE,
                ],
                input: { attributes: queryOutput[0][i] },
            });

            data.push(queryOutput[0][i]);
        } catch (e) {
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

export async function getOneRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot');

    const identity = useRequestIdentity(req);
    let isMe = false;

    if (
        isSelfId(id) &&
        identity &&
        identity.type === 'robot'
    ) {
        isMe = true;
        query.where('robot.id = :id', { id: identity.id });
    } else if (isUUID(id)) {
        if (
            identity &&
            identity.type === 'robot' &&
            id === identity.id
        ) {
            isMe = true;
        }

        query.where('robot.id = :id', { id });
    } else {
        query.where('robot.name = :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('robot.realm_id = :realmId', { realmId: realm.id });

        if (
            identity &&
            identity.type === 'robot' &&
            identity.realmId === realm.id &&
            identity.attributes &&
            identity.attributes.name === id
        ) {
            isMe = true;
        }
    }

    const scopes = useRequestScopes(req);
    if (isMe) {
        const attributes: string[] = resolveOAuth2SubAttributesForScopes(OAuth2SubKind.ROBOT, scopes);

        const validAttributes = repository.metadata.columns.map(
            (column) => column.databaseName,
        );
        for (let i = 0; i < attributes.length; i++) {
            const isValid = validAttributes.includes(attributes[i]);
            if (isValid) {
                query.addSelect(`robot.${attributes[i]}`);
            }
        }
    } else {
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
        });
    }

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'robot',
        fields: {
            allowed: [
                'secret',
            ],
            default: [
                'id',
                'name',
                'display_name',
                'description',
                'active',
                'user_id',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        relations: {
            allowed: ['realm', 'user'],
        },
    });

    const entity = await query.getOne();
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isMe) {
        await permissionChecker.check({
            name: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
            input: { attributes: entity },
        });
    }

    return send(res, entity);
}
