/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    applyFields, applyFilters, applyPagination, applyRelations, applySort,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import {
    MASTER_REALM_ID, PermissionID,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotEntity } from '../../../../domains';

export async function getManyRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const {
        filter, fields, page, include, sort,
    } = req.query;

    const repository = getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot');

    applyFilters(query, filter, {
        allowed: ['id', 'name', 'realm_id', 'user_id'],
        defaultAlias: 'robot',
    });

    applyRelations(query, include, {
        allowed: ['realm', 'user'],
        defaultAlias: 'robot',
    });

    applySort(query, sort, {
        allowed: ['id', 'realm_id', 'user_id', 'updated_at', 'created_at'],
        defaultAlias: 'robot',
    });

    if (
        !req.ability.hasPermission(PermissionID.ROBOT_EDIT) &&
        !req.ability.hasPermission(PermissionID.ROBOT_DROP)
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
    });

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

    const repository = getRepository(RobotEntity);
    const query = repository.createQueryBuilder('robot')
        .where('robot.id = :id', { id });

    applyFields(query, fields, {
        defaultAlias: 'robot',
        allowed: [
            'secret',
        ],
    });

    applyRelations(query, include, {
        allowed: ['realm', 'user'],
        defaultAlias: 'robot',
    });

    const entity = await query.getOne();

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        req.robotId !== entity.id &&
        !req.ability.hasPermission(PermissionID.ROBOT_DROP) &&
        !req.ability.hasPermission(PermissionID.ROBOT_EDIT)
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
