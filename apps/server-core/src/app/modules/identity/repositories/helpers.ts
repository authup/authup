/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import type { IRealmRepository } from '../../../../core/index.ts';

/**
 * A principal read: the realm joined, and the columns a plain read leaves
 * out (`select: false`) selected, since authentication needs them.
 */
export function buildIdentityQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
) : SelectQueryBuilder<T> {
    const query = repository.createQueryBuilder(alias)
        .leftJoinAndSelect(`${alias}.realm`, 'realm');

    for (const column of repository.metadata.columns) {
        if (!column.isSelect) {
            query.addSelect(`${alias}.${column.propertyName}`);
        }
    }

    return query;
}

/**
 * A principal by its canonical name. The realm key is resolved once (an
 * id first, then a name), so a realm id never reaches a realm NAMED like
 * it, and a key resolving to no realm matches nothing (fail closed).
 */
export async function findIdentityByName<T extends ObjectLiteral>(
    ctx: {
        repository: Repository<T>,
        alias: string,
        realmRepository: Pick<IRealmRepository, 'resolveId'>,
    },
    name: string,
    realmKey?: string,
) : Promise<T | null> {
    const query = buildIdentityQuery(ctx.repository, ctx.alias)
        .where(`${ctx.alias}.name = :name`, { name: name.trim().toLowerCase() });

    if (realmKey) {
        const realmId = await ctx.realmRepository.resolveId(realmKey);

        if (!realmId) {
            return null;
        }

        query.andWhere(`${ctx.alias}.realmId = :realmId`, { realmId });
    }

    return query.getOne();
}
