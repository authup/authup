/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ConflictError } from '@ebec/http';
import type { EntityMetadata, EntityTarget } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import type { UniqueMetadata } from 'typeorm/metadata/UniqueMetadata';

export async function enforceUniquenessForDatabaseEntity<T = any>(
    clazz: EntityTarget<T>,
    data: Partial<T>,
) : Promise<void> {
    const dataSource = await useDataSource();
    if (
        dataSource.options.type !== 'sqlite' &&
        dataSource.options.type !== 'better-sqlite3'
    ) {
        return;
    }

    const index = dataSource.entityMetadatas.findIndex(
        (entityMetadata) => entityMetadata.target === clazz,
    );

    if (index === -1) {
        return;
    }

    const metadata: EntityMetadata = dataSource.entityMetadatas[index];
    const repository = dataSource.getRepository(metadata.target);

    let uniqueMetadata : UniqueMetadata;
    for (let i = 0; i < metadata.ownUniques.length; i++) {
        uniqueMetadata = metadata.ownUniques[i];

        const columnNames = uniqueMetadata.columns.map((column) => column.databaseName);
        const whereClause : Record<string, any> = {};
        for (let j = 0; j < columnNames.length; j++) {
            whereClause[columnNames[j]] = data[columnNames[j]];
        }

        const entity = await repository.findOneBy(whereClause);
        if (entity) {
            throw new ConflictError('An entry with some unique attributes already exist.');
        }
    }
}
