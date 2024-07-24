/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ConflictError } from '@ebec/http';
import type { EntityMetadata, EntityTarget, WhereExpressionBuilder } from 'typeorm';
import { Brackets } from 'typeorm';
import { useDataSource } from 'typeorm-extension';

function transformUndefinedToNull(input: unknown) {
    if (typeof input === 'undefined') {
        return null;
    }

    return input;
}

function buildWhereExpression(
    qb: WhereExpressionBuilder,
    data: Record<string, any>,
    type: 'source' | 'target',
) {
    const keys = Object.keys(data);

    let statements : string[];
    let bindingKey : string;
    let value : unknown;
    for (let j = 0; j < keys.length; j++) {
        value = transformUndefinedToNull(data[keys[j]]);

        statements = [
            `entity.${keys[j]}`,
        ];

        if (value === null) {
            statements.push('IS');
            if (type === 'source') {
                statements.push('NOT');
            }
            statements.push('NULL');

            if (j === 0) {
                qb.where(statements.join(' '));
            } else {
                qb.andWhere(statements.join(' '));
            }
        } else {
            if (type === 'target') {
                statements.push('=');
            } else {
                statements.push('!=');
            }

            bindingKey = `${type}_${keys[j]}`;
            statements.push(`:${bindingKey}`);

            if (j === 0) {
                qb.where(statements.join(' '), {
                    [bindingKey]: value,
                });
            } else {
                qb.andWhere(statements.join(' '), {
                    [bindingKey]: value,
                });
            }
        }
    }
}

function pickRecord(data: Record<string, any>, keys: string[]) {
    const output : Record<string, any> = {};
    for (let i = 0; i < keys.length; i++) {
        output[keys[i]] = data[keys[i]];
    }

    return output;
}

export async function enforceUniquenessForDatabaseEntity<T = any>(
    clazz: EntityTarget<T>,
    target: Partial<T>,
    source?: Partial<T>,
) : Promise<void> {
    const dataSource = await useDataSource();

    const index = dataSource.entityMetadatas.findIndex(
        (entityMetadata) => entityMetadata.target === clazz,
    );

    if (index === -1) {
        return;
    }

    const metadata: EntityMetadata = dataSource.entityMetadatas[index];
    const repository = dataSource.getRepository(metadata.target);

    const primaryColumnNames = metadata.primaryColumns.map((c) => c.propertyName);

    for (let i = 0; i < metadata.ownUniques.length; i++) {
        const uniqueColumnNames = metadata.ownUniques[i].columns.map((column) => column.propertyName);

        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder.where(new Brackets((qb) => {
            buildWhereExpression(qb, pickRecord(target, uniqueColumnNames), 'target');
        }));

        if (source) {
            queryBuilder.andWhere(new Brackets((qb) => {
                buildWhereExpression(qb, pickRecord(source, primaryColumnNames), 'source');
            }));
        }

        const entity = await queryBuilder.getOne();
        if (entity) {
            throw new ConflictError('An entry with some unique attributes already exist.');
        }
    }
}
