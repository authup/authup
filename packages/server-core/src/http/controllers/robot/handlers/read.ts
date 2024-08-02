/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import {
    OAuth2SubKind, isUUID,
} from '@authup/kit';
import {
    PermissionName, REALM_MASTER_NAME,
} from '@authup/core-kit';
import { RobotEntity, resolveRealm } from '../../../../domains';
import { isSelfId } from '../../../../utils';
import { resolveOAuth2SubAttributesForScope } from '../../../oauth2';
import { useRequestParamID } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function getManyRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.ROBOT_READ,
        PermissionName.ROBOT_UPDATE,
        PermissionName.ROBOT_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

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

    const env = useRequestEnv(req);

    if (!hasAbility) {
        if (env.userId) {
            query.andWhere('robot.user_id = :userId', { userId: env.userId });
        }

        if (env.robotId) {
            query.andWhere('robot.id = :id', { id: env.robotId });
        }
    }

    if (env.realm.name !== REALM_MASTER_NAME) {
        query.andWhere('robot.realm_id = :realmId', { realmId: env.realm.id });
    }

    const [entities, total] = await query.getManyAndCount();

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOneRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.ROBOT_READ,
        PermissionName.ROBOT_UPDATE,
        PermissionName.ROBOT_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot');

    if (
        isSelfId(id) &&
        useRequestEnv(req, 'robotId')
    ) {
        const attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.ROBOT, useRequestEnv(req, 'scopes'));
        for (let i = 0; i < attributes.length; i++) {
            query.addSelect(`robot.${attributes[i]}`);
        }

        query.where('robot.id = :id', { id });
    } else if (isUUID(id)) {
        query.where('robot.id = :id', { id });
    } else {
        query.where('robot.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('robot.realm_id = :realmId', { realmId: realm.id });
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

    const env = useRequestEnv(req);

    if (
        env.robotId !== entity.id &&
        !hasAbility
    ) {
        if (!entity.user_id) {
            throw new ForbiddenError();
        }

        if (
            entity.user_id &&
            entity.user_id !== env.userId
        ) {
            throw new ForbiddenError();
        }
    }

    return send(res, entity);
}
