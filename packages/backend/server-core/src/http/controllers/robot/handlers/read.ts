/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseQueryRelations } from 'rapiq';
import { Brackets } from 'typeorm';
import {
    applyFields, applyFilters, applyPagination, applyQueryRelationsParseOutput, applyRelations, applySort,
    useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import {
    MASTER_REALM_ID,
    OAuth2SubKind, PermissionID, isSelfId,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotEntity } from '../../../../domains';
import { resolveOAuth2SubAttributesForScope } from '../../../../oauth2/scope';

export async function getManyRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const {
        filter, fields, page, include, sort,
    } = req.query;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot');

    applyFilters(query, filter, {
        allowed: ['id', 'name', 'realm_id', 'user_id'],
        defaultAlias: 'robot',
    });

    const relations = parseQueryRelations(include, {
        allowed: ['realm', 'user'],
        defaultAlias: 'robot',
    });

    applySort(query, sort, {
        allowed: ['id', 'realm_id', 'user_id', 'updated_at', 'created_at'],
        defaultAlias: 'robot',
    });

    if (
        !req.ability.has(PermissionID.ROBOT_EDIT) &&
        !req.ability.has(PermissionID.ROBOT_DROP)
    ) {
        if (req.userId) {
            query.andWhere('robot.user_id = :userId', { userId: req.userId });
        }

        if (req.robotId) {
            query.andWhere('robot.id = :id', { id: req.robotId });
        }
    }

    if (req.realmId !== MASTER_REALM_ID) {
        query.andWhere('robot.realm_id = :realmId', { realmId: req.realmId });
    }

    applyFields(query, fields, {
        defaultAlias: 'robot',
        allowed: [
            'secret',
        ],
        default: [
            'id',
            'name',
            'description',
            'active',
            'user_id',
            'realm_id',
            'created_at',
            'updated_at',
        ],
    });

    applyQueryRelationsParseOutput(query, relations);

    const pagination = applyPagination(query, page, { maxLimit: 50 });

    const [entities, total] = await query.getManyAndCount();

    return res.respond({
        data: {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        },
    });
}

export async function getOneRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const { fields, include } = req.query;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot');

    if (
        isSelfId(id) &&
        req.robotId
    ) {
        const attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.ROBOT, req.scopes);
        for (let i = 0; i < attributes.length; i++) {
            query.addSelect(`robot.${attributes[i]}`);
        }

        query.where('robot.id = :id', { id });
    } else {
        query.where(new Brackets((q2) => {
            q2.where('robot.id = :id', { id });
            q2.orWhere('robot.name LIKE :name', { name: id });
        }));
    }

    applyFields(query, fields, {
        defaultAlias: 'robot',
        allowed: [
            'secret',
        ],
        default: [
            'id',
            'name',
            'description',
            'active',
            'user_id',
            'realm_id',
            'created_at',
            'updated_at',
        ],
    });

    applyRelations(query, include, {
        allowed: ['realm', 'user'],
        defaultAlias: 'robot',
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if (
        req.robotId !== entity.id &&
        !req.ability.has(PermissionID.ROBOT_DROP) &&
        !req.ability.has(PermissionID.ROBOT_EDIT)
    ) {
        if (
            !entity.user_id
        ) {
            throw new ForbiddenError();
        }

        if (
            entity.user_id &&
            entity.user_id !== req.userId
        ) {
            throw new ForbiddenError();
        }
    }

    return res.respond({ data: entity });
}
