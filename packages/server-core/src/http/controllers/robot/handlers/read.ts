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
    PermissionName,
} from '@authup/core-kit';
import { RobotEntity, resolveRealm } from '../../../../domains';
import { isSelfId } from '../../../../utils';
import { resolveOAuth2SubAttributesForScope } from '../../../oauth2';
import { buildPolicyEvaluationDataByRequest, useRequestEnv, useRequestParamID } from '../../../request';

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

    const queryOutput = await query.getManyAndCount();

    const requestRobot = useRequestEnv(req, 'robot');

    const data : RobotEntity[] = [];
    const policyEvaluationData = buildPolicyEvaluationDataByRequest(req);
    for (let i = 0; i < queryOutput[0].length; i++) {
        if (
            requestRobot &&
            requestRobot.id === queryOutput[0][i].id
        ) {
            data.push(queryOutput[0][i]);
            continue;
        }

        const hasAbility = await ability.safeCheckOneOf(
            [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
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

    const requestRobot = useRequestEnv(req, 'robot');
    const requestRealm = useRequestEnv(req, 'realm');

    let isMe = false;

    if (
        isSelfId(id) &&
        requestRobot
    ) {
        isMe = true;
        query.where('robot.id = :id', { id: requestRobot.id });
    } else if (isUUID(id)) {
        if (
            requestRobot &&
            id === requestRobot.id
        ) {
            isMe = true;
        }

        query.where('robot.id = :id', { id });
    } else {
        query.where('robot.name = :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('robot.realm_id = :realmId', { realmId: realm.id });

        if (
            requestRobot &&
            requestRealm &&
            id === requestRobot.name &&
            realm.id === requestRealm.id
        ) {
            isMe = true;
        }
    }

    const scopes = useRequestEnv(req, 'scopes');
    if (isMe) {
        const attributes: string[] = resolveOAuth2SubAttributesForScope(OAuth2SubKind.ROBOT, scopes);

        const validAttributes = repository.metadata.columns.map(
            (column) => column.databaseName,
        );
        for (let i = 0; i < attributes.length; i++) {
            const isValid = validAttributes.includes(attributes[i]);
            if (isValid) {
                query.addSelect(`robot.${attributes[i]}`);
            }
        }
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
        const hasAbility = await ability.checkOneOf(
            [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
            buildPolicyEvaluationDataByRequest(req, { attributes: entity }),
        );

        if (!hasAbility) {
            throw new ForbiddenError();
        }
    }

    return send(res, entity);
}
