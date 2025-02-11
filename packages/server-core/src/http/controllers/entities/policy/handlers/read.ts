/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import type { SelectQueryBuilder } from 'typeorm';
import { Brackets } from 'typeorm';
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import type { PolicyEntity } from '../../../../../database/domains';
import { PolicyRepository, resolveRealm } from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';

export async function getManyPolicyRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    let queryBuilder: SelectQueryBuilder<PolicyEntity>;
    const query = useRequestQuery(req);
    if (typeof query?.filter?.parent_id === 'string') {
        const parentIds = `${query?.filter?.parent_id}`.split(',');
        delete query?.filter?.parent_id;

        const closureTableAlias = 'policyRelation';
        const joinCondition = repository.metadata.closureJunctionTable.descendantColumns
            .map((column) => (
                `${closureTableAlias
                }.${
                    column.propertyPath
                } = policy.${
                    column.referencedColumn!.propertyPath}`
            ))
            .join(' AND ');

        queryBuilder = repository.createQueryBuilder('policy')
            .innerJoin(
                repository.metadata.closureJunctionTable.tableName,
                closureTableAlias,
                joinCondition,
            );

        const escapeStr = repository.manager.connection.driver.escape;

        const joinColumn = repository.metadata.treeParentRelation!.joinColumns[0];
        const parentPropertyName = joinColumn.givenDatabaseName || joinColumn.databaseName;

        queryBuilder.where(new Brackets((qb) => {
            for (let i = 0; i < parentIds.length; i++) {
                let statement : string;
                const parameters : Record<string, any> = {};
                if (parentIds[i] === 'null') {
                    statement = `${escapeStr('policy')}.${escapeStr(
                        parentPropertyName,
                    )} IS NULL`;
                } else if (parentIds[i] === '!null') {
                    statement = `${escapeStr('policy')}.${escapeStr(
                        parentPropertyName,
                    )} IS NOT NULL`;
                } else {
                    const ancestorColumn = repository.metadata.closureJunctionTable.ancestorColumns[0];
                    const descendantColumn = repository.metadata.closureJunctionTable.descendantColumns[0];
                    statement = [
                        `${closureTableAlias}.${ancestorColumn.propertyPath} = :ancestor${ancestorColumn.referencedColumn!.propertyName}`,
                        `${closureTableAlias}.${descendantColumn.propertyPath} != :ancestor${ancestorColumn.referencedColumn!.propertyName}`,
                    ].join(' AND ');

                    parameters[`ancestor${ancestorColumn.referencedColumn!.propertyName}`] = ancestorColumn.referencedColumn!.getEntityValue({ id: parentIds[i] });
                }

                if (i === 0) {
                    qb.where(statement, parameters);
                } else {
                    qb.orWhere(statement, parameters);
                }
            }
        }));
    } else {
        queryBuilder = repository.createQueryBuilder('policy');
    }

    const { pagination } = applyQuery(queryBuilder, query, {
        defaultAlias: 'policy',
        relations: {
            allowed: ['realm'],
        },
        fields: {
            default: [
                'id',
                'built_in',
                'type',
                'display_name',
                'name',
                'description',
                'invert',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['id', 'name', 'type', 'realm_id', 'realm.name'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const [entities, total] = await queryBuilder.getManyAndCount();
    await repository.extendManyWithEA(entities);

    await Promise.all(entities.map((entity) => repository.findDescendantsTree(entity)));

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOnePolicyRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    });

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    const query = repository.createQueryBuilder('policy');

    if (isUUID(id)) {
        query.where('policy.id = :id', { id });
    } else {
        query.where('policy.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('policy.realm_id = :realmId', { realmId: realm.id });
    }

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'policy',
        fields: {
            default: [
                'id',
                'built_in',
                'type',
                'name',
                'display_name',
                'description',
                'invert',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        relations: {
            allowed: ['realm'],
        },
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    await repository.extendOneWithEA(entity);
    await repository.findDescendantsTree(entity);

    return send(res, entity);
}
