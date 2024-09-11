/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import {
    RoleAttributeEntity,
} from '../../../../domains';
import { buildPolicyDataForRequest, useRequestEnv, useRequestParamID } from '../../../request';

export async function getManyRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const hasOneOf = await permissionChecker.hasOneOf([
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ]);
    if (!hasOneOf) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const query = repository.createQueryBuilder('roleAttribute');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'roleAttribute',
        filters: {
            allowed: ['id', 'name', 'role_id', 'realm_id'],
        },
        sort: {
            allowed: ['id', 'name', 'role_id', 'realm_id', 'created_at', 'updated_at'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const queryOutput = await query.getManyAndCount();

    const [entities] = queryOutput;
    let [, total] = queryOutput;

    const data : RoleAttributeEntity[] = [];
    const policyEvaluationData = buildPolicyDataForRequest(req);

    for (let i = 0; i < entities.length; i++) {
        const canAbility = await permissionChecker.safeCheckOneOf(
            [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
            { ...policyEvaluationData, attributes: queryOutput[0][i] },
        );
        if (canAbility) {
            data.push(entities[i]);
        } else {
            total--;
        }
    }

    return send(res, {
        data,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOneRoleAttributeRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const hasOneOf = await permissionChecker.hasOneOf([
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ]);
    if (!hasOneOf) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const canAbility = await permissionChecker.safeCheckOneOf(
        [
            PermissionName.ROLE_READ,
            PermissionName.ROLE_UPDATE,
            PermissionName.ROLE_DELETE,
        ],
        buildPolicyDataForRequest(req, {
            attributes: entity,
        }),
    );

    if (!canAbility) {
        throw new ForbiddenError();
    }

    return send(res, entity);
}
